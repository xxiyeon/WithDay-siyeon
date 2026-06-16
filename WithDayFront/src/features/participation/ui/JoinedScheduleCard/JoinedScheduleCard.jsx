import { memo, useMemo } from "react";
import clsx from "clsx";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import Groups2RoundedIcon from "@mui/icons-material/Groups2Rounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Button from "../../../../shared/ui/Button/Button";
import styles from "./JoinedScheduleCard.module.css";

const DEFAULT_THUMBNAIL = "/default-4.png";

const resolvePrimaryAction = (item) => {
  /*
   * 카드의 주 액션은 "사용자가 지금 가장 자연스럽게 해야 할 일"을 기준으로 고른다.
   * 호스트는 관리가 우선이고, 신청자는 승인/대기/거절/강퇴 상태에 따라 상세 이동, 취소, 내역 삭제로 갈린다.
   */
  if (item.myRole === "host") {
    return {
      key: "manage",
      label: "일정 관리",
      variant: "primary",
      icon: EditCalendarOutlinedIcon,
    };
  }

  if (item.dbStatus === "APPROVED") {
    return {
      key: "detail",
      label: "상세보기",
      variant: "accent",
      icon: VisibilityOutlinedIcon,
    };
  }

  if (item.dbStatus === "PENDING") {
    return {
      key: "cancel",
      label: "신청 취소",
      variant: "outline",
      icon: CloseRoundedIcon,
      destructive: true,
    };
  }

  if (item.dbStatus === "REJECTED" || item.dbStatus === "KICKED") {
    return {
      key: "delete",
      label: "내역 삭제",
      variant: "outline",
      icon: DeleteOutlineOutlinedIcon,
      destructive: true,
    };
  }

  return {
    key: "detail",
    label: "상세보기",
    variant: "outline",
    icon: VisibilityOutlinedIcon,
  };
};

const resolveSecondaryAction = (item) => {
  /*
   * 보조 액션은 꼭 필요한 경우에만 노출한다.
   * PENDING 상태에서는 주 액션이 "신청 취소"이므로 상세를 확인할 수 있는 두 번째 진입점을 남겨둔다.
   */
  if (item.myRole === "host") {
    return null;
  }

  if (item.dbStatus === "PENDING") {
    return {
      key: "detail",
      label: "상세보기",
      variant: "accent",
      icon: VisibilityOutlinedIcon,
    };
  }

  return null;
};

function JoinedScheduleCard({ item, onAction, isActionLoading = false }) {
  /*
   * action resolver 결과를 memoize해 렌더마다 정책 객체를 새로 만들지 않는다.
   * 버튼 정책은 item 상태에만 의존하므로 item이 바뀔 때만 다시 계산하면 된다.
   */
  const primaryAction = useMemo(() => resolvePrimaryAction(item), [item]);
  const secondaryAction = useMemo(() => resolveSecondaryAction(item), [item]);

  const renderActionButton = (action) => {
    /*
     * 액션 버튼은 카드 내부에서 공통 렌더링하지만, 실제 동작은 onAction으로 상위에 올린다.
     * MySchedulePage가 탭/상태별 mutation과 navigation을 소유해야 캐시 무효화 범위가 한 곳에 모인다.
     */
    if (!action) {
      return null;
    }

    const ActionIcon = action.icon;

    return (
      <Button
        key={action.key}
        variant={action.variant}
        size="md"
        className={clsx(styles.actionButton, {
          [styles.primaryButton]: action.key === "detail",
          [styles.manageButton]: action.key === "manage",
          [styles.dangerButton]: action.destructive,
        })}
        disabled={isActionLoading}
        onClick={(event) => {
          /*
           * 카드 전체 클릭 이벤트가 추가되더라도 버튼 클릭이 상세 이동과 중복 실행되지 않도록 전파를 끊는다.
           * action.key만 넘기면 상위가 item 상태와 함께 최종 흐름을 결정한다.
           */
          event.stopPropagation();
          onAction(item, action.key);
        }}
        aria-label={`${item.title} ${action.label}`}
      >
        <ActionIcon fontSize="small" />
        {action.label}
      </Button>
    );
  };

  return (
    <article
      className={clsx(styles.card, {
        [styles.cardDisabled]:
          item.dbStatus === "REJECTED" || item.dbStatus === "KICKED",
      })}
      aria-label={`${item.title} 일정 카드`}
    >
      <div className={styles.thumbnailWrap}>
        <img
          src={item.thumbnailSrc || DEFAULT_THUMBNAIL}
          alt={`${item.title} 썸네일`}
          className={styles.thumbnail}
          loading="lazy"
          onError={(event) => {
            /*
             * 외부 이미지 URL 만료나 삭제로 로드가 실패해도 카드 높이를 유지해야 한다.
             * 썸네일이 없을 때도 동일한 기본 이미지를 보여주고, 깨진 이미지가 반복 로드되지 않도록 onerror를 먼저 끊는다.
             */
            event.currentTarget.onerror = null;
            event.currentTarget.src = DEFAULT_THUMBNAIL;
          }}
        />
      </div>

      <div className={styles.content}>
        <div className={styles.topRow}>
          <div className={styles.badgeGroup}>
            <span className={styles.categoryBadge}>{item.category}</span>
            <span className={styles.dDayBadge}>{item.dDay}</span>
            <span
              className={clsx(
                styles.phaseBadge,
                styles[`phase-${item.schedulePhaseTone}`]
              )}
            >
              {item.schedulePhase}
            </span>
          </div>

          <span className={styles.locationPill}>
            <PlaceRoundedIcon fontSize="small" />
            {item.location}
          </span>
        </div>

        <div className={styles.titleBlock}>
          <h3 className={styles.title}>{item.title}</h3>
        </div>

        <dl className={styles.infoList}>
          {/*
            리스트 카드에서는 상세 설명을 넣지 않고 날짜와 인원만 남긴다.
            탭 목록의 목적은 "내가 어떤 상태의 일정들을 가지고 있는지"를 빠르게 훑는 것이다.
          */}
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>
              <CalendarTodayRoundedIcon fontSize="small" />
            </dt>
            <dd className={styles.infoValue}>{item.date}</dd>
          </div>
          <div className={styles.infoItem}>
            <dt className={styles.infoLabel}>
              <Groups2RoundedIcon fontSize="small" />
            </dt>
            <dd className={styles.infoValue}>
              모집된 인원 : {item.currentPeople} / {item.maxPeople}
            </dd>
          </div>
        </dl>

        <div className={styles.actions}>
          {renderActionButton(primaryAction)}
          {renderActionButton(secondaryAction)}
        </div>
      </div>
    </article>
  );
}

export default memo(JoinedScheduleCard);
