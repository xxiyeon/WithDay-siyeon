import { memo } from "react";
import clsx from "clsx";
import EmptyScheduleState from "../EmptyScheduleState/EmptyScheduleState";
import JoinedScheduleCard from "../JoinedScheduleCard/JoinedScheduleCard";
import styles from "./ParticipationList.module.css";

/*
 * MySchedulePage 전용 리스트 렌더러다.
 * 상위 페이지는 "현재 탭에서 보여줄 데이터"와 "지금이 로딩/오류/빈 상태인가"만 계산해서 넘기고,
 * 이 컴포넌트는 그 상태에 맞는 화면 껍데기를 담당한다.
 *
 * 이렇게 분리하면 페이지 파일은 데이터 흐름에 집중하고,
 * UI 상태별 마크업 중복은 이 컴포넌트 한 곳에서 관리할 수 있다.
 */
function ParticipationList({
  items,
  loading,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  onItemAction,
  isActionLoading = false,
  itemKeyPrefix = "default",
  renderItem,
}) {
  /*
   * 탭 전환이나 첫 진입 직후에는 query가 pending 상태가 될 수 있다.
   * 이때 이전 탭 카드가 잠깐 남아 있으면 사용자가 "탭이 바뀌지 않았다"고 느낄 수 있어,
   * 명시적인 로딩 박스로 상태 전환을 보여준다.
   */
  if (loading) {
    return (
      <div className={styles.listContainer}>
        <div className={styles.stateBox}>
          내 일정 정보를 불러오는 중입니다.
        </div>
      </div>
    );
  }

  /*
   * 오류를 페이지 전체 레벨에서 막지 않고 리스트 영역 안에서 처리하는 이유는,
   * 상단 탭/피드백 UI는 유지한 채 문제 영역만 분리해서 보여주는 편이 사용성이 낫기 때문이다.
   */
  if (errorMessage) {
    return (
      <div className={styles.listContainer}>
        <div className={clsx(styles.stateBox, styles.errorState)}>
          {errorMessage}
        </div>
      </div>
    );
  }

  /*
   * 빈 상태도 탭마다 의미가 다르다.
   * 예:
   * - 참여중 탭: 아직 승인된 일정이 없음
   * - 신청중 탭: 아직 신청한 일정이 없음
   * - 호스팅 탭: 아직 만든 일정이 없음
   */
  if (!items || items.length === 0) {
    return (
      <div className={styles.listContainer}>
        <EmptyScheduleState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      {items.map((item) => (
        <div key={`${itemKeyPrefix}-${item.id}`} className={styles.cardWrap}>
          {renderItem ? (
            renderItem(item)
          ) : (
            <JoinedScheduleCard
              item={item}
              onAction={onItemAction}
              isActionLoading={isActionLoading}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default memo(ParticipationList);
