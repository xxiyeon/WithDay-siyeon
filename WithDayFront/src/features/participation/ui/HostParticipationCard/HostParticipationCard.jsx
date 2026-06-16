import clsx from "clsx";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import WcOutlinedIcon from "@mui/icons-material/WcOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import { PARTICIPATION_STATUS_META } from "../../model/constants";
import ParticipationStatusActions from "../ParticipationStatusActions/ParticipationStatusActions";
import styles from "../Participation.module.css";
import hostStyles from "../HostParticipationList/HostParticipationList.module.css";

const GENDER_LABELS = {
  1: "남성",
  2: "여성",
};

const resolveInitial = (nickname) => {
  /*
   * 프로필 이미지가 없는 신청자도 카드의 아바타 영역을 유지하기 위한 fallback이다.
   * 닉네임이 비어 있으면 "?"를 넣어 빈 원형만 보이는 상태를 피한다.
   */
  const trimmedNickname = String(nickname ?? "").trim();

  return trimmedNickname ? trimmedNickname.slice(0, 1) : "?";
};

const formatPhoneNumber = (phone) => {
  /*
   * 백엔드/DB에는 하이픈 없는 숫자, 이미 포맷된 문자열, 공백이 섞여 들어올 수 있다.
   * 화면에서는 한국 휴대폰 UX에 맞춰 010-0000-0000 형태를 우선 만들고,
   * 자리수가 맞지 않는 값은 원본 trim 값을 보여 운영자가 데이터를 확인할 수 있게 한다.
   */
  const normalizedPhone = String(phone ?? "").replace(/\D/g, "");

  if (!normalizedPhone) {
    return "미입력";
  }

  if (normalizedPhone.length === 11) {
    return `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 7)}-${normalizedPhone.slice(7)}`;
  }

  if (normalizedPhone.length === 10) {
    return `${normalizedPhone.slice(0, 3)}-${normalizedPhone.slice(3, 6)}-${normalizedPhone.slice(6)}`;
  }

  return phone?.trim() || "미입력";
};

const parseDateValue = (value) => {
  /*
   * 신청일은 서버 환경에 따라 "2026-05-12 12:45:47"처럼 공백 구분으로 내려올 수 있다.
   * 브라우저 Date 파서가 안정적으로 처리하도록 T 구분자로 바꾼 뒤, 실패하면 UI에서는 "-"로만 표시한다.
   */
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return null;
  }

  const parsedDate = new Date(normalizedValue.replace(" ", "T"));

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const formatCreatedAt = (value) => {
  /*
   * 신청일은 카드 밀도를 낮추기 위해 상대적으로 짧게 표시한다.
   * KST 기준 오늘이면 HH:mm만, 다른 날이면 "M월 D일"만 보여 상세 시간 노이즈를 줄인다.
   */
  const parsedDate = parseDateValue(value);

  if (!parsedDate) {
    return "-";
  }

  const todayFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const monthDayFormatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  });

  const todayToken = todayFormatter.format(new Date());
  const targetToken = todayFormatter.format(parsedDate);

  return todayToken === targetToken
    ? timeFormatter.format(parsedDate)
    : monthDayFormatter.format(parsedDate);
};

/*
 * 호스트가 일정 상세 화면에서 신청자 한 명을 관리할 때 보는 카드다.
 * ParticipationCard가 "내 일정" 관점의 카드라면,
 * 이 컴포넌트는 "호스트가 다른 사용자를 심사/관리"하는 관점의 카드다.
 *
 * 화면 흐름:
 * 1. useScheduleApplicantsQuery가 신청자 목록 조회
 * 2. mapper가 applicant row를 정규화
 * 3. HostParticipationList가 목록을 순회
 * 4. 이 카드가 신청자별 배지/버튼을 렌더링
 * 5. 버튼 클릭 시 onAction으로 ScheduleDetail에 이벤트 전달
 */
