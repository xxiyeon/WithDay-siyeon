import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WcOutlinedIcon from "@mui/icons-material/WcOutlined";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

import {
  deleteRecommendedSchedule,
  getRecommendedScheduleDetail,
} from "../../features/recommended/api";
import { useAuthStore } from "../../features/auth/store/authStore";
import Button from "../../shared/ui/Button/Button";
import styles from "./RecommendedScheduleDetail.module.css";

const CATEGORY_LABELS = {
  all: "전체",
  travel: "여행",
  popup: "팝업",
  food: "식사",
  activity: "액티비티",
  culture: "문화",
  etc: "기타",
};

const COST_TYPE_LABELS = {
  per_person: "총액 1/N",
  host_covered: "호스트 부담",
  free: "무료",
  custom: "인당 고정 금액",
};

const COST_TYPE_SUB_LABELS = {
  per_person: "참여 인원 기준으로 나누어 지불",
  host_covered: "호스트가 비용을 부담하는 방식",
  free: "별도 비용 없음",
  custom: "상세 설명의 비용 기준 참고",
};

const GENDER_LABELS = {
  all: "성별 무관",
  male: "남성",
  female: "여성",
};

const DEFAULT_IMAGE = "/default-4.png";
const MAX_VISIBLE_THUMBNAILS = 3;

const formatLocation = (schedule) => {
  const region = schedule?.region?.trim() ?? "";
  const detailRegion = schedule?.detailRegion?.trim() ?? "";

  if (region && detailRegion) {
    return `${region} ${detailRegion}`;
  }

  return region || detailRegion || "장소 미정";
};

const formatPrice = (price) => {
  const safePrice = Number(price ?? 0);

  return safePrice.toLocaleString();
};

const formatAgeRange = (schedule) => {
  const ageMin = schedule?.ageMin;
  const ageMax = schedule?.ageMax;

  if (ageMin && ageMax) {
    return `${ageMin}세 ~ ${ageMax}세`;
  }

  if (ageMin) {
    return `${ageMin}세 이상`;
  }

  if (ageMax) {
    return `${ageMax}세 이하`;
  }

  return "연령 무관";
};

const getDetailCountText = (details) => {
  if (!Array.isArray(details) || details.length === 0) {
    return "상세 일정 없음";
  }

  return `${details.length}개 세부 일정`;
};

