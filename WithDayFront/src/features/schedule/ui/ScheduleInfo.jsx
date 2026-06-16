import clsx from "clsx";
import { formatDate } from "../../../shared/lib/dateUtile";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  SCHEDULE_STATUS,
  getScheduleStatusLabel,
  normalizeScheduleStatus,
} from "../model/constants";
import styles from "../../../page/schedule/ScheduleDetail.module.css";

const CATEGORY_MAP = {
  all: "전체",
  travel: "여행",
  popup: "팝업",
  food: "식사",
  activity: "액티비티",
  culture: "문화",
  etc: "기타",
};

const costTypeMap = {
  per_person: "총액 1/N",
  host_covered: "호스트 부담",
  free: "무료",
  custom: "인당 고정 금액",
};

export default function ScheduleInfo({ schedule }) {
  const normalizedStatus = normalizeScheduleStatus(schedule?.status);
  const statusLabel = getScheduleStatusLabel(normalizedStatus);
  const statusClassName =
    normalizedStatus === SCHEDULE_STATUS.COMPLETED
      ? styles.statusInProgress
      : normalizedStatus === SCHEDULE_STATUS.RECRUITING
        ? styles.statusOpen
        : styles.statusClosed;

  return (
    <div className={styles.contentWrapper}>
      {/* 2. 제목 및 요약 정보 */}
      <section className={styles.headerSection}>
        <div className={styles.badgeWrapper}>
          <span className={styles.categoryBadge}>
            {CATEGORY_MAP[schedule.category] || schedule.category}
          </span>
          <span
            className={clsx(statusClassName)}
          >
            {statusLabel}
          </span>
        </div>
        <h1 className={styles.title}>{schedule.title}</h1>
        <div className={styles.metaInfo}>
          <span>
            <VisibilityIcon fontSize="small" /> {schedule.viewCount}
          </span>
          <span>
            <PlaceIcon fontSize="small" /> {schedule.region}
          </span>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* 3. 상세 조건 */}
      <section className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <CalendarTodayIcon className={styles.icon} />
          <div>
            <p className={styles.label}>일정 기간</p>
            <p className={styles.value}>
              {formatDate(schedule.startDate)} ~ {formatDate(schedule.endDate)}
            </p>
          </div>
        </div>
        <div className={styles.infoItem}>
          <PeopleIcon className={styles.icon} />
          <div>
            <p className={styles.label}>모집 인원 / 조건</p>
            <p className={styles.value}>
              {schedule.currentParticipants} / {schedule.maxParticipants}명
              (최소 {schedule.minParticipants}명)
            </p>
            <p className={styles.subValue}>
              {schedule.genderLimit === "all"
                ? "성별 무관"
                : schedule.genderLimit}{" "}
              | {schedule.ageMin}세 ~ {schedule.ageMax}세
            </p>
          </div>
        </div>
        <div className={styles.infoItem}>
          <PaymentsIcon className={styles.icon} />
          <div>
            <p className={styles.label}>예상 비용</p>
            <p className={styles.value}>
              총{" "}
              {schedule.totalPrice ? schedule.totalPrice.toLocaleString() : 0}원
            </p>
            <p className={styles.subValue}>
              정산 방식: {costTypeMap[schedule.costType] || schedule.costType}
            </p>
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* 4. 본문 상세 설명 */}
      <section className={styles.descriptionSection}>
        <h2 className={styles.subTitle}>상세 설명</h2>
        <p
          className={styles.descriptionText}
          style={{ whiteSpace: "pre-wrap" }}
        >
          {schedule.description}
        </p>
      </section>
    </div>
  );
}
