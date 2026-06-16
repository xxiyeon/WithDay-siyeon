import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelParticipation,
  createParticipation,
  deleteParticipation,
  fetchHostingSchedules,
  fetchParticipatingSchedules,
  fetchPendingSchedules,
  fetchScheduleApplicants,
  updateParticipationStatus,
} from "../api";
import {
  normalizeMyScheduleList,
  normalizeScheduleApplicantsResponse,
} from "./mapper";

/*
 * participation feature에서 react-query를 쓰는 이유는 "조회 결과 캐싱"과 "쓰기 후 자동 재조회"를 분리하기 위해서다.
 * 참여 기능은 같은 데이터를 여러 화면이 공유한다.
 *
 * 예:
 * - MySchedulePage는 내 일정 목록을 사용
 * - ScheduleDetail은 신청자 목록과 현재 사용자의 참여 상태를 사용
 * - 호스트 액션 이후에는 여러 화면이 동시에 최신 상태가 되어야 함
 *
 * 이런 경우 서버 응답을 local state로 각각 관리하면 동기화가 어렵기 때문에,
 * query key를 기준으로 데이터를 캐싱하고 invalidate로 갱신하는 방식이 더 안전하다.
 */

/*
 * 참여 기능에서 사용하는 react-query key 모음이다.
 * 같은 데이터를 여러 화면에서 공유하므로 key를 한 곳에서 만들면 캐시 무효화 범위를 일관되게 유지할 수 있다.
 */
export const participationQueryKeys = {
  /*
   * feature 전체를 넓게 지칭하는 최상위 key다.
   * "participation 관련 모든 query"를 폭넓게 invalidate하고 싶을 때 기준점으로 사용된다.
   */
  all: ["participation"],
  /*
   * 사용자별 내 일정 캐시 key다.
   * email을 key에 넣는 이유는 서로 다른 사용자의 참여 데이터가 같은 캐시에 섞이면 안 되기 때문이다.
   * guest fallback은 로그인 전 일시 상태에서도 key shape를 안정적으로 유지하기 위한 값이다.
   */
  mySchedules: (email) => [
    "participation",
    "my-schedules",
    email?.trim() || "guest",
  ],
  /*
   * 현재 UI는 탭별 query를 사용하므로 tab까지 key에 포함한다.
   * 이렇게 해야 참여중 탭의 APPROVED/KICKED 결과와 신청중 탭의 PENDING 결과가 서로 덮어쓰이지 않는다.
   */
  mySchedulesByTab: (email, tab) => [
    "participation",
    "my-schedules",
    email?.trim() || "guest",
    tab?.trim() || "participating",
  ],
  /*
   * 신청자 목록 전체 prefix다.
   * 특정 schedule, 특정 호스트 email 조합 아래의 모든 상태 필터(PENDING/APPROVED/...) 캐시를 한 번에 무효화할 때 사용한다.
   */
  scheduleApplicantsPrefix: (scheduleId, email) => [
    "participation",
    "schedule-applicants",
    String(scheduleId ?? "guest"),
    email?.trim() || "guest",
  ],
  /*
   * 실제 신청자 목록 조회 key다.
   * status까지 key에 포함해야 "대기 신청자 목록"과 "승인 신청자 목록"이 서로 다른 캐시 엔트리로 분리된다.
   */
  scheduleApplicants: (scheduleId, email, status) => [
    "participation",
    "schedule-applicants",
    String(scheduleId ?? "guest"),
    email?.trim() || "guest",
    status?.trim() || "all",
  ],
};

/*
 * 내 일정 페이지 전용 조회 hook이다.
 * 호출 시점:
 * - MySchedulePage에서 로그인 사용자의 email을 확보한 뒤 호출
 *
 * 이 hook이 하는 일:
 * 1. fetchMySchedules로 세 탭 데이터를 한 번에 조회
 * 2. react-query 캐시에 사용자별로 저장
 * 3. select 단계에서 API 원본 응답을 카드 렌더링용 모델로 정규화
 *
 * select를 hook 안에 두는 이유는,
 * 화면 컴포넌트가 매번 field 변환 로직을 반복하지 않게 하기 위해서다.
 * 즉 UI는 "이미 렌더링 가능한 데이터"만 받도록 계층을 분리한다.
 */
const MY_SCHEDULE_TAB_FETCHERS = {
  participating: fetchParticipatingSchedules,
  pending: fetchPendingSchedules,
  hosting: fetchHostingSchedules,
};

