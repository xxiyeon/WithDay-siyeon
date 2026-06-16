import { dayjs, formatDateRange, getDDay } from "../../../shared/lib/dateUtile";
import {
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
} from "../../schedule/model/constants";
import { PARTICIPATION_CATEGORY_LABELS } from "./constants";

const DEFAULT_MY_SCHEDULE_THUMBNAIL = "/default-4.png";

/*
 * mapper 레이어는 "서버 응답 shape"를 "UI에서 직접 쓰기 좋은 shape"로 변환한다.
 * 이 파일이 필요한 이유는 백엔드 필드명과 프런트 화면 표현이 항상 1:1로 맞지 않기 때문이다.
 *
 * 예:
 * - dbStatus -> 화면 배지용 대문자 상태
 * - startDate/endDate -> "2026-05-26 ~ 2026-05-27" 형태 문자열
 * - category code -> 한글 라벨
 *
 * 이렇게 중간 변환 레이어를 두면, UI 컴포넌트는 날짜 계산이나 상태 정규화 같은 도메인 세부 구현을 몰라도 된다.
 */
export const normalizeParticipationStatus = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const normalized = value.trim().toUpperCase();

  /*
   * 백엔드/DB 이력상 CANCELED와 CANCELLED가 섞여 들어올 수 있으므로,
   * 화면에서는 하나의 표준값 CANCELED로 통일한다.
   * 그래야 status 비교 분기가 오탈자에 흔들리지 않는다.
   */
  if (normalized === "CANCELED" || normalized === "CANCELLED") {
    return "CANCELED";
  }

  return normalized;
};

/*
 * 날짜 범위를 카드에서 바로 그릴 수 있는 문자열로 바꾼다.
 * 일정 날짜가 비어 있을 때 formatDateRange가 "일정 미정"을 반환하더라도,
 * 카드 UI에서는 더 짧은 placeholder("-")가 배치상 안정적이어서 한 번 더 치환한다.
 */
const formatDisplayDateRange = (startDate, endDate) => {
  const formattedRange = formatDateRange(startDate, endDate);

  if (formattedRange === "일정 미정") {
    return "-";
  }

  return formattedRange;
};

/*
 * 카드 왼쪽 상단의 D-day 배지를 만들기 위한 helper다.
 * 우선 shared/lib/dateUtile의 공통 계산을 사용하고,
 * 계산 결과가 비어 있어도 이미 지난 일정이면 "종료"를 노출해 사용자가 상태를 더 빠르게 이해하게 한다.
 */
const formatDisplayDDay = (startDate) => {
  if (!startDate) {
    return "-";
  }

  const dDay = getDDay(startDate);
  if (dDay) {
    return dDay;
  }

  const today = dayjs().startOf("day");
  const target = dayjs(startDate).startOf("day");

  if (target.isBefore(today)) {
    return "종료";
  }

  return "-";
};

/*
 * schedule 자체의 모집/진행 상태를 participation 카드에 표시할 짧은 문구로 바꾸는 함수다.
 * participation status와 별개로 일정 자체의 현재 상태를 카드에 짧게 보여주기 위한 helper다.
 *
 * 판단 순서가 중요한 이유:
 * - 명시적 schedule.status(recruiting/closed/completed/canceled)를 우선 반영
 * - 그다음 날짜 기준 종료 여부를 보정
 * - 마지막 fallback을 모집중으로 둔다
 */
const resolveSchedulePhase = ({
  endDate,
  recruitEndDate,
  scheduleStatus,
}) => {
  const today = dayjs().startOf("day");
  const normalizedStatus = scheduleStatus?.trim()?.toLowerCase() ?? "";
  const end = endDate ? dayjs(endDate).startOf("day") : null;
  const recruitEnd = recruitEndDate ? dayjs(recruitEndDate).startOf("day") : null;

  if (normalizedStatus === SCHEDULE_STATUS.CANCELED) {
    return SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CANCELED];
  }

  if (normalizedStatus === SCHEDULE_STATUS.COMPLETED) {
    return SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.COMPLETED];
  }

  if (
    normalizedStatus === SCHEDULE_STATUS.CLOSED ||
    (recruitEnd?.isValid() && recruitEnd.isBefore(today))
  ) {
    return SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CLOSED];
  }

  if (end?.isValid() && end.isBefore(today)) {
    return SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.COMPLETED];
  }

  return SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.RECRUITING];
};

