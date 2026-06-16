import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  applySchedule,
  cancelParticipation,
  updateParticipationStatusByHost,
} from "../api";
import { participationQueryKeys } from "./queries";

/*
 * 이 파일은 "쓰기 요청 이후 어떤 캐시를 다시 읽어야 하는가"를 정의하는 레이어다.
 * API 함수는 단순 HTTP 호출만 알고,
 * UI는 성공/실패 메시지와 버튼 상호작용만 알고,
 * mutation hook은 그 사이에서 캐시 갱신 전략을 담당한다.
 */

/*
 * 일정 상세 페이지의 참여 신청 mutation이다.
 * 호출 시점:
 * - ScheduleDetail의 참여 CTA에서 사용자가 "참여 신청하기" 클릭
 *
 * 성공 후 invalidate가 필요한 이유:
 * - schedule-detail: 상세 화면의 viewerParticipationStatus가 즉시 PENDING으로 바뀌어야 함
 * - participation 전체 캐시: 내 일정 탭에도 새 신청 row가 보여야 함
 *
 * 즉 "한 화면에서 신청했는데 다른 화면은 예전 상태로 남는 문제"를 막기 위한 hook이다.
 */
export const useApplyScheduleMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: applySchedule,
    onSuccess: async (_data, variables) => {
      /*
       * mutation 성공만으로는 화면이 자동으로 바뀌지 않는다.
       * react-query 캐시가 아직 이전 데이터를 들고 있기 때문에,
       * 영향을 받는 query key를 명시적으로 invalidate해야 다음 렌더에서 최신 서버 상태가 반영된다.
       *
       * 신청 성공 후에는 두 종류의 데이터를 다시 읽어야 한다.
       * 1. schedule-detail: viewerParticipationStatus가 PENDING으로 바뀌어 버튼 라벨이 "신청 완료"가 된다.
       * 2. participation: 내 일정 탭에도 새 신청 내역이 보여야 한다.
       */
      await Promise.all([
        queryClient.invalidateQueries({
          /*
           * 상세 query key에는 email이 붙는 버전도 있지만,
           * 여기서는 scheduleId prefix를 무효화해 해당 일정 상세 변형 캐시를 폭넓게 stale 처리한다.
           */
          queryKey: ["schedule-detail", Number(variables.scheduleId)],
        }),
        queryClient.invalidateQueries({
          queryKey: participationQueryKeys.all,
        }),
      ]);
    },
  });

  return {
    applySchedule: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

/*
 * 일정 상세 화면에서 사용자가 자신의 참여를 취소할 때 쓰는 mutation이다.
 * 성공 후에는 상세 화면의 viewerParticipationStatus와 내 일정 목록이 모두 바뀌므로 두 캐시를 함께 무효화한다.
 */
export const useCancelParticipationMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: cancelParticipation,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          /*
           * 취소 후 상세 버튼은 "다시 신청" 또는 취소된 상태 안내로 바뀔 수 있다.
           * 상세 응답의 viewerParticipationStatus를 다시 받아와야 참여 CTA의 라벨과 액션 가능 여부가 맞는다.
           */
          queryKey: ["schedule-detail", Number(variables.scheduleId)],
        }),
        queryClient.invalidateQueries({
          queryKey: participationQueryKeys.all,
        }),
      ]);
    },
  });

  return {
    cancelParticipation: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};

/*
 * 호스트의 신청자 상태 변경 mutation이다.
 * 호출 시점:
 * - ScheduleDetail -> HostParticipationList -> HostParticipationCard -> ParticipationStatusActions
 * - 버튼 클릭 후 handleApplicantAction이 이 mutation을 실행
 *
 * 성공 후 invalidate 범위가 넓은 이유:
 * - 신청자 목록: 해당 유저가 다른 상태 탭으로 이동하거나 목록에서 사라짐
 * - 내 일정 목록: 신청자 본인 화면에 상태가 반영되어야 함
 * - schedule-detail: 인원 수, 모집 마감 상태, 채팅 권한 등이 달라질 수 있음
 */
export const useUpdateParticipationStatusMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updateParticipationStatusByHost,
    onSuccess: async (_data, variables) => {
      /*
       * 여기서 prefix key를 무효화하는 이유는,
       * 예를 들어 PENDING에서 APPROVED로 바뀐 신청자가 한 상태 탭에서 다른 상태 탭으로 이동하기 때문이다.
       * 단일 status key만 갱신하면 다른 필터 탭에는 이전 데이터가 남을 수 있다.
       *
       * 승인 처리 후에는 currentParticipants가 바뀌고, 정원이 찼다면 일정 상태가 closed가 될 수 있다.
       * 그래서 신청자 목록만 갱신하면 부족하고 schedule-detail과 내 일정 캐시까지 함께 갱신한다.
       */
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: participationQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: participationQueryKeys.scheduleApplicantsPrefix(
            variables.scheduleId,
            variables.email
          ),
        }),
        queryClient.invalidateQueries({
          queryKey: participationQueryKeys.mySchedules(variables.email),
        }),
        queryClient.invalidateQueries({
          queryKey: ["schedule-detail", Number(variables.scheduleId)],
        }),
      ]);
    },
  });

  return {
    updateParticipationStatus: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
};
