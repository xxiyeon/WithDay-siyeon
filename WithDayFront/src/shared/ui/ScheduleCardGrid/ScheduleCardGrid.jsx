import clsx from "clsx";
import styles from "./ScheduleCardGrid.module.css";

/*
 * 탐색 탭 일정 카드의 공통 그리드 wrapper다.
 * 카드 자체는 데이터 표시만 담당하고, 화면 폭에 따른 열 수는 이 wrapper의 CSS module에서 관리한다.
 */
export default function ScheduleCardGrid({ children, className }) {
  return <div className={clsx(styles.grid, className)}>{children}</div>;
}