function HostParticipationCard({
  item,
  hostEmail,
  onProfileClick,
  onAction,
  isActionLoading,
  isReadOnly = false,
}) {
  /*
   * 신청자 카드도 상태별로 배지 색과 문구가 달라져야 하므로,
   * 참여 카드와 같은 메타 사전을 재사용한다.
   * 이 덕분에 같은 상태(PENDING, APPROVED 등)는 화면 위치가 달라도 일관된 색/텍스트를 유지한다.
  */
  const meta = PARTICIPATION_STATUS_META[item.status] ?? PARTICIPATION_STATUS_META.default;
  /*
   * gender/fullAge/phone은 호스트 전용 applicants API에서만 내려오는 개인정보다.
   * 일반 상세 응답에는 포함되지 않으므로 이 카드 밖으로 표시 로직을 옮기면 권한 경계가 흐려질 수 있다.
   */
  const genderLabel = GENDER_LABELS[Number(item.gender)] ?? "미입력";
  const phoneLabel = formatPhoneNumber(item.phone);
  const fullAgeLabel =
    item.fullAge !== null &&
    item.fullAge !== undefined &&
    item.fullAge !== "" &&
    Number.isFinite(Number(item.fullAge))
      ? `만 ${item.fullAge}세`
      : "확인 불가";
  const createdAtLabel = formatCreatedAt(item.createdAt);
  const canOpenProfile = Boolean(onProfileClick && item.email?.trim());

  const handleOpenProfile = () => {
    if (!canOpenProfile) {
      return;
    }

    onProfileClick(item.email);
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.tags}>
          <span className={styles.categoryBadge}>신청자</span>
          <span className={clsx(styles.statusBadge, styles[meta.badgeClass])}>
            {meta.badgeText}
          </span>
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={hostStyles.profileHeader}>
          {canOpenProfile ? (
            <button
              type="button"
              className={`${hostStyles.profileAction} ${hostStyles.avatarButton}`}
              onClick={handleOpenProfile}
              aria-label={`${item.nickname || item.email} 프로필 보기`}
            >
              <div className={hostStyles.avatar} aria-hidden="true">
                {item.profileImage?.trim() ? (
                  <img src={item.profileImage} alt="" />
                ) : (
                  <span>{resolveInitial(item.nickname)}</span>
                )}
              </div>
            </button>
          ) : (
            <div className={hostStyles.avatar} aria-hidden="true">
              {item.profileImage?.trim() ? (
                <img src={item.profileImage} alt="" />
              ) : (
                <span>{resolveInitial(item.nickname)}</span>
              )}
            </div>
          )}

          <div className={hostStyles.profileSummary}>
            {/*
              닉네임만 간결하게 보여준다.
              이전 보조 설명 문구는 카드 밀도를 높이고 개인정보 영역을 과하게 설명해 제거했다.
            */}
            {canOpenProfile ? (
              <button
                type="button"
                className={`${hostStyles.profileAction} ${hostStyles.nameButton}`}
                onClick={handleOpenProfile}
                aria-label={`${item.nickname || item.email} 마이페이지로 이동`}
              >
                <h3 className={`${styles.cardTitle} ${hostStyles.participantName}`}>
                  {item.nickname}
                </h3>
              </button>
            ) : (
              <h3 className={styles.cardTitle}>{item.nickname}</h3>
            )}
          </div>
        </div>

        <dl className={hostStyles.detailGrid}>
          <div className={hostStyles.detailItem}>
            <dt>
              <EmailOutlinedIcon fontSize="small" className={styles.inlineIcon} />
              이메일
            </dt>
            <dd>{item.email || "-"}</dd>
          </div>

          <div className={hostStyles.detailItem}>
            <dt>
              <PhoneOutlinedIcon fontSize="small" className={styles.inlineIcon} />
              전화번호
            </dt>
            <dd>{phoneLabel}</dd>
          </div>

          <div className={hostStyles.detailItem}>
            <dt>
              <WcOutlinedIcon fontSize="small" className={styles.inlineIcon} />
              성별
            </dt>
            <dd>{genderLabel}</dd>
          </div>

          <div className={hostStyles.detailItem}>
            <dt>
              <CakeOutlinedIcon fontSize="small" className={styles.inlineIcon} />
              나이
            </dt>
            <dd>{fullAgeLabel}</dd>
          </div>

          <div className={hostStyles.detailItem}>
            <dt>
              <AccessTimeOutlinedIcon fontSize="small" className={styles.inlineIcon} />
              신청일
            </dt>
            <dd>{createdAtLabel}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.divider} />

      <div className={styles.cardFooter}>
        {/*
         * 이 하위 컴포넌트는 현재 상태에 따라 어떤 버튼을 보여줄지를 결정한다.
         * 예를 들어 PENDING이면 승인/거절, APPROVED면 강퇴 버튼이 나온다.
         *
         * 버튼 클릭 이후 실제 체인은 아래와 같다.
         * - ParticipationStatusActions onAction 호출
         * - ScheduleDetail.handleApplicantAction 실행
         * - useUpdateParticipationStatusMutation 호출
         * - 성공 시 applicants / mySchedules / schedule-detail 캐시 invalidate
         *
         * hostEmail은 백엔드에서 "이 요청자가 일정 호스트인지" 검증할 때 사용되므로 액션 payload에 포함한다.
         */}
        <ParticipationStatusActions
          participationId={item.participationId}
          scheduleId={item.scheduleId}
          email={hostEmail}
          status={item.status}
          disabled={isActionLoading}
          isReadOnly={isReadOnly}
          onAction={onAction}
        />
      </div>
    </div>
  );
}

export default HostParticipationCard;