const resolveMyScheduleTabFetcher = (tab) => {
  /*
   * 알 수 없는 tab 값이 들어오면 참여중 탭으로 되돌린다.
   * 잘못된 탭 문자열 때문에 queryFn이 undefined가 되어 렌더가 깨지는 것보다 안전한 기본 탭을 보여주는 편이 낫다.
   */
  return MY_SCHEDULE_TAB_FETCHERS[tab] ?? MY_SCHEDULE_TAB_FETCHERS.participating;
};

const filterMySchedulesByRole = (items, tab) => {
  const list = Array.isArray(items) ? items : [];

  if (tab === "hosting") {
    return list.filter((item) => item.myRole === "host");
  }

  return list.filter((item) => item.myRole !== "host");
};

/*
 * 현재 탭 하나만 조회하는 내 일정 query hook이다.
 * 탭을 query key에 포함시켜 참여중/신청중/호스팅 캐시가 서로 섞이지 않게 분리한다.
 */
export const useMySchedulesQuery = (email, activeTab = "participating") => {
  const normalizedEmail = email?.trim() ?? "";
  const normalizedTab = activeTab?.trim() || "participating";
  /*
   * queryFn 선택을 렌더 전에 확정해두면 useQuery 내부에서는 "현재 탭에 맞는 fetcher"만 실행한다.
   * enabled가 email 준비 여부를 막아주므로 로그인 초기화 전 빈 email 요청은 발생하지 않는다.
   */
  const queryFn = resolveMyScheduleTabFetcher(normalizedTab);

  return useQuery({
    queryKey: participationQueryKeys.mySchedulesByTab(
      normalizedEmail,
      normalizedTab,
    ),
    queryFn: () => queryFn({ email: normalizedEmail }),
    enabled: Boolean(normalizedEmail),
    select: (items) =>
      filterMySchedulesByRole(normalizeMyScheduleList(items), normalizedTab),
    staleTime: 1000 * 60,
  });
};

/*
 * 내 일정 화면에서 발생하는 사용자 액션들을 묶어 제공하는 mutation hook이다.
 * 이 hook이 필요한 이유는, 같은 페이지 안에서 생성/상태 변경/취소/삭제가 모두 "내 일정 목록 갱신"이라는 후속 작업을 공유하기 때문이다.
 *
 * 호출 시점:
 * - MySchedulePage에서 버튼 액션 핸들러를 만들 때 사용
 *
 * 상태 관리 방식:
 * - 각 mutation은 react-query가 개별 pending/success/error 상태를 관리
 * - 페이지에서는 여러 mutation의 isPending을 OR로 묶어 "현재 어떤 쓰기 요청이든 진행 중인가"만 간단히 사용
 */
