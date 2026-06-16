import ExploreOutlinedIcon from "@mui/icons-material/ExploreOutlined";
import Button from "../../../../shared/ui/Button/Button";
import styles from "./EmptyScheduleState.module.css";

/*
 * 내 일정/참여 목록에서 조회는 성공했지만 보여줄 카드가 없을 때 쓰는 공통 빈 상태다.
 * 빈 상태 문구와 액션은 탭마다 의미가 다르므로 상위가 전달하고, 이 컴포넌트는 접근성 role과 시각 구조만 책임진다.
 */
function EmptyScheduleState({ title, description, actionLabel, onAction }) {
  return (
    <div className={styles.emptyState} role="status" aria-live="polite">
      <div className={styles.iconWrap} aria-hidden="true">
        <ExploreOutlinedIcon />
      </div>
      <strong className={styles.title}>{title}</strong>
      <p className={styles.description}>{description}</p>
      {onAction ? (
        /*
         * 일부 빈 상태는 일정 탐색으로 보내는 CTA가 있지만,
         * 단순 안내만 필요한 탭도 있으므로 onAction이 있을 때만 버튼을 렌더링한다.
         */
        <Button
          variant="accent"
          size="md"
          className={styles.actionButton}
          onClick={onAction}
          aria-label={actionLabel}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export default EmptyScheduleState;
