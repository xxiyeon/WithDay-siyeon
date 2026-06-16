import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useAuthStore } from "../../features/auth/store/authStore";
import { fetchBookmarkedSchedules } from "../../features/schedule/api";
import ScheduleCard from "../../features/schedule/ui/ScheduleCard";
import styles from "./WishlistPage.module.css";

const getScheduleKey = (schedule) =>
  String(
    schedule?.id ??
    schedule?.scheduleId ??
    `${schedule?.title ?? "schedule"}-${schedule?.startDate ?? "unknown"}`,
  );

export default function WishlistPage() {
  const authEmail = useAuthStore((state) => state.user?.email?.trim() ?? "");

  /*
   * 위시리스트는 로그인 사용자별로 완전히 다른 데이터셋이므로,
   * queryKey에도 email을 넣어 계정 전환 시 캐시가 섞이지 않게 분리한다.
   */
  const {
    data: schedules = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["bookmarks", authEmail],
    queryFn: fetchBookmarkedSchedules,
    enabled: Boolean(authEmail),
    staleTime: 1000 * 30,
  });

  return (
    <main className={styles.main}>
      {isLoading && (
        <section className={styles.stateBox}>
          <div className={styles.loadingSpinner} />
          <p>위시리스트를 불러오는 중...</p>
        </section>
      )}

      {isError && (
        <section className={clsx(styles.stateBox, styles.errorBox)}>
          <p>위시리스트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>
        </section>
      )}

      {!isLoading && !isError && schedules.length === 0 && (
        <section className={styles.emptyBox}>
          <h2 className={styles.emptyTitle}>아직 저장한 일정이 없어요.</h2>
          <p className={styles.emptyDescription}>
            마음에 드는 일정을 상세 화면에서 위시리스트에 저장해 보세요.
          </p>
        </section>
      )}

      {!isLoading && !isError && schedules.length > 0 && (
        <section className={styles.listSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>최근 저장한 일정</h2>
            <p className={styles.sectionCaption}>
              마감 여부와 일정 상태는 카드 배지에서 바로 확인할 수 있어요.
            </p>
          </div>

          <div className={styles.wishlistCardGrid}>
            {schedules.map((schedule) => (
              <ScheduleCard
                key={getScheduleKey(schedule)}
                schedule={schedule}
                variant="compact"
                className="homeTicketCard mainTicketCard"
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
