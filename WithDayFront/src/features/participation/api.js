import { api } from "../../shared/lib/api";
import { PARTICIPATION_TAB_STATUS_PARAMS } from "./model/constants";

/*
 * participation feature의 네트워크 진입점이다.
 * 이 파일은 "어떤 URL로 어떤 payload를 보내는지"만 책임지고,
 * 응답을 화면용으로 바꾸는 일은 model/mapper.js, 캐시 제어는 react-query hook 쪽에서 담당한다.
 *
 * 전체 흐름은 보통 아래 순서로 이어진다.
 * 1. UI 버튼 클릭
 * 2. page 또는 hook에서 이 파일의 함수를 호출
 * 3. axios 인스턴스(api)가 백엔드 endpoint 요청
 * 4. 서버가 participation 상태를 변경하거나 목록을 조회
 * 5. 상위 mutation/query hook이 캐시 무효화 또는 데이터 select를 수행
 * 6. 화면이 최신 상태로 다시 렌더링
 */
const normalizeEmailParam = (email) => {
  /*
   * email은 서버에서 사용자 식별과 호스트 권한 검증에 쓰이는 값이다.
   * 공백이 섞이면 같은 사용자도 다른 query param처럼 보일 수 있으므로 요청 직전에 항상 trim한다.
   */
  return email?.trim() ?? "";
};

/*
 * 개발 중에는 "어떤 상태 필터로 어떤 데이터가 왔는지"를 보는 일이 잦다.
 * 내 일정 API 응답은 탭별로 여러 번 호출되므로 개발 환경에서만 응답을 확인한다.
 * 운영 환경에서는 콘솔 노이즈와 개인정보 노출 위험을 줄이기 위해 출력하지 않는다.
 */
const debugMyScheduleResponse = (label, data) => {
  if (!import.meta.env.DEV) {
    return;
  }

  console.debug(`[my-schedule] ${label}`, data);
};

/*
 * 사용자가 "내 일정" 페이지에 들어왔을 때 참여중/신청중 탭을 채우기 위한 목록 조회 API다.
 * 요청:
 * - GET /participations/me
 * - query params: { email, statuses }
 *
 * statuses는 "APPROVED,KICKED" 같은 콤마 문자열이며,
 * 백엔드는 이를 참여 상태 필터 목록으로 해석해 해당 상태에 속한 일정만 내려준다.
 *
 * 응답은 schedule 카드에 필요한 원본 필드 배열이며,
 * 이 단계에서는 아직 화면 전용 포맷으로 바꾸지 않고 그대로 반환한다.
 * 이후 useMySchedulesQuery -> normalizeMyScheduleList에서 UI 모델로 변환한다.
 */
export const fetchParticipationList = async ({ email, statuses }) => {
  const normalizedEmail = normalizeEmailParam(email);
  const { data } = await api.get("/participations/me", {
    params: {
      email: normalizedEmail,
      statuses,
    },
  });

  debugMyScheduleResponse(`participations ${statuses}`, data);

  return data;
};

/*
 * "참여중" 탭 전용 조회 helper다.
 * 탭별 query가 서로 다른 cache entry를 갖도록, status 조합도 함수 레벨에서 고정한다.
 */
export const fetchParticipatingSchedules = ({ email }) =>
  fetchParticipationList({
    email,
    statuses: PARTICIPATION_TAB_STATUS_PARAMS.participating,
  });

/*
 * "신청중" 탭 전용 조회 helper다.
 * MySchedulePage는 activeTab에 따라 이 함수를 선택해 호출한다.
 */
export const fetchPendingSchedules = ({ email }) =>
  fetchParticipationList({
    email,
    statuses: PARTICIPATION_TAB_STATUS_PARAMS.pending,
  });

/*
 * "내가 만든 일정" 탭은 participation 테이블이 아니라 schedule의 host 기준으로 조회한다.
 * 그래서 같은 내 일정 페이지 안에서도 참여 목록 API와는 다른 endpoint를 호출해야 한다.
 *
 * 요청:
 * - GET /participations/me/hosting
 * - query params: { email }
 *
 * 응답 row에는 participationId가 없을 수 있으며,
 * 상위 화면은 이를 보고 "참여 취소"가 아니라 "상세/관리 이동" 흐름으로 분기한다.
 */
export const fetchHostingSchedules = async ({ email }) => {
  const normalizedEmail = normalizeEmailParam(email);
  const { data } = await api.get("/participations/me/hosting", {
    params: { email: normalizedEmail },
  });

  debugMyScheduleResponse("hosting", data);

  return data;
};

/*
 * 내 일정 페이지는 하나의 화면에서 세 탭을 모두 빠르게 준비해야 한다.
 * 따라서 탭을 누를 때마다 네트워크를 새로 열기보다,
 * 첫 로드 시 "참여중 / 신청중 / 내가 만든 일정" 데이터를 병렬로 한 번에 받아온다.
 *
 * 반환 구조:
 * {
 *   participating: [...],
 *   pending: [...],
 *   hosting: [...]
 * }
 *
 * 이 구조는 과거 전체 탭 동시 조회 방식에서 쓰던 계약이며, 현재 화면은 탭별 query를 주로 사용한다.
 * 함수 자체는 다른 화면 재사용 가능성을 위해 유지하되, 각 배열은 mapper에서 카드용 shape로 정리한다.
 */
