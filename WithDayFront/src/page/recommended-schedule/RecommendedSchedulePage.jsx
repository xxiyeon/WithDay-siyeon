import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";

import Button from "../../shared/ui/Button/Button";
import { useAuthStore } from "../../features/auth/store/authStore";
import { getRecommendedSchedules } from "../../features/recommended/api";
import styles from "./RecommendedSchedulePage.module.css";

const CATEGORY_OPTIONS = [
  { label: "전체", value: "" },
  { label: "여행", value: "travel" },
  { label: "팝업", value: "popup" },
  { label: "식사", value: "food" },
  { label: "액티비티", value: "activity" },
  { label: "문화", value: "culture" },
  { label: "기타", value: "etc" },
];

const CATEGORY_LABELS = {
  travel: "여행",
  popup: "팝업",
  food: "식사",
  activity: "액티비티",
  culture: "문화",
  etc: "기타",
};

const GENDER_LIMIT_LABELS = {
  all: "남·녀",
  male: "남",
  female: "여",
};

const DEFAULT_THUMBNAIL = "/default-4.png";

// DB/API 카테고리 값을 화면용 한글 라벨로 변환
const resolveCategoryLabel = (category) => {
  return (
    CATEGORY_LABELS[
    String(category ?? "")
      .trim()
      .toLowerCase()
    ] ?? "기타"
  );
};

// DB/API 성별 제한 값을 카드 우측 상단 pill 라벨로 변환
const resolveGenderLimitLabel = (genderLimit) => {
  return (
    GENDER_LIMIT_LABELS[
    String(genderLimit ?? "")
      .trim()
      .toLowerCase()
    ] ?? "남·녀"
  );
};

// region과 detailRegion을 기존 탐색 카드의 하단 위치 pill에 맞게 조합
const resolveRegionLabel = (schedule) => {
  const region = schedule?.region?.trim() ?? "";
  const detailRegion = schedule?.detailRegion?.trim() ?? "";

  if (region && detailRegion) {
    return `${region} ${detailRegion}`;
  }

  return region || detailRegion || "지역 미정";
};

// 추천 일정 썸네일 우선순위
// 1. recommended_schedule.thumbnailImage
// 2. images 중 isThumbnail인 이미지
// 3. images의 첫 번째 이미지
// 4. 기본 이미지 hero.png
const resolveThumbnail = (schedule, images = []) => {
  const thumbnailFromSchedule = schedule?.thumbnailImage?.trim();

  if (thumbnailFromSchedule) {
    return thumbnailFromSchedule;
  }

  const thumbnailImage = images.find((image) => image?.isThumbnail)?.imageUrl;

  if (thumbnailImage) {
    return thumbnailImage;
  }

  const firstImage = images[0]?.imageUrl;

  if (firstImage) {
    return firstImage;
  }

  return DEFAULT_THUMBNAIL;
};

const isDefaultThumbnail = (src) => src === DEFAULT_THUMBNAIL;

// 추천 일정 id가 비어 있는 예외 상황까지 대비한 React key 생성
const getRecommendedKey = (item) => {
  const schedule = item?.recommendedSchedule;

  return String(
    schedule?.id ??
    `${schedule?.title ?? "recommended"}-${schedule?.region ?? "unknown"
    }-${schedule?.durationDays ?? "duration"}`,
  );
};
const resolveDurationBadgeLabel = (durationDays) => {
  const days = Number(durationDays ?? 1);
  const safeDays = Number.isFinite(days) && days > 0 ? days : 1;

  if (safeDays === 1) {
    return "당일치기";
  }

  return `${safeDays - 1}박 ${safeDays}일`;
};
const RecommendedSchedulePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [selectedCategory, setSelectedCategory] = useState("");

  const isAdmin = user?.status === "admin";

  // 추천 일정 목록 조회
  const {
    data: recommendedSchedules = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["recommended-schedules"],
    queryFn: getRecommendedSchedules,
  });

  // 선택한 카테고리가 있으면 해당 카테고리만 필터링하고,
  // 전체를 선택한 경우에는 전체 추천 일정을 그대로 보여줌
  const filteredSchedules = useMemo(() => {
    if (!selectedCategory) {
      return recommendedSchedules;
    }

    return recommendedSchedules.filter((item) => {
      return item.recommendedSchedule?.category === selectedCategory;
    });
  }, [recommendedSchedules, selectedCategory]);

  const selectedCategoryLabel = useMemo(() => {
    return (
      CATEGORY_OPTIONS.find((category) => category.value === selectedCategory)
        ?.label ?? "전체"
    );
  }, [selectedCategory]);

  const listTitle = selectedCategory
    ? `추천 ${selectedCategoryLabel} 일정 목록`
    : "추천 일정 목록";

  const listDescription = isLoading
    ? selectedCategory
      ? `추천 ${selectedCategoryLabel} 일정을 불러오는 중입니다.`
      : "추천 일정을 불러오는 중입니다."
    : selectedCategory
      ? `${filteredSchedules.length}개의 추천 ${selectedCategoryLabel} 일정이 준비되어 있어요.`
      : `${filteredSchedules.length}개의 추천 일정이 준비되어 있어요.`;

  const emptyMessage = selectedCategory
    ? `아직 등록된 추천 ${selectedCategoryLabel} 일정이 없습니다.`
    : "아직 등록된 추천 일정이 없습니다.";

  // 관리자만 추천 일정 생성 페이지로 이동 가능
  const handleCreateClick = () => {
    navigate("/recommended-schedules/write");
  };

  return (
    <main className={styles.page}>
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>
            <AutoAwesomeRoundedIcon fontSize="small" />
            WITHDAY 추천 일정
          </p>

          <h1 className={styles.title}>추천 일정에서 시작해보세요</h1>

          <p className={styles.description}>
            WithDay가 준비한 추천 일정을 확인하고, 마음에 드는 코스를 내 일정
            글쓰기에 템플릿처럼 사용할 수 있어요.
          </p>
        </div>

        {isAdmin && (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleCreateClick}
            className={styles.createButton}
          >
            <AddRoundedIcon fontSize="small" />
            추천 일정 생성
          </Button>
        )}
      </section>

      <section className={styles.filterSection} aria-label="추천 일정 필터">
        {CATEGORY_OPTIONS.map((category) => (
          <button
            key={category.value || "all"}
            type="button"
            className={clsx(styles.categoryChip, {
              [styles.categoryChipActive]: selectedCategory === category.value,
            })}
            onClick={() => setSelectedCategory(category.value)}
          >
            {category.label}
          </button>
        ))}
      </section>

      <section className={styles.listHeader}>
        <div>
          <h2>{listTitle}</h2>
          <p>{listDescription}</p>
        </div>
      </section>

      {isLoading && (
        <section className={styles.stateBox}>
          <div className={styles.loadingSpinner} />
          <p>추천 일정을 불러오는 중입니다...</p>
        </section>
      )}

      {isError && (
        <section className={clsx(styles.stateBox, styles.errorBox)}>
          <p>추천 일정 목록을 불러오지 못했습니다.</p>
        </section>
      )}

      {!isLoading && !isError && filteredSchedules.length === 0 && (
        <section className={styles.stateBox}>
          <p>{emptyMessage}</p>
        </section>
      )}

      {!isLoading && !isError && filteredSchedules.length > 0 && (
        <section className={styles.cardGrid}>
          {filteredSchedules.map((item) => (
            <RecommendedScheduleCard
              key={getRecommendedKey(item)}
              item={item}
              onClick={() => {
                const scheduleId = item.recommendedSchedule?.id;

                if (!scheduleId) {
                  return;
                }

                navigate(`/recommended-schedules/${scheduleId}`);
              }}
            />
          ))}
        </section>
      )}
    </main>
  );
};