/*
 * 내 일정 카드 하나에 필요한 모든 표시용 필드를 조합한다.
 * 이 시점에서 상위 페이지는 더 이상 서버 원본 필드명을 알 필요가 없고,
 * ParticipationCard는 item.title, item.dDay 같은 화면 중심 필드만 사용한다.
 */
export const normalizeMyScheduleItem = (item) => {
  const normalizedStatus = normalizeParticipationStatus(item.dbStatus);
  const schedulePhase = resolveSchedulePhase({
    endDate: item.endDate,
    recruitEndDate: item.recruitEndDate,
    scheduleStatus: item.scheduleStatus,
  });
  const today = dayjs().startOf("day");
  const start = item.startDate ? dayjs(item.startDate).startOf("day") : null;
  const daysUntilStart =
    start?.isValid() ? start.diff(today, "day") : Number.POSITIVE_INFINITY;

  const resolvePhaseTone = (phase) => {
    if (phase === SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.RECRUITING]) return "open";
    if (phase === SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CLOSED]) return "closed";
    if (phase === SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.COMPLETED]) return "ongoing";
    if (phase === SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CANCELED]) return "canceled";
    return "neutral";
  };

  return {
    id: item.participationId ?? item.scheduleId,
    scheduleId: item.scheduleId,
    participationId: item.participationId,
    category:
      PARTICIPATION_CATEGORY_LABELS[item.category] ?? item.category ?? "기타",
    dDay: formatDisplayDDay(item.startDate),
    title: item.title ?? "-",
    location: item.location ?? "-",
    date: formatDisplayDateRange(item.startDate, item.endDate),
    currentPeople: item.currentPeople ?? 0,
    maxPeople: item.maxPeople ?? 0,
    dbStatus: normalizedStatus,
    scheduleStatus: item.scheduleStatus ?? "",
    recruitEndDate: item.recruitEndDate ?? "",
    schedulePhase,
    myRole: item.myRole ?? (item.host ? "host" : "participant"),
    thumbnail: item.thumbnail ?? "",
    thumbnailSrc: item.thumbnail?.trim() || DEFAULT_MY_SCHEDULE_THUMBNAIL,
    hasThumbnail: Boolean(item.thumbnail?.trim()),
    isUpcomingSoon:
      Number.isFinite(daysUntilStart) &&
      daysUntilStart >= 0 &&
      daysUntilStart <= 7,
    schedulePhaseTone: resolvePhaseTone(schedulePhase),
  };
};

/*
 * 탭별 query는 배열 하나만 응답으로 다루므로,
 * 단일 리스트도 같은 규칙으로 정규화할 수 있는 helper를 함께 제공한다.
 */
export const normalizeMyScheduleList = (items = []) =>
  items.map(normalizeMyScheduleItem);

/*
 * 호스트 신청자 관리 카드용 데이터 정규화다.
 * applicant 목록은 사용자의 닉네임/이메일/신청 시각을 그대로 보여줘야 하므로,
 * 불필요한 가공은 줄이고 status 정규화 정도만 수행한다.
 *
 * phone/gender/fullAge는 호스트 권한을 통과한 applicants API에서만 기대하는 값이다.
 * birthday 원본은 백엔드 DTO에서 @JsonIgnore 처리되므로 이 mapper에 들어오면 안 되며, 화면은 fullAge만 사용한다.
 */
export const normalizeParticipationApplicant = (item) => ({
  participationId: item.participationId,
  scheduleId: item.scheduleId,
  userId: item.userId,
  email: item.email ?? "",
  nickname: item.nickname ?? "-",
  profileImage: item.profileImage ?? "",
  phone: item.phone ?? "",
  gender: item.gender ?? null,
  fullAge: item.fullAge ?? null,
  status: normalizeParticipationStatus(item.status),
  createdAt: item.createdAt ?? "",
});

/*
 * 내 일정 API는 세 탭 배열을 한 번에 내려주므로,
 * 각 배열을 같은 규칙으로 map 해 화면 모델로 변환한다.
 */
export const normalizeMySchedulesResponse = ({
  participating = [],
  pending = [],
  hosting = [],
} = {}) => ({
  participating: normalizeMyScheduleList(participating),
  pending: normalizeMyScheduleList(pending),
  hosting: normalizeMyScheduleList(hosting),
});

/*
 * 신청자 목록도 카드 렌더링 전에 한 번 일괄 정규화한다.
 * 이렇게 하면 HostParticipationCard는 raw API 형식이 바뀌어도 영향 범위가 작아진다.
 */
export const normalizeScheduleApplicantsResponse = (items = []) =>
  items.map(normalizeParticipationApplicant);