export default function RecommendedScheduleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.status === "admin";

  const parsedRecommendedId = Number(id);

  const [currentImg, setCurrentImg] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const {
    data,
    isPending: isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["recommended-schedule-detail", parsedRecommendedId],
    queryFn: () => getRecommendedScheduleDetail(parsedRecommendedId),
    enabled: Number.isFinite(parsedRecommendedId) && parsedRecommendedId > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRecommendedSchedule,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["recommended-schedules"],
      });

      navigate("/recommended-schedules", { replace: true });
    },
    onError: (error) => {
      const errorMessage =
        error?.response?.data?.message ??
        error?.response?.data ??
        "추천 일정 삭제 중 오류가 발생했습니다.";

      alert(errorMessage);
    },
  });

  const schedule = data?.recommendedSchedule;

  const details = Array.isArray(data?.detailSchedule)
    ? data.detailSchedule
    : [];

  const rawImages = Array.isArray(data?.images) ? data.images : [];

  const imageUrls = useMemo(() => {
    if (rawImages.length > 0) {
      return [...rawImages]
        .sort(
          (a, b) => Number(b?.isThumbnail ?? 0) - Number(a?.isThumbnail ?? 0),
        )
        .map((image) => image?.imageUrl)
        .filter(Boolean);
    }

    if (schedule?.thumbnailImage) {
      return [schedule.thumbnailImage];
    }

    return [DEFAULT_IMAGE];
  }, [rawImages, schedule?.thumbnailImage]);

  const safeCurrentImg =
    currentImg >= imageUrls.length ? 0 : Math.max(currentImg, 0);

  const visibleThumbnails = imageUrls.slice(0, MAX_VISIBLE_THUMBNAILS);
  const lightboxSlides = imageUrls.map((url) => ({ src: url }));

  const nextSlide = () => {
    setCurrentImg((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentImg((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const handleUseRecommendedSchedule = () => {
    navigate("/write", {
      state: {
        recommendedSchedule: data,
      },
    });
  };

  const handleEditRecommendedSchedule = () => {
    navigate(`/recommended-schedules/edit/${parsedRecommendedId}`);
  };

  const handleDeleteRecommendedSchedule = () => {
    const isConfirmed = window.confirm(
      "추천 일정을 삭제하시겠습니까?\n삭제한 추천 일정은 복구할 수 없습니다.",
    );

    if (!isConfirmed) {
      return;
    }

    deleteMutation.mutate(parsedRecommendedId);
  };

  if (!Number.isFinite(parsedRecommendedId) || parsedRecommendedId <= 0) {
    return (
      <div className={styles.container}>
        유효하지 않은 추천 일정 경로입니다.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>추천 일정을 불러오는 중입니다.</div>
    );
  }

  if (isError) {
    const errorMessage =
      error?.response?.data?.message ??
      error?.response?.data ??
      "추천 일정 정보를 불러오는 데 실패했습니다.";

    return <div className={styles.container}>{errorMessage}</div>;
  }

  if (!schedule) {
    return <div className={styles.container}>추천 일정 정보가 없습니다.</div>;
  }

  const categoryLabel =
    CATEGORY_LABELS[schedule.category] ?? schedule.category ?? "기타";

  const costTypeLabel =
    COST_TYPE_LABELS[schedule.costType] ??
    schedule.costType ??
    "정산 방식 미정";

  const costTypeSubLabel =
    COST_TYPE_SUB_LABELS[schedule.costType] ??
    "정산 방식은 글쓰기에서 조정할 수 있습니다.";

  const genderLabel =
    GENDER_LABELS[schedule.genderLimit] ?? schedule.genderLimit ?? "성별 무관";

  const locationText = formatLocation(schedule);

  const durationDays = Number(schedule.durationDays ?? 1);
  const safeDurationDays =
    Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 1;

  const minParticipants = Number(schedule.minParticipants ?? 0);
  const maxParticipants = Number(schedule.maxParticipants ?? 0);
  const priceText = `${formatPrice(schedule.totalPrice)}원`;
  const ageRangeLabel = formatAgeRange(schedule);

  return (
    <div className={styles.container}>
      <main className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            <section className={`${styles.panel} ${styles.heroCard}`}>
              <div className={styles.heroImageWrap}>
                <img
                  src={imageUrls[safeCurrentImg]}
                  alt="추천 일정 이미지"
                  className={styles.heroImage}
                  onClick={() => setIsViewerOpen(true)}
                />

                <div className={styles.heroBadges}>
                  <span className={styles.categoryBadge}>{categoryLabel}</span>
                  <span className={styles.statusOpen}>추천 일정</span>
                  <span className={styles.ddayBadge}>
                    {safeDurationDays}일 코스
                  </span>
                </div>

                <button
                  type="button"
                  className={`${styles.imageNav} ${styles.prevBtn}`}
                  onClick={prevSlide}
                  aria-label="이전 이미지"
                  disabled={imageUrls.length <= 1}
                >
                  <ChevronLeftIcon />
                </button>

                <button
                  type="button"
                  className={`${styles.imageNav} ${styles.nextBtn}`}
                  onClick={nextSlide}
                  aria-label="다음 이미지"
                  disabled={imageUrls.length <= 1}
                >
                  <ChevronRightIcon />
                </button>

                <div className={styles.imageCount}>
                  {safeCurrentImg + 1} / {imageUrls.length}
                </div>
              </div>

              <div className={styles.thumbStrip}>
                {visibleThumbnails.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    className={`${styles.thumb} ${
                      safeCurrentImg === index ? styles.thumbActive : ""
                    }`}
                    onClick={() => setCurrentImg(index)}
                    aria-label={`${index + 1}번째 이미지 보기`}
                  >
                    <img src={imageUrl} alt="" />
                  </button>
                ))}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.titleSection}`}>
              <div className={styles.titleRow}>
                <div className={styles.titleContent}>
                  <h1 className={styles.title}>
                    {schedule.title ?? "제목 없음"}
                  </h1>

                  <div className={styles.metaLine}>
                    <span>
                      <PlaceIcon fontSize="small" />
                      {locationText}
                    </span>

                    <span>
                      <CalendarTodayIcon fontSize="small" />
                      추천 {safeDurationDays}일 코스
                    </span>

                    <span>
                      <AutoAwesomeRoundedIcon fontSize="small" />
                      관리자 추천 템플릿
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <PeopleIcon className={styles.infoIcon} />
                  <p className={styles.label}>추천 인원</p>
                  <p className={styles.value}>
                    {minParticipants} ~ {maxParticipants}명
                  </p>
                  <p className={styles.subValue}>최소 {minParticipants}명</p>
                </div>

                <div className={styles.infoItem}>
                  <WcOutlinedIcon className={styles.infoIcon} />
                  <p className={styles.label}>성별</p>
                  <p className={styles.value}>{genderLabel}</p>
                </div>

                <div className={styles.infoItem}>
                  <CakeOutlinedIcon className={styles.infoIcon} />
                  <p className={styles.label}>연령</p>
                  <p className={styles.value}>{ageRangeLabel}</p>
                </div>

                <div className={styles.infoItem}>
                  <PaymentsIcon className={styles.infoIcon} />
                  <p className={styles.label}>예상 비용</p>
                  <p className={styles.value}>{priceText}</p>
                </div>

                <div className={styles.infoItem}>
                  <ReceiptLongOutlinedIcon className={styles.infoIcon} />
                  <p className={styles.label}>정산 방식</p>
                  <p className={styles.value}>{costTypeLabel}</p>
                </div>
              </div>
            </section>

            <section className={`${styles.panel} ${styles.contentSection}`}>
              <div className={styles.contentBlock}>
                <h2 className={styles.subTitle}>상세 설명</h2>

                <p className={styles.descriptionText}>
                  {schedule.description || "상세 설명이 없습니다."}
                </p>
              </div>

              {details.length > 0 && (
                <div className={styles.contentBlock}>
                  <h2 className={styles.subTitle}>Day-by-Day</h2>

                  <div className={styles.dailyPlanList}>
                    {details.map((detail, index) => (
                      <article
                        key={detail.id ?? `${detail.dayNumber}-${index}`}
                        className={styles.dayCard}
                      >
                        <span className={styles.dayNumber}>
                          Day {detail.dayNumber ?? index + 1}
                        </span>

                        <div className={styles.dayContent}>
                          <h3 className={styles.planTitle}>
                            {detail.title || "제목 없음"}
                          </h3>

                          <p className={styles.planDesc}>
                            {detail.description || "설명이 없습니다."}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.panel} ${styles.hostPanel}`}>
              <div className={styles.recommendAvatar}>
                <AutoAwesomeRoundedIcon />
              </div>

              <div className={styles.hostText}>
                <span className={styles.hostBadge}>WithDay 추천 일정</span>
                <strong className={styles.hostName}>추천 템플릿</strong>
                <p className={styles.hostMeta}>
                  관리자가 미리 구성한 일정입니다. 실제 날짜와 모집 기간은
                  글쓰기 화면에서 직접 설정합니다.
                </p>
              </div>
            </section>

            <section className={`${styles.panel} ${styles.noticePanel}`}>
              <AutoAwesomeRoundedIcon className={styles.noticeIcon} />

              <div>
                <h2 className={styles.noticeTitle}>추천 일정 사용 안내</h2>
                <p className={styles.chatLinkNotice}>
                  제목, 설명, 지역, 인원, 정산 정보가 글쓰기 화면에 자동으로
                  채워집니다. 오픈채팅 링크와 상세 일정은 직접 입력합니다.
                </p>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.subTitle}>추천 일정 요약</h2>
              </div>

              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span>추천 기간</span>
                  <strong>{safeDurationDays}일 코스</strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>지역</span>
                  <strong>{locationText}</strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>추천 인원</span>
                  <strong>
                    {minParticipants} ~ {maxParticipants}명
                  </strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>예상 비용</span>
                  <strong>{priceText}</strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>정산 방식</span>
                  <strong>{costTypeLabel}</strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>세부 일정</span>
                  <strong>{getDetailCountText(details)}</strong>
                </div>
              </div>

              <div className={styles.summaryActions}>
                <Button
                  variant="accent"
                  size="md"
                  onClick={handleUseRecommendedSchedule}
                  className={styles.summaryButton}
                >
                  추천 일정 사용하기
                </Button>

                <p className={styles.summaryApplyMessage}>
                  이 추천 일정을 기반으로 직접 모집글을 작성할 수 있습니다.
                </p>
              </div>
            </section>

            {isAdmin && (
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subTitle}>추천 일정 관리</h2>
                </div>

                <p className={styles.executionNotice}>
                  관리자에게만 표시되는 영역입니다.
                </p>

                <div className={styles.hostActionGrid}>
                  <Button
                    variant="outline"
                    onClick={handleEditRecommendedSchedule}
                  >
                    수정
                    <EditIcon fontSize="small" />
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleDeleteRecommendedSchedule}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "삭제 중" : "삭제"}
                    <DeleteIcon fontSize="small" />
                  </Button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      <Lightbox
        open={isViewerOpen}
        close={() => setIsViewerOpen(false)}
        slides={lightboxSlides}
        index={safeCurrentImg}
        plugins={[Zoom]}
      />
    </div>
  );
}
