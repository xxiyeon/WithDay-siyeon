import Button from "../../../../shared/ui/Button/Button";
import styles from "../HostParticipationList/HostParticipationList.module.css";

/*
 * 호스트 신청자 카드 하단에 들어가는 "상태별 액션 버튼" 전용 컴포넌트다.
 * 이 컴포넌트의 핵심 목적은 "상태에 따라 어떤 버튼을 보여줄지"를 선언적으로 관리하는 것이다.
 *
 * 상태별 허용 액션:
 * - PENDING: 승인, 거절
 * - APPROVED: 강퇴
 * - REJECTED / CANCELED / KICKED: 더 이상 변경 버튼 없음
 *
 * 실제 서버 검증은 백엔드가 다시 수행하지만,
 * 프런트도 미리 가능한 버튼만 노출해 사용자가 불필요한 실패 요청을 덜 보내게 한다.
 */
const ACTIONS_BY_STATUS = {
  PENDING: [
    {
      label: "승인",
      status: "APPROVED",
      variant: "accent",
    },
    {
      label: "거절",
      status: "REJECTED",
      variant: "outline",
    },
  ],
  APPROVED: [
    {
      label: "강퇴",
      status: "KICKED",
      variant: "outline",
    },
  ],
};

function ParticipationStatusActions({
  participationId,
  scheduleId,
  email,
  status,
  disabled = false,
  isReadOnly = false,
  onAction,
}) {
  /*
   * 현재 신청자 상태에 대응하는 버튼 목록을 꺼낸다.
   * 정의되지 않은 상태는 빈 배열이 되어, 아래에서 "변경 가능한 상태가 아닙니다" 문구로 자연스럽게 처리된다.
   */
  const actions = ACTIONS_BY_STATUS[status] ?? [];

  if (isReadOnly) {
    return (
      <span className={styles.actionNote}>
        진행 중인 일정은 상태를 변경할 수 없습니다.
      </span>
    );
  }

  /*
   * 이미 최종 상태에 들어간 신청자는 액션 버튼을 숨긴다.
   * 이 설계는 disabled 버튼 여러 개를 늘어놓는 것보다 "이제 변경할 수 없는 상태"라는 메시지를 더 명확하게 전달한다.
   */
  if (actions.length === 0) {
    return (
      <span className={styles.actionNote}>변경 가능한 상태가 아닙니다.</span>
    );
  }

  return (
    <div className={styles.actionGroup}>
      {actions.map((action) => (
        <Button
          key={action.status}
          type="button"
          variant={action.variant}
          size="sm"
          disabled={disabled}
          onClick={() =>
            /*
             * 여기서는 API를 직접 호출하지 않고 액션 payload만 상위로 올린다.
             * 이 payload에는 서버 요청에 필요한 핵심 식별자가 모두 담긴다.
             *
             * payload 구조:
             * {
             *   participationId: 어떤 신청 row를 바꿀지
             *   scheduleId: 상위에서 invalidate/문맥 확인에 사용
             *   email: 요청자(호스트) 식별용
             *   status: 목표 상태(APPROVED/REJECTED/KICKED)
             *   reason: 현재는 빈 문자열이지만 추후 확장 가능
             * }
             *
             * 카드 컴포넌트는 UI 이벤트만 만들고, 실제 API 호출은 ScheduleDetail의 handleApplicantAction으로 올린다.
             * 상위에서 확인창, mutation, 토스트, 캐시 무효화를 한 번에 관리하기 위해서다.
             */
            onAction({
              participationId,
              scheduleId,
              email,
              status: action.status,
              reason: "",
            })
          }
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

export default ParticipationStatusActions;
