import clsx from "clsx";
import Button from "../../../../shared/ui/Button/Button";
import { HOST_APPLICANT_STATUS_FILTERS } from "../../model/constants";
import HostParticipationCard from "../HostParticipationCard/HostParticipationCard";
import styles from "./HostParticipationList.module.css";
import participationStyles from "../Participation.module.css";

/*
 * ScheduleDetail 안에서 호스트에게만 보이는 "신청자 관리 패널"이다.
 * 이 컴포넌트는 단순 리스트라기보다, 상태 필터와 신청자 카드 묶음을 함께 가진 작은 서브 화면에 가깝다.
 *
 * 데이터 흐름:
 * - activeStatus는 ScheduleDetail state에서 내려옴
 * - 필터 버튼 클릭 시 onStatusChange 호출
 * - 상위의 applicantStatus state 변경
 * - useScheduleApplicantsQuery key 변경
 * - 해당 상태의 신청자 목록 재조회
 */
function HostParticipationList({
  items,
  loading,
  errorMessage,
  emptyMessage,
  hostEmail,
  onProfileClick,
  onItemAction,
  activeStatus,
  onStatusChange,
  isActionLoading = false,
  isReadOnly = false,
}) {
  /*
   * 신청자 목록은 일반 사용자에게는 아예 열리지 않는 데이터라,
   * 로딩 메시지도 "신청자 목록"이라는 문맥을 포함해 별도 섹션 안에 보여준다.
   */
  if (loading) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>신청자 관리</h2>
        </div>
        <div className={participationStyles.stateBox}>
          신청자 목록을 불러오는 중입니다.
        </div>
      </section>
    );
  }

  /*
   * 권한 오류나 네트워크 오류도 이 섹션 안에서만 처리한다.
   * 상세 페이지 본문 전체를 막지 않는 이유는, 일정 자체 정보는 여전히 볼 수 있기 때문이다.
   */
  if (errorMessage) {
    return (
      <section className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>신청자 관리</h2>
        </div>
        <div
          className={clsx(
            participationStyles.stateBox,
            participationStyles.errorState
          )}
        >
          {errorMessage}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>신청자 관리</h2>
      </div>

      <div className={styles.filterGroup}>
        {HOST_APPLICANT_STATUS_FILTERS.map((filter) => (
          /*
           * 필터 버튼은 단순 스타일 전환이 아니라 query key 변경 트리거다.
           * 따라서 버튼을 누르는 순간 화면 흐름은 아래처럼 이어진다.
           * 1. activeStatus 변경
           * 2. useScheduleApplicantsQuery 재실행
           * 3. 새 상태 목록 도착
           * 4. HostParticipationCard 목록 재렌더링
           */
          <Button
            key={filter.value}
            type="button"
            variant={activeStatus === filter.value ? "accent" : "outline"}
            size="sm"
            onClick={() => onStatusChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* 선택한 상태에 해당하는 신청자가 없는 경우다.
       예를 들어 KICKED 필터를 눌렀지만 강퇴된 사람이 아직 없으면 emptyMessage가 표시된다. */}
      {!items || items.length === 0 ? (
        <div className={participationStyles.stateBox}>{emptyMessage}</div>
      ) : (
        <div className={participationStyles.listContainer}>
          {items.map((item) => (
            /*
             * 각 신청자 카드는 현재 상태와 액션 가능 여부를 스스로 렌더링하지만,
             * 승인/거절/강퇴 실행 자체는 상위 페이지의 mutation으로 이어진다.
             */
            <HostParticipationCard
              key={item.participationId}
              item={item}
              hostEmail={hostEmail}
              onProfileClick={onProfileClick}
              onAction={onItemAction}
              isActionLoading={isActionLoading}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default HostParticipationList;
