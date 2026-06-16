export const SCHEDULE_STATUS = Object.freeze({
  RECRUITING: "recruiting",
  CLOSED: "closed",
  CANCELED: "canceled",
  COMPLETED: "completed",
});

export const SCHEDULE_STATUS_LABELS = Object.freeze({
  [SCHEDULE_STATUS.RECRUITING]: "모집중",
  [SCHEDULE_STATUS.CLOSED]: "모집마감",
  [SCHEDULE_STATUS.CANCELED]: "일정취소",
  [SCHEDULE_STATUS.COMPLETED]: "일정완료",
});

export const normalizeScheduleStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

/*
 * 화면은 DB literal을 직접 다루지 않고 이 helper를 거쳐 한글 문구를 얻는다.
 * 새 상태가 추가되더라도 fallback으로 원본 값을 남겨 디버깅 단서를 유지한다.
 */
export const getScheduleStatusLabel = (value) => {
  const normalizedStatus = normalizeScheduleStatus(value);
  return SCHEDULE_STATUS_LABELS[normalizedStatus] ?? value ?? "";
};
