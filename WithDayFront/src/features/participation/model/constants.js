/*
 * participation feature 전용 상수 모음이다.
 * 이 파일은 "문자열과 상태 정의를 한 곳으로 모아 중복을 줄이는 것"이 목적이다.
 *
 * 이유:
 * - 상태 문자열을 여러 컴포넌트에서 하드코딩하면 오타가 나기 쉽다.
 * - 같은 상태라도 페이지/카드/필터/버튼에서 모두 같은 의미로 읽혀야 한다.
 * - 배지 문구와 액션 종류를 한 파일에 모으면 UI 분기 로직이 단순해진다.
 */

/*
 * 서버 category code를 카드에 보여줄 한글 라벨로 변환할 때 사용하는 사전이다.
 * mapper가 이 상수를 사용해 API 응답을 사람이 읽기 쉬운 값으로 바꾼다.
 */
export const PARTICIPATION_CATEGORY_LABELS = {
  travel: "여행",
  popup: "팝업",
  food: "식사",
  activity: "액티비티",
  culture: "문화",
  etc: "기타",
};

/*
 * feature에서 공통으로 참조하는 참여 상태 표준값이다.
 * 백엔드 enum과 프런트 비교 로직이 같은 이름을 쓰도록 맞춰 둔 값이다.
 */
export const PARTICIPATION_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELED: "CANCELED",
  KICKED: "KICKED",
};

/*
 * 호스트 신청자 관리 영역의 상태 필터 버튼 정의다.
 * 이 값은 단순 UI 문구가 아니라,
 * 클릭 시 useScheduleApplicantsQuery의 status 파라미터로 그대로 전달되는 값이기도 하다.
 *
 * 순서는 운영 흐름 기준이다.
 * 호스트는 먼저 승인된 참여자 규모를 확인하고, 그다음 새 신청(PENDING), 취소/강퇴/거절 같은 이력 상태를 확인한다.
 */
export const HOST_APPLICANT_STATUS_FILTERS = [
  { value: "APPROVED", label: "승인 참여자" },
  { value: "PENDING", label: "신청 사용자" },
  { value: "CANCELED", label: "취소" },
  { value: "KICKED", label: "강퇴" },
  { value: "REJECTED", label: "거절" },
];

/*
 * MySchedulePage의 상단 탭 정의다.
 * 실제 탭별 데이터 배열은 fetchMySchedules 응답 구조와 연결된다.
 */
export const PARTICIPATION_TABS = [
  { value: "participating", label: "참여중" },
  { value: "pending", label: "신청중" },
  { value: "hosting", label: "호스팅" },
];

/*
 * 각 탭이 어떤 participation status를 보여줘야 하는지 정의한 매핑이다.
 * 예를 들어 "참여중"은 단순 APPROVED만이 아니라,
 * 과거에 참여했다가 호스트에게 내보내진 KICKED 내역도 같은 큰 맥락에서 함께 보여준다.
 *
 * 이 값은 fetchParticipationList의 statuses query param으로 그대로 전달된다.
 * 백엔드가 콤마 문자열을 List<ParticipationStatus>로 해석하므로 프론트에서 배열로 임의 변경하면 API 계약이 깨진다.
 */
export const PARTICIPATION_TAB_STATUS_PARAMS = {
  participating: "APPROVED,KICKED",
  pending: "PENDING",
};

/*
 * 상태별 배지/버튼 메타 정의다.
 * ParticipationCard, HostParticipationCard 같은 UI가 상태 분기 로직을 직접 품지 않도록,
 * "상태 -> 표시 방식" 매핑을 데이터로 선언한 구조다.
 *
 * 각 필드 의미:
 * - badgeText: 카드에 보이는 상태 문구
 * - badgeClass: CSS 배지 스타일 키
 * - buttonText: 액션 버튼 문구
 * - actionType: 상위 페이지가 이 버튼을 어떤 도메인 액션으로 해석할지 구분
 * - cardDisabled: 종료 상태처럼 시각적으로 비활성 느낌을 줄지 여부
 * - isDisabled: 버튼 자체를 실제 disabled 처리할지 여부
 */
export const PARTICIPATION_STATUS_META = {
  host: {
    badgeText: "호스트",
    badgeClass: "badgeHost",
    buttonText: "일정 관리",
    buttonVariant: "accent",
    actionType: "manage",
    cardDisabled: false,
    isDisabled: false,
  },
  PENDING: {
    badgeText: "신청중",
    badgeClass: "badgePending",
    buttonText: "상세보기",
    buttonVariant: "accent",
    actionType: "view",
    cardDisabled: false,
    isDisabled: false,
  },
  APPROVED: {
    badgeText: "참여 확정",
    badgeClass: "badgeApproved",
    buttonText: "상세보기",
    buttonVariant: "accent",
    actionType: "view",
    cardDisabled: false,
    isDisabled: false,
  },
  REJECTED: {
    badgeText: "거절됨",
    badgeClass: "badgeError",
    buttonText: "삭제",
    buttonVariant: "accent",
    actionType: "delete",
    cardDisabled: true,
    isDisabled: false,
  },
  CANCELED: {
    badgeText: "취소됨",
    badgeClass: "badgeGray",
    buttonText: "상세보기",
    buttonVariant: "outline",
    actionType: "view",
    cardDisabled: true,
    isDisabled: false,
  },
  KICKED: {
    badgeText: "내보내짐",
    badgeClass: "badgeError",
    buttonText: "삭제",
    buttonVariant: "accent",
    actionType: "delete",
    cardDisabled: true,
    isDisabled: false,
  },
  default: {
    badgeText: "상태 없음",
    badgeClass: "badgeGray",
    buttonText: "-",
    buttonVariant: "outline",
    actionType: "disabled",
    cardDisabled: true,
    isDisabled: true,
  },
};

/*
 * 카드 렌더링 시 최종 메타를 선택하는 helper다.
 * host는 참여 상태보다 역할이 더 중요하므로,
 * 호스트 카드인 경우에는 dbStatus와 무관하게 host 메타를 우선 적용한다.
 */
export const getParticipationStatusMeta = (status, myRole) => {
  if (myRole === "host") {
    return PARTICIPATION_STATUS_META.host;
  }

  return PARTICIPATION_STATUS_META[status] ?? PARTICIPATION_STATUS_META.default;
};