const RecommendedScheduleCard = ({ item, onClick }) => {
  const schedule = item.recommendedSchedule;
  const images = item.images ?? [];

  const thumbnailSrc = resolveThumbnail(schedule, images);
  const categoryLabel = resolveCategoryLabel(schedule?.category);
  const genderLabel = resolveGenderLimitLabel(schedule?.genderLimit);
  const regionLabel = resolveRegionLabel(schedule);

  const durationDays = Number(schedule?.durationDays ?? 1);
  const safeDurationDays =
    Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 1;
  const durationBadgeLabel = resolveDurationBadgeLabel(safeDurationDays);

  const descriptionText =
    schedule?.description?.trim() || "추천 일정 소개가 아직 등록되지 않았어요.";

  // 외부 이미지 URL이 깨지면 기본 이미지로 대체
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_THUMBNAIL;
  };

  return (
    <article
      className={styles.scheduleCard}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.cardTop}>
        <div className={styles.headerSection}>
          <div className={clsx(styles.infoRow, styles.topRow)}>
            <div className={styles.topMetaGroup}>
              <span
                className={clsx(styles.recommendPill, {
                  [styles.recommendPillOneDay]: safeDurationDays === 1,
                  [styles.recommendPillMultiDay]: safeDurationDays > 1,
                })}
              >
                {durationBadgeLabel}
              </span>
            </div>

            <div className={styles.topMetaActions}>
              <span className={styles.genderPill}>{genderLabel}</span>
            </div>
          </div>

          <div className={clsx(styles.infoRow, styles.dateRow)}>
            <div className={styles.dateRowContent}>
              <span className={styles.dateIconWrap} aria-hidden="true">
                <CalendarMonthIcon className={styles.dateIcon} />
              </span>

              <span className={styles.dateText}>{safeDurationDays}일 코스</span>
            </div>
          </div>

          <div className={clsx(styles.infoRow, styles.titleRow)}>
            <div className={styles.titleGroup}>
              <h3 className={styles.cardTitle}>
                {schedule?.title ?? "제목 없는 추천 일정"}
              </h3>
            </div>
          </div>

          <div className={clsx(styles.infoRow, styles.descriptionRow)}>
            <p className={styles.cardDescription}>{descriptionText}</p>
          </div>
        </div>
      </div>

      <div className={styles.ticketDivider} aria-hidden="true" />

      <div className={styles.cardBottom}>
        <div className={styles.thumbnailWrap}>
          <img
            src={thumbnailSrc}
            alt={schedule?.title ?? "추천 일정 썸네일"}
            className={clsx(
              styles.thumbnail,
              isDefaultThumbnail(thumbnailSrc) && styles.thumbnailFallback,
            )}
            onError={handleImageError}
          />

          <div className={styles.thumbnailOverlay}>
            <span className={styles.overlayPill}>{regionLabel}</span>
            <span className={styles.overlayPill}>{categoryLabel}</span>
          </div>
        </div>
      </div>
    </article>
  );
};

export default RecommendedSchedulePage;
