import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import { dayjs, getDDay } from "../../../shared/lib/dateUtile";
import styles from "./ScheduleCard.module.css";

/*
 * ScheduleCard는 홈 탭과 탐색 탭이 공유하는 일정 카드 컴포넌트다.
 * 페이지별 레이아웃은 className/variant로만 조정하고, 카드 내부의 데이터 해석과 표시 규칙은 이 파일에 모아둔다.
 */
const GENDER_LIMIT_LABELS = {
  all: "남·여",
  male: "남",
  female: "여",
};

const CATEGORY_LABELS = {
  travel: "여행",
  popup: "팝업",
  food: "식사",
  activity: "액티비티",
  culture: "문화",
  etc: "기타",
};

const defaultThumbnail = "/default-4.png";

/*
 * 백엔드 응답 필드가 화면별로 조금씩 다를 수 있어 가능한 썸네일 후보를 순서대로 확인한다.
 * 최종 fallback을 고정 이미지로 두면 이미지가 없는 일정도 카드 레이아웃이 깨지지 않는다.
 */
const resolveThumbnail = (schedule) =>
  schedule?.thumbnailImage?.trim() ||
  schedule?.thumbnail?.trim() ||
  schedule?.imageUrl?.trim() ||
  defaultThumbnail;

const isDefaultThumbnail = (src) => src === defaultThumbnail;

// DB/API 값은 영문 코드이고, 카드에는 사용자가 읽기 쉬운 한글 라벨을 보여준다.
const resolveGenderLimitLabel = (genderLimit) =>
  GENDER_LIMIT_LABELS[
  String(genderLimit ?? "")
    .trim()
    .toLowerCase()
  ] ?? "전체";

const resolveCategoryLabel = (category) =>
  CATEGORY_LABELS[
  String(category ?? "")
    .trim()
    .toLowerCase()
  ] ?? "기타";

const resolveRegionLabel = (region) => region?.trim() || "지역 미정";

/*
 * 모집 마감일을 카드 좌측 배지로 변환한다.
 * getDDay는 날짜 차이를 D-n/D-Day/마감으로 계산하고, 여기서는 배지 색상에 필요한 boolean까지 함께 만든다.
 */
const resolveDeadline = (recruitEndDate) => {
  const dDay = getDDay(recruitEndDate);

  if (!dDay) {
    return {
      label: "일정 미정",
      isToday: false,
      isClosed: false,
    };
  }

  if (dDay === "D-Day") {
    return {
      label: "마감 D-day",
      isToday: true,
      isClosed: false,
    };
  }

  if (dDay === "마감") {
    return {
      label: "마감",
      isToday: false,
      isClosed: true,
    };
  }

  return {
    label: "마감 " + dDay,
    isToday: false,
    isClosed: false,
  };
};

/*
 * 일정 리스트 응답은 recruitEndDate camelCase를 주지만, 일부 이전 응답이나 매퍼는 snake_case를 줄 수 있다.
 * 카드가 두 형태를 모두 이해하면 백엔드 응답 전환 중에도 화면이 덜 깨진다.
 */
const resolveDeadlineDate = (schedule) =>
  schedule?.recruitEndDate ??
  schedule?.recruit_end_date ??
  schedule?.startDate ??
  schedule?.start_date ??
  null;

/*
 * 카드 날짜는 MM.DD(요일) 형식으로 고정한다.
 * 여러 날 일정은 `시작일 → 종료일` 한 줄을 기본으로 하고, 폭이 좁으면 자연스럽게 다음 줄로 넘어가게 만든다.
 */