export const useParticipationMutation = (email) => {
  const queryClient = useQueryClient();
  const mySchedulesQueryKey = participationQueryKeys.mySchedules(email);
  const myScheduleTabKeys = [
    participationQueryKeys.mySchedulesByTab(email, "participating"),
    participationQueryKeys.mySchedulesByTab(email, "pending"),
    participationQueryKeys.mySchedulesByTab(email, "hosting"),
  ];

  const invalidateMySchedules = async () => {
    /*
     * invalidateQueries를 직접 감싼 이유는 네 개의 mutation이 모두 같은 후처리를 공유하기 때문이다.
     * 이런 공통 처리를 함수로 빼 두면 성공 후 갱신 정책을 바꿀 때 한 곳만 수정하면 된다.
     *
     * 무효화 이후의 실제 흐름:
     * - 캐시가 stale 처리됨
     * - 화면이 해당 query를 사용 중이면 react-query가 재요청
     * - 서버 최신 상태가 다시 내려오고 리스트가 갱신됨
     *
     * email이 없을 때는 캐시 key가 사용자별로 확정되지 않으므로 무효화하지 않는다.
     * 로그인 후 다시 hook이 활성화되면서 올바른 사용자 key로 조회된다.
     */
    if (!email?.trim()) {
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: mySchedulesQueryKey,
    });
  };

  const removeParticipationFromMySchedulesCache = (participationId) => {
    /*
     * 취소는 사용자가 방금 누른 카드가 즉시 사라지는 느낌이 중요하다.
     * 먼저 탭별 캐시에서 해당 participationId를 제거하고, 실패하면 onError에서 snapshot으로 복구한다.
     */
    if (!email?.trim() || !participationId) {
      return [];
    }

    return myScheduleTabKeys.map((queryKey) => {
      const previous = queryClient.getQueryData(queryKey);
      if (!previous) {
        return { queryKey, previous };
      }

      queryClient.setQueryData(queryKey, (current = []) =>
        current.filter((item) => item.participationId !== participationId),
      );

      return { queryKey, previous };
    });
  };

  /*
   * 참여 생성 mutation이다.
   * 현재 MySchedulePage에서는 직접 쓰이지 않더라도,
   * participation feature 단위로 "생성/수정/취소/삭제"를 한 hook에서 제공해 재사용성을 유지한다.
   */
  const createMutation = useMutation({
    mutationFn: createParticipation,
    onSuccess: invalidateMySchedules,
  });

  /*
   * action 기반 공통 상태 변경 mutation이다.
   * cancel/delete 전용 wrapper가 있어도 이 mutation을 함께 두는 이유는,
   * 페이지가 action 문자열 기준으로 단일 진입점을 쓰고 싶을 때를 대비한 feature API이기 때문이다.
   */
  const updateStatusMutation = useMutation({
    mutationFn: updateParticipationStatus,
    onSuccess: invalidateMySchedules,
  });

  /*
   * 본인 참여 취소 mutation이다.
   * 성공 후에는 pending/participating 탭 구성이 바뀔 수 있으므로 전체 mySchedules를 무효화한다.
   */
  const cancelMutation = useMutation({
    mutationFn: cancelParticipation,
    onMutate: async (variables) => {
      await Promise.all(
        myScheduleTabKeys.map((queryKey) =>
          queryClient.cancelQueries({
            queryKey,
          }),
        ),
      );

      const previousMySchedules = removeParticipationFromMySchedulesCache(
        variables?.participationId,
      );

      return { previousMySchedules };
    },
    onError: (_error, _variables, context) => {
      context?.previousMySchedules?.forEach(({ queryKey, previous }) => {
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
      });
    },
    onSuccess: invalidateMySchedules,
  });

  /*
   * 종료된 참여 내역 삭제 mutation이다.
   * 삭제 대상이 리스트에서 사라져야 하므로, 성공 직후 목록 재조회가 반드시 필요하다.
   */
  const deleteMutation = useMutation({
    mutationFn: deleteParticipation,
    onSuccess: invalidateMySchedules,
  });

  return {
    createParticipation: createMutation.mutateAsync,
    updateParticipationStatus: updateStatusMutation.mutateAsync,
    cancelParticipation: cancelMutation.mutateAsync,
    deleteParticipation: deleteMutation.mutateAsync,
    isPending:
      createMutation.isPending ||
      updateStatusMutation.isPending ||
      cancelMutation.isPending ||
      deleteMutation.isPending,
  };
};

/*
 * 일정 상세 페이지에서 호스트만 신청자 목록을 조회할 수 있도록 만든 query hook이다.
 * 호출 시점:
 * - ScheduleDetail이 상세 응답에서 viewerIsHost를 확인한 후
 *
 * 중요한 점:
 * - enabled를 외부에서 받아 호스트가 아닐 때는 아예 요청을 막는다.
 * - status를 query key에 포함해 탭 전환 시 캐시가 분리된다.
 * - select 단계에서 raw applicant row를 HostParticipationCard가 바로 사용할 수 있는 shape로 바꾼다.
 * 일정 상세 페이지의 호스트 신청자 목록 조회 hook이다.
 * enabled를 외부에서 받을 수 있게 한 이유는, 상세 응답을 통해 viewerIsHost가 확인된 뒤에만 신청자 목록을 요청하기 위해서다.
 * retry=false는 권한 없음(403) 같은 의도된 실패를 반복 요청하지 않게 하기 위한 설정이다.
 */
export const useScheduleApplicantsQuery = ({
  scheduleId,
  email,
  status,
  enabled,
}) =>
  useQuery({
    queryKey: participationQueryKeys.scheduleApplicants(scheduleId, email, status),
    queryFn: () =>
      fetchScheduleApplicants({
        scheduleId,
        email,
        status,
      }),
    enabled: enabled ?? Boolean(scheduleId && email),
    select: normalizeScheduleApplicantsResponse,
    staleTime: 1000 * 30,
    retry: false,
  });