export const fetchMySchedules = async ({ email }) => {
  const [participating, pending, hosting] = await Promise.all([
    fetchParticipatingSchedules({ email }),
    fetchPendingSchedules({ email }),
    fetchHostingSchedules({ email }),
  ]);

  return {
    participating,
    pending,
    hosting,
  };
};

/*
 * 일정 상세 화면의 "참여 신청하기" 버튼이 누를 때 호출되는 API다.
 * 요청 body는 { email, scheduleId } 형태이며,
 * 서버는 이 정보를 기준으로 중복 신청, 모집 마감, 정원 초과, 자기 일정 신청 여부를 검증한다.
 *
 * 서버 저장 흐름:
 * - participation row 생성
 * - status를 PENDING으로 저장
 * - 성공 시 새 participation 정보와 상태를 응답
 *
 * 프런트는 성공 응답의 상세 필드 자체보다,
 * 이후 캐시 무효화를 통해 viewerParticipationStatus와 내 일정 목록이 갱신되는 효과를 더 중요하게 사용한다.
 */
export const applySchedule = async ({ email, scheduleId }) => {
  const { data } = await api.post("/participations", {
    email,
    scheduleId,
  });

  return data;
};

export const createParticipation = applySchedule;

/*
 * 호스트가 일정 상세 페이지에서 신청자 관리 영역을 열었을 때 사용하는 조회 API다.
 * 요청:
 * - GET /participations/schedules/{scheduleId}/applicants
 * - query params: { email, status }
 *
 * 여기서 email은 "누가 요청했는지"를 서버가 확인하는 용도다.
 * 즉 단순 조회처럼 보여도 서버는 이 email 사용자가 정말 호스트인지 검사한다.
 *
 * 응답은 신청자 목록 원본 배열이며,
 * 각 row에는 email/nickname/status/createdAt와 호스트 전용 개인정보(phone/gender/fullAge)가 들어갈 수 있다.
 * 이 함수는 ScheduleDetail의 viewerIsHost 조건 아래에서만 호출되어야 하며, 서버도 같은 권한을 다시 검증한다.
 */
export const fetchScheduleApplicants = async ({
  scheduleId,
  email,
  status = "PENDING",
}) => {
  const { data } = await api.get(
    `/participations/schedules/${scheduleId}/applicants`,
    {
      params: {
        email,
        status,
      },
    }
  );

  return data;
};

/*
 * 호스트가 신청자의 상태를 바꾸는 단일 write API다.
 * 요청:
 * - PATCH /participations/{participationId}/status
 * - body: { email, status, reason }
 *
 * status는 현재 프런트 기준으로 아래 세 가지 중 하나다.
 * - APPROVED: 신청 승인
 * - REJECTED: 신청 거절
 * - KICKED: 이미 승인된 참여자를 강제로 제외
 *
 * reason은 현재 UI에서 실제로 입력받지는 않지만,
 * API shape를 미리 열어 두어 추후 운영 사유 저장 기능을 붙이기 쉽게 해 둔 상태다.
 */
export const updateParticipationStatusByHost = async ({
  participationId,
  email,
  status,
  reason = "",
}) => {
  const { data } = await api.patch(
    `/participations/${participationId}/status`,
    {
      email,
      status,
      reason,
    }
  );

  return data;
};

/*
 * 사용자가 "내 일정" 화면에서 자신의 참여 내역에 수행하는 action을 공통 진입점으로 모아둔 함수다.
 * 이 함수는 action 문자열에 따라 실제 endpoint를 분기한다.
 *
 * 분리 이유:
 * - 페이지 쪽에서는 "이 버튼이 취소인가 삭제인가"만 판단하면 된다.
 * - 실제 HTTP method/PATCH/DELETE 차이는 이 파일에서 감춘다.
 *
 * action별 의미:
 * - cancel: 사용자가 본인 참여를 취소 -> 서버 status를 CANCELED로 변경
 * - delete: 종료된 내역(REJECTED/KICKED)을 화면/DB에서 제거
 */
export const updateParticipationStatus = async ({
  participationId,
  email,
  action,
}) => {
  if (action === "cancel") {
    const { data } = await api.patch(
      `/participations/${participationId}/cancel`,
      null,
      {
        params: { email },
      }
    );
    return data;
  }

  if (action === "delete") {
    const { data } = await api.delete(`/participations/${participationId}`, {
      params: { email },
    });
    return data;
  }

  throw new Error("지원하지 않는 참여 상태 변경입니다.");
};

/*
 * 의미가 가장 자주 쓰이는 사용자 액션 이름을 별도 함수로 노출한다.
 * UI에서는 "cancelParticipation"이라는 도메인 언어만 알면 되고,
 * 내부적으로 어떤 endpoint를 타는지는 updateParticipationStatus가 숨긴다.
 */
export const cancelParticipation = async ({ participationId, email }) => {
  return updateParticipationStatus({
    participationId,
    email,
    action: "cancel",
  });
};

/*
 * 거절되었거나 강퇴된 내역을 삭제할 때 사용하는 얇은 wrapper다.
 * 취소와 마찬가지로 페이지에서는 deleteParticipation만 호출하고,
 * 실제 HTTP DELETE 호출은 공통 함수가 담당한다.
 */
export const deleteParticipation = async ({ participationId, email }) => {
  return updateParticipationStatus({
    participationId,
    email,
    action: "delete",
  });
};