const resolvePeriodLabel = (startDate, endDate) => {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  const formatCardDate = (value) => value.format("MM.DD(ddd)");

  if (!start.isValid() && !end.isValid()) {
    return "일정 미정";
  }

  if (start.isValid() && !end.isValid()) {
    return formatCardDate(start);
  }

  if (!start.isValid() && end.isValid()) {
    return formatCardDate(end);
  }

  if (start.isSame(end, "day")) {
    return formatCardDate(start);
  }

  return `${formatCardDate(start)} → ${formatCardDate(end)}`;
};
const splitTextByLength = (text, size = 10) => {
  const value = String(text ?? "").trim();

  if (!value) {
    return ["제목 없는 일정"];
  }

  const chunks = [];

  for (let i = 0; i < value.length; i += size) {
    chunks.push(value.slice(i, i + size));
  }

  return chunks;
};
export default function ScheduleCard({
  schedule,
  className,
  variant = "default",
}) {
  const navigate = useNavigate();

  /*
   * ScheduleCard에 전달되는 핵심 props:
   * - schedule: 백엔드 리스트 API에서 받은 일정 데이터
   * - variant: 홈 레일(compact)과 탐색 그리드(default)의 밀도 차이
   * - className: 페이지가 카드 외부 배치만 보강할 때 사용
   */
  const thumbnailSrc = resolveThumbnail(schedule);
  const isFallbackThumbnail = isDefaultThumbnail(thumbnailSrc);
  const deadline = resolveDeadline(resolveDeadlineDate(schedule));
  const isCompact = variant === "compact";
  const descriptionText =
    schedule?.description?.trim() || "일정 소개가 아직 등록되지 않았어요.";
  const isMainTicketCard =
    String(className ?? "").includes("mainTicketCard") ||
    String(className ?? "").includes("homeMainTicketCard");

  const titleText = schedule?.title ?? "제목 없는 일정";
  const titleLines = isMainTicketCard
    ? [titleText]
    : splitTextByLength(titleText, 10);
  const categoryLabel = resolveCategoryLabel(schedule?.category);
  const regionLabel = resolveRegionLabel(schedule?.region);
  const genderLabel = resolveGenderLimitLabel(schedule?.genderLimit);
  const periodLabel = resolvePeriodLabel(
    schedule?.startDate,
    schedule?.endDate
  );
  const isBookmarked = Boolean(schedule?.isBookmarked);
  const BookmarkIcon = isBookmarked
    ? FavoriteRoundedIcon
    : FavoriteBorderRoundedIcon;

  /*
   * 카드 전체를 클릭 가능한 article로 처리한다.
   * 마우스 클릭뿐 아니라 Enter/Space 키도 지원해 키보드 접근성을 유지한다.
   */
  const handleCardClick = () => navigate(`/schedule/${schedule.id}`);

  /*
   * 외부 이미지가 삭제되었거나 URL이 깨진 경우 기본 이미지를 다시 넣는다.
   * onerror 루프를 막기 위해 핸들러를 먼저 null로 바꾼 뒤 fallback src를 지정한다.
   */
  const handleImageError = (event) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = defaultThumbnail;
  };

  return (
    <article
      className={clsx(styles.card, styles.cardInteractive, className, {
        [styles.cardCompact]: isCompact,
      })}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={clsx(styles.cardTop, isCompact && styles.cardTopCompact)}>
        <div className={styles.headerSection}>
          <div className={clsx(styles.infoRow, styles.topRow)}>
            <div className={styles.topMetaGroup}>
              <span
                className={clsx(
                  styles.softPill,
                  styles.deadlinePillBase,
                  styles.deadlinePill,
                  deadline.isToday && styles.deadlinePillToday,
                  deadline.isClosed && styles.deadlinePillClosed,
                  isCompact && styles.softPillCompact
                )}
              >
                {deadline.label}
              </span>
            </div>
            <div className={styles.topMetaActions}>
              <div className={styles.metaActionGroup}>
                <span
                  className={clsx(
                    styles.metaPill,
                    styles.genderPill,
                    isCompact && styles.metaPillCompact
                  )}
                >
                  {genderLabel}
                </span>
                {/*
                 * 카드의 하트는 액션 버튼이 아니라 "현재 저장 상태를 읽는 시각 신호"다.
                 * 상세 화면에서만 토글하므로 여기서는 pointer-events를 끄고 아이콘 전환만 반영한다.
                 */}
                <span
                  className={clsx(
                    styles.bookmarkIndicator,
                    isBookmarked && styles.bookmarkIndicatorActive
                  )}
                  aria-label={
                    isBookmarked
                      ? "위시리스트에 저장된 일정"
                      : "위시리스트에 저장되지 않은 일정"
                  }
                >
                  <BookmarkIcon className={styles.bookmarkIcon} />
                </span>
              </div>
            </div>
          </div>

          <div className={clsx(styles.infoRow, styles.dateRow)}>
            <div className={styles.dateRowContent}>
              <span className={styles.dateIconWrap} aria-hidden="true">
                <CalendarMonthIcon className={styles.dateIcon} />
              </span>
              <span
                className={clsx(
                  styles.dateText,
                  isCompact && styles.dateTextCompact
                )}
              >
                {periodLabel}
              </span>
              <span
                className={styles.dateChevronWrap}
                aria-hidden="true"
              ></span>
            </div>
          </div>

          <div className={clsx(styles.infoRow, styles.titleRow)}>
            <div className={styles.titleGroup}>
              <h3
                className={clsx(
                  styles.cardTitle,
                  isCompact && styles.cardTitleCompact
                )}
              >
                {titleLines.map((line, index) => (
                  <span key={`${line}-${index}`} className={styles.titleLine}>
                    {line}
                  </span>
                ))}
              </h3>
            </div>
          </div>

          <div className={clsx(styles.infoRow, styles.descriptionRow)}>
            <p
              className={clsx(
                styles.cardDescription,
                isCompact && styles.cardDescriptionCompact
              )}
            >
              {descriptionText}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.ticketDivider} aria-hidden="true" />

      <div
        className={clsx(
          styles.cardBottom,
          isCompact && styles.cardBottomCompact
        )}
      >
        {/*
         * 썸네일 영역의 실제 비율은 CSS module의 aspect-ratio가 담당한다.
         * 이미지 태그는 width/height 100%와 object-fit으로 박스를 채우기만 한다.
         */}
        <div
          className={clsx(
            styles.thumbnailWrap,
            isCompact && styles.thumbnailWrapCompact
          )}
        >
          <img
            src={thumbnailSrc}
            alt={schedule?.title ?? "일정 썸네일"}
            className={clsx(
              styles.thumbnail,
              isFallbackThumbnail && styles.thumbnailFallback
            )}
            onError={handleImageError}
          />
          <div className={styles.thumbnailOverlay}>
            <span
              className={clsx(
                styles.overlayPill,
                isCompact && styles.overlayPillCompact
              )}
            >
              {regionLabel}
            </span>
            <span
              className={clsx(
                styles.overlayPill,
                isCompact && styles.overlayPillCompact
              )}
            >
              {categoryLabel}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
