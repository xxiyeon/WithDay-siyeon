import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";
import ScheduleCard from "../../features/schedule/ui/ScheduleCard";
import HomeCarousel from "./HomeCarousel";
import { fetchSchedules } from "../../features/schedule/api";
import { useAuthStore } from "../../features/auth/store/authStore";

/*
 * 홈 탭은 전체 일정 중 일부만 "추천/미리보기" 형태로 보여준다.
 * 탐색 탭처럼 검색/카테고리 UI를 직접 노출하지 않고, 전체 일정 중 홈에 적합한 일부만 가볍게 구성한다.
 */
const MAX_HOME_ITEMS = 8;

/*
 * React 리스트 key는 가능하면 서버 PK(id)를 사용한다. 
 * 임시 데이터나 이전 API 응답처럼 id가 비어 있을 수 있어 scheduleId와 제목/날짜 조합을 fallback으로 둔다.
 */
const getScheduleKey = (schedule) =>
  String(
    schedule?.id ??
    schedule?.scheduleId ??
    `${schedule?.title ?? "schedule"}-${schedule?.startDate ?? "unknown"}`,
  );

/*
 * 홈에서는 "가까운 일정"이 먼저 보이도록 endDate/startDate 기준으로 정렬한다.
 * 백엔드 기본 정렬은 최신 등록순이지만, 홈 섹션은 탐색 목록이 아니라 추천 영역이라 노출 우선순위를 프론트에서 한 번 더 잡는다.
 */
const sortByPriorityDate = (left, right) => {
  const leftTime = new Date(left?.endDate ?? left?.startDate ?? 0).getTime();
  const rightTime = new Date(right?.endDate ?? right?.startDate ?? 0).getTime();
  return leftTime - rightTime;
};

export default function Home() {
  const navigate = useNavigate();
  const authEmail = useAuthStore((state) => state.user?.email?.trim() ?? "");

  /*
   * 페이지 진입 시 react-query가 GET /schedules를 호출한다.
   * staleTime 1분 동안은 같은 지역으로 다시 돌아왔을 때 즉시 캐시를 보여주고, 불필요한 재요청을 줄인다.
   */
  const {
    data: schedules = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["home-schedules", authEmail || "guest"],
    queryFn: () =>
      fetchSchedules({
        category: "all",
        keyword: "",
        email: authEmail,
      }),
    staleTime: 1000 * 60,
  });

  /*
   * API 응답은 방어적으로 배열인지 확인한 뒤 정렬/자르기를 수행한다.
   * 원본 schedules를 직접 sort하면 react-query 캐시 데이터까지 변형될 수 있으므로 복사본([...schedules])을 정렬한다.
   */
  const featuredSchedules = useMemo(() => {
    const safeSchedules = Array.isArray(schedules) ? [...schedules] : [];
    return safeSchedules.sort(sortByPriorityDate).slice(0, MAX_HOME_ITEMS);
  }, [schedules]);

  return (
    <div className={styles.main}>
      <HomeCarousel />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleWrap}>
            <span className={styles.sectionAccent} aria-hidden="true" />
            <div>
              <h2 className={styles.sectionTitle}>마중 나온 위트들</h2>
              <p className={styles.sectionCaption}>
                함께 가기 좋은 일정들을 홈에서 먼저 만나보세요.
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.moreButton}
            onClick={() => navigate("/explore")}
          >
            전체보기
          </button>
        </div>

        {isLoading && (
          <div className={styles.stateBox}>
            <div className={styles.loadingSpinner} />
            <p>홈 추천 일정을 불러오는 중...</p>
          </div>
        )}

        {isError && (
          <div className={clsx(styles.stateBox, styles.errorBox)}>
            <p>
              홈 추천 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          </div>
        )}

        {!isLoading && !isError && featuredSchedules.length === 0 && (
          <div className={styles.homeEmpty}>
            <h3 className={styles.homeEmptyTitle}>
              추천할 일정이 아직 없어요.
            </h3>
            <p className={styles.homeEmptyText}>
              탐색 탭에서 조건을 바꿔 전체 일정을 확인해보세요.
            </p>
          </div>
        )}

        {!isLoading && !isError && featuredSchedules.length > 0 && (
          <div className={styles.cardRail}>
            {featuredSchedules.map((schedule) => (
              /*
               * 홈은 가로 스크롤 카드 레일에 compact variant를 사용한다.
               * schedule 객체는 카드가 필요한 썸네일/제목/날짜/지역/모집정보를 모두 포함하고,
               * className은 홈 레일의 scroll-snap 같은 레이아웃만 보강한다.
               */
              <ScheduleCard
                key={getScheduleKey(schedule)}
                schedule={schedule}
                variant="compact"
                className={clsx(styles.homeCard, "homeTicketCard homeMainTicketCard")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
