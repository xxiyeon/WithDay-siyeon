import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import PlaceIcon from "@mui/icons-material/Place";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import ChatBubbleOutlineOutlinedIcon from "@mui/icons-material/ChatBubbleOutlineOutlined";
import PeopleIcon from "@mui/icons-material/People";
import PaymentsIcon from "@mui/icons-material/Payments";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import WcOutlinedIcon from "@mui/icons-material/WcOutlined";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

import {
  createBookmark,
  deleteBookmark as deleteBookmarkApi,
  completeSchedule,
  rollbackCompletedSchedule,
  cancelSchedule,
  fetchScheduleDetail,
  incrementScheduleViewCount,
  deleteSchedule,
} from "../../features/schedule/api";
import { useAuthStore } from "../../features/auth/store/authStore";
import { useScheduleApplicantsQuery } from "../../features/participation/model/queries";
import { useUpdateParticipationStatusMutation } from "../../features/participation/model/mutations";
import ParticipationFeedback from "../../features/participation/ui/ParticipationFeedback/ParticipationFeedback";
import HostParticipationList from "../../features/participation/ui/HostParticipationList/HostParticipationList";
import {
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
  getScheduleStatusLabel,
} from "../../features/schedule/model/constants";
import { useScheduleApplyAction } from "../../features/schedule/model/useScheduleApplyAction";
import Button from "../../shared/ui/Button/Button";
import NotFoundPage from "../not-found/NotFoundPage";
import styles from "./ScheduleDetail.module.css";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

/*
 * 서버 category code를 상세 화면의 짧은 배지 문구로 바꾼다.
 * API에 새 category가 먼저 추가되더라도 아래 렌더 단계에서 원본 값 fallback을 쓰므로 화면이 깨지지 않는다.
 */
const CATEGORY_LABELS = {
  all: "전체",
  travel: "여행",
  popup: "팝업",
  food: "식사",
  activity: "액티비티",
  culture: "문화",
  etc: "기타",
};

/*
 * 비용 정산 방식은 사용자 의사결정에 직접 영향을 주는 정보라 제목 영역의 핵심 정보 그리드에서 보여준다.
 * 서버 enum과 화면 문구를 여기서만 연결해두면 이후 정산 정책 문구가 바뀌어도 JSX를 건드리지 않아도 된다.
 */
const COST_TYPE_LABELS = {
  per_person: "총액 1/N",
  host_covered: "호스트 부담",
  free: "무료",
  custom: "인당 고정 금액",
};

const DEFAULT_HOST_PROFILE_IMAGE = "/default-4.png";

/*
 * 이미지가 없는 일정도 hero 영역의 높이와 레이아웃이 무너지면 안 된다.
 * 실제 API 이미지가 없을 때만 쓰는 마지막 fallback이며, 더미 참여자/더미 정보와 달리 레이아웃 안전장치 역할만 한다.
 */
const DEFAULT_IMAGE = "/default-4.png";
const VIEWED_SCHEDULE_STORAGE_KEY_PREFIX = "viewed_schedule_";
const MAX_VISIBLE_THUMBNAILS = 3;
/*
 * 신청자 필터의 상태값은 백엔드 ParticipationStatus enum과 같은 표준값을 쓴다.
 * 화면 문구만 여기서 바꾸고 status 자체는 API 파라미터로 그대로 보내야 상태별 query cache가 정확히 분리된다.
 */
const HOST_STATUS_LABELS = {
  PENDING: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "거절",
  CANCELED: "참여 취소",
  KICKED: "강퇴",
};

const resolveInitial = (value) => {
  /*
   * 호스트/참여자 프로필 이미지가 없을 때 원형 아바타에 넣을 첫 글자를 만든다.
   * 빈 값이면 "?"를 반환해 avatar 크기와 정렬이 유지되도록 한다.
   */
  const normalizedValue = value?.trim?.() ?? "";
  return normalizedValue ? normalizedValue.charAt(0).toUpperCase() : "?";
};

const normalizeEmail = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const getApplicantEmail = (applicant) => {
  return (
    applicant?.email ??
    applicant?.userEmail ??
    applicant?.applicantEmail ??
    applicant?.memberEmail ??
    ""
  );
};

const isSameEmail = (left, right) => {
  const normalizedLeft = normalizeEmail(left);
  const normalizedRight = normalizeEmail(right);

  return (
    normalizedLeft !== "" &&
    normalizedRight !== "" &&
    normalizedLeft === normalizedRight
  );
};

const formatGenderLimit = (genderLimit) => {
  /*
   * schedule.genderLimit은 참여 가능 조건이므로 원본 enum을 그대로 노출하지 않는다.
   * 모르는 값은 서버에서 새 정책이 내려온 상황일 수 있어 값 자체를 fallback으로 보여 디버깅 단서를 남긴다.
   */
  if (genderLimit === "all") {
    return "성별 무관";
  }

  if (genderLimit === "male") {
    return "남성";
  }

  if (genderLimit === "female") {
    return "여성";
  }

  return genderLimit || "미정";
};

const formatAgeRange = (ageMin, ageMax) => {
  /*
   * 연령 조건은 min/max가 각각 선택 입력일 수 있다.
   * 둘 중 하나만 있어도 조건 의미가 달라지므로 "이상/이하/무관"을 명확히 분기한다.
   */
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

const formatDDay = (dateValue) => {
  /*
   * 모집 마감 D-day는 hero badge와 하단 sticky CTA에서 함께 사용된다.
   * 날짜가 비어 있거나 파싱 실패하면 확정된 마감처럼 보이지 않도록 "마감 미정"으로 통일한다.
   */
  if (!dateValue) {
    return "마감 미정";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(dateValue);
  targetDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(targetDate.getTime())) {
    return "마감 미정";
  }

  const diffDays = Math.ceil(
    (targetDate.getTime() - today.getTime()) / 86400000,
  );

  if (diffDays < 0) {
    return "마감";
  }

  if (diffDays === 0) {
    return "D-Day";
  }

  return `D-${diffDays}`;
};

const formatLocation = (schedule) => {
  /*
   * 지역과 상세 지역은 API에서 따로 오지만 화면에서는 하나의 장소 문장으로 읽힌다.
   * 둘 중 하나만 있는 일정도 많으므로 공백만 남지 않도록 trim 후 조합한다.
   */
  const region = schedule?.region?.trim() ?? "";
  const detailRegion = schedule?.detailRegion?.trim() ?? "";

  if (region && detailRegion) {
    return `${region} ${detailRegion}`;
  }

  return region || detailRegion || "장소 미정";
};

/*
 * 상세 상단 배지에 보여줄 일정 상태 문구를 계산한다.
 * 정책상 schedule.status가 가장 우선이고, 날짜는 recruiting 일정이 이미 지났는데 상태 정리가 늦었을 때만 보조적으로 쓴다.
 */
const resolveSchedulePhase = (schedule) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizedStatus = schedule?.status?.trim()?.toLowerCase() ?? "";

  const startDate = schedule?.startDate ? new Date(schedule.startDate) : null;
  const endDate = schedule?.endDate ? new Date(schedule.endDate) : null;
  const recruitEndDate = schedule?.recruitEndDate
    ? new Date(schedule.recruitEndDate)
    : null;

  if (startDate) {
    startDate.setHours(0, 0, 0, 0);
  }

  if (endDate) {
    endDate.setHours(0, 0, 0, 0);
  }

  if (recruitEndDate) {
    recruitEndDate.setHours(0, 0, 0, 0);
  }

  if (normalizedStatus === SCHEDULE_STATUS.CANCELED) {
    return {
      label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CANCELED],
      className: styles.statusClosed,
    };
  }

  if (normalizedStatus === SCHEDULE_STATUS.COMPLETED) {
    return {
      label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.COMPLETED],
      className: styles.statusInProgress,
    };
  }

  if (
    normalizedStatus === SCHEDULE_STATUS.CLOSED ||
    (recruitEndDate instanceof Date &&
      !Number.isNaN(recruitEndDate.getTime()) &&
      recruitEndDate < today)
  ) {
    return {
      label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CLOSED],
      className: styles.statusClosed,
    };
  }

  if (
    endDate instanceof Date &&
    !Number.isNaN(endDate.getTime()) &&
    endDate < today
  ) {
    return {
      label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.COMPLETED],
      className: styles.statusInProgress,
    };
  }

  if (
    startDate instanceof Date &&
    !Number.isNaN(startDate.getTime()) &&
    startDate <= today &&
    (!(endDate instanceof Date) ||
      Number.isNaN(endDate.getTime()) ||
      endDate >= today)
  ) {
    return {
      label: getScheduleStatusLabel(
        schedule?.status ?? SCHEDULE_STATUS.RECRUITING,
      ),
      className: styles.statusOpen,
    };
  }

  return {
    label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.RECRUITING],
    className: styles.statusOpen,
  };
};

/*
 * optimistic update는 "클릭 직후 손맛"을 만들지만,
 * 상세만 바꾸고 홈/탐색/위시리스트 캐시를 놓치면 화면마다 하트 상태가 어긋나는 문제가 생긴다.
 * 그래서 이 파일은 각 캐시 shape에 맞는 작은 updater를 분리해 같은 토글 결과를 여러 query에 일관되게 반영한다.
 */
const updateScheduleSummaryBookmarkState = (
  schedule,
  targetScheduleId,
  isBookmarked,
) => {
  if (!schedule || Number(schedule?.id) !== Number(targetScheduleId)) {
    return schedule;
  }

  return {
    ...schedule,
    isBookmarked,
  };
};

const updateScheduleCollectionBookmarkState = (
  schedules,
  targetScheduleId,
  isBookmarked,
) => {
  if (!Array.isArray(schedules)) {
    return schedules;
  }

  return schedules.map((schedule) =>
    updateScheduleSummaryBookmarkState(
      schedule,
      targetScheduleId,
      isBookmarked,
    ),
  );
};

const updateScheduleDetailBookmarkState = (detailData, isBookmarked) => {
  if (!detailData) {
    return detailData;
  }

  return {
    ...detailData,
    isBookmarked,
    schedule: detailData.schedule
      ? {
          ...detailData.schedule,
          isBookmarked,
        }
      : detailData.schedule,
  };
};

const buildWishlistScheduleFromDetail = (detailData) => {
  if (!detailData?.schedule) {
    return null;
  }

  return {
    ...detailData.schedule,
    isBookmarked: true,
  };
};

const updateBookmarkedSchedulesCache = (
  schedules,
  targetScheduleId,
  isBookmarked,
  detailData,
) => {
  if (!Array.isArray(schedules)) {
    return schedules;
  }

  if (!isBookmarked) {
    return schedules.filter(
      (schedule) => Number(schedule?.id) !== Number(targetScheduleId),
    );
  }

  const bookmarkedSchedule = buildWishlistScheduleFromDetail(detailData);
  const hasSchedule = schedules.some(
    (schedule) => Number(schedule?.id) === Number(targetScheduleId),
  );

  if (!hasSchedule) {
    return bookmarkedSchedule ? [bookmarkedSchedule, ...schedules] : schedules;
  }

  return schedules.map((schedule) =>
    updateScheduleSummaryBookmarkState(schedule, targetScheduleId, true),
  );
};

export default function ScheduleDetail() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { user: authUser, isLoggedIn } = useAuthStore();

  const [feedback, setFeedback] = useState(null);
  const [currentImg, setCurrentImg] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const chatLinkSectionRef = useRef(null);
  const [viewCountReadyScheduleId, setViewCountReadyScheduleId] =
    useState(null);
  const [open, setOpen] = useState(false);
  const [applicantStatus, setApplicantStatus] = useState("APPROVED");
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  /*
   * 참여 기능에서 email은 API 권한 확인과 사용자별 상태 조회의 기준으로 쓰인다.
   * authStore의 user가 아직 준비되지 않았을 수 있으므로 빈 문자열 fallback을 두고, query enabled 조건에서 안전하게 제어한다.
   */
  const authEmail = authUser?.email?.trim() ?? "";
  const parsedScheduleId = Number(scheduleId);
  const navigateToMyPage = useCallback(
    (email) => {
      const normalizedEmail = email?.trim?.() ?? "";

      if (!normalizedEmail) {
        return;
      }

      navigate(`/mypage/${encodeURIComponent(normalizedEmail)}`);
    },
    [navigate],
  );
  /*
   * 상세 query key에 email을 포함하는 이유는 같은 일정이라도 viewer별 응답이 다르기 때문이다.
   * viewerIsHost, viewerParticipationStatus, viewerCanAccessChatLink가 모두 사용자 권한에 따라 달라진다.
   */
  const detailQueryKey = [
    "schedule-detail",
    parsedScheduleId,
    authEmail || "guest",
  ];

  useEffect(() => {
    if (!Number.isFinite(parsedScheduleId) || parsedScheduleId <= 0) {
      return;
    }

    let isMounted = true;

    /*
     * 예전 코드에서 email 없는 schedule-detail key를 사용했던 캐시가 남아 있으면
     * 게스트/로그인 사용자 권한 정보가 섞일 수 있어 legacy key를 진입 시 정리한다.
     */
    queryClient.removeQueries({
      queryKey: ["schedule-detail", parsedScheduleId],
      exact: true,
    });

    /*
     * 한 세션에서 같은 상세를 여러 번 열 때마다 조회수를 올리면 사용자의 뒤로가기/새로고침이 조회수로 과대 반영된다.
     * sessionStorage는 브라우저 세션 단위의 UX 보정이며, 실제 조회수 증가는 서버 API가 담당한다.
     */
    const viewedScheduleStorageKey = `${VIEWED_SCHEDULE_STORAGE_KEY_PREFIX}${parsedScheduleId}`;
    const hasViewedSchedule =
      typeof window !== "undefined" &&
      window.sessionStorage.getItem(viewedScheduleStorageKey) === "true";

    if (hasViewedSchedule) {
      queueMicrotask(() => {
        /*
         * 조회수 증가 실패가 상세 조회 자체를 막으면 사용자는 일정을 볼 수 없게 된다.
         * 실패 여부와 무관하게 detail query를 열어, 조회수는 부가 기능으로만 취급한다.
         */
        if (isMounted) {
          setViewCountReadyScheduleId(parsedScheduleId);
        }
      });

      return () => {
        isMounted = false;
      };
    }

    const increaseViewCount = async () => {
      try {
        await incrementScheduleViewCount(parsedScheduleId);

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(viewedScheduleStorageKey, "true");
        }
      } catch (requestError) {
        if (import.meta.env.DEV) {
          console.debug(
            "[schedule-detail] view count increment failed",
            requestError,
          );
        }
      } finally {
        if (isMounted) {
          setViewCountReadyScheduleId(parsedScheduleId);
        }
      }
    };

    increaseViewCount();

    return () => {
      isMounted = false;
    };
  }, [parsedScheduleId, queryClient]);

  const {
    data,
    isPending: isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => fetchScheduleDetail(parsedScheduleId, authEmail),
    /*
     * 상세 조회는 조회수 증가가 끝난 뒤 실행한다.
     * 같은 schedule-detail 응답 안에 viewerParticipationStatus와 viewerIsHost가 포함되므로,
     * 참여 버튼 라벨과 호스트 신청자 관리 영역도 이 query 결과를 기준으로 렌더링된다.
     */
    enabled:
      Number.isFinite(parsedScheduleId) &&
      parsedScheduleId > 0 &&
      viewCountReadyScheduleId === parsedScheduleId,
    staleTime: 0,
  });

  /*
   * viewerIsHost는 사이드바 전체 구조를 바꾸는 핵심 권한 값이다.
   * true이면 신청자 개인정보 조회/호스트 관리/승인 참여자 요약을 열고, false이면 공개 가능한 호스트 프로필만 보여준다.
   */
  const viewerIsHost = Boolean(data?.viewerIsHost);
  const viewerIsAdmin = Boolean(data?.viewerIsAdmin);

  /*
   * 호스트 전용 신청자 목록 조회다.
   * viewerIsHost가 true일 때만 enabled가 열리므로, 일반 참여자는 신청자 개인정보 조회 API를 호출하지 않는다.
   * applicantStatus는 PENDING/APPROVED/REJECTED/CANCELED/KICKED 탭 필터 역할을 한다.
   */
  const {
    data: applicants = [],
    isPending: isApplicantsLoading,
    error: applicantsError,
  } = useScheduleApplicantsQuery({
    scheduleId: parsedScheduleId,
    email: authEmail,
    status: applicantStatus,
    enabled: viewerIsHost,
  });

  const {
    data: approvedApplicants = [],
    isPending: isApprovedApplicantsLoading,
  } = useScheduleApplicantsQuery({
    scheduleId: parsedScheduleId,
    email: authEmail,
    status: "APPROVED",
    enabled: viewerIsHost,
  });
  /*
   * 위 query와 별도로 APPROVED를 한 번 더 조회하는 이유는,
   * 현재 필터가 PENDING/REJECTED 등으로 바뀌어도 승인 참여자 아바타 요약은 항상 유지되어야 하기 때문이다.
   * 별도 API를 만들지 않고 같은 applicants endpoint를 status만 바꿔 재사용한다.
   */

  const { updateParticipationStatus, isPending: isStatusUpdating } =
    useUpdateParticipationStatusMutation();

  /*
   * 이 상세 페이지는 참여/실행/북마크 등 여러 액션이 같은 토스트 surface를 공유한다.
   * 공통 helper로 감싸 두면 동일 문구가 연속으로 와도 key가 바뀌어 Snackbar가 새 알림으로 다시 열린다.
   */
  const showFeedback = useCallback((severity, message) => {
    setFeedback({
      id: Date.now(),
      severity,
      message,
    });
  }, []);

  useEffect(() => {
    if (location.state?.focusSection !== "chat-link") {
      return;
    }

    chatLinkSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  /*
   * 일정 실행/실행 취소, 참여 상태 변경, 삭제 같은 여러 API가 서로 다른 에러 shape를 줄 수 있어서
   * 화면에서는 이 helper로 문자열을 한 번 정규화해 공통 Snackbar로 보낸다.
   * 이렇게 해두면 각 버튼 핸들러가 에러 파싱 코드를 중복해서 들고 있지 않아도 된다.
   */
  const resolveRequestErrorMessage = useCallback(
    (requestError, fallbackMessage) => {
      const responseData = requestError?.response?.data;

      if (
        typeof responseData?.message === "string" &&
        responseData.message.trim()
      ) {
        return responseData.message;
      }

      if (typeof responseData === "string" && responseData.trim()) {
        return responseData;
      }

      if (
        typeof requestError?.message === "string" &&
        requestError.message.trim()
      ) {
        return requestError.message;
      }

      return fallbackMessage;
    },
    [],
  );

  const { mutateAsync: executeSchedule, isPending: isCompletingSchedule } =
    useMutation({
      mutationFn: completeSchedule,
      onSuccess: async () => {
        /*
         * 실행 상태 전환은 상세 화면 하나만 바뀌는 일이 아니다.
         * - 상세: 호스트 버튼, 상태 배지, 참여 버튼 제약이 바뀜
         * - 탐색/홈: 공개 리스트에서 상태 라벨이 바뀔 수 있음
         * - 내 일정/신청자 관리: 진행 상태 문구와 제약이 달라짐
         *
         * 그래서 schedule-detail만 invalidate하면 다른 화면이 오래된 상태로 남을 수 있어 관련 캐시를 함께 무효화한다.
         */
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["schedule-detail", parsedScheduleId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["schedules"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["home-schedules"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["participation"],
          }),
        ]);
      },
    });

  const {
    mutateAsync: rollbackScheduleExecution,
    isPending: isRollbackPending,
  } = useMutation({
    mutationFn: rollbackCompletedSchedule,
    onSuccess: async () => {
      /*
       * 실행 취소도 실행과 같은 범위의 화면에 영향을 준다.
       * 특히 completed에서 recruiting/closed로 돌아가면 참여 버튼이 다시 열리거나 계속 막혀야 하므로
       * 상세/목록/내 일정 캐시를 한 번에 갱신한다.
       */
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["schedule-detail", parsedScheduleId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["schedules"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["home-schedules"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["participation"],
        }),
      ]);
    },
  });

  const { mutateAsync: cancelHostSchedule, isPending: isCancelingSchedule } =
    useMutation({
      mutationFn: cancelSchedule,
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["schedule-detail", parsedScheduleId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["schedules"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["home-schedules"],
          }),
          queryClient.invalidateQueries({
            queryKey: ["participation"],
          }),
        ]);
      },
    });

  /*
   * 참여 CTA 로직은 별도 hook에서 돌리고, 토스트 표시는 상세 페이지에서 공통으로 처리한다.
   * 이렇게 해야 신청 성공/실패와 호스트 승인/거절 피드백이 같은 Snackbar 위치와 스타일을 공유한다.
   */
  const handleApplyFeedback = useCallback(({ message, severity, id }) => {
    setFeedback({
      id: id ?? Date.now(),
      message,
      severity,
    });
  }, []);

  /*
   * 북마크 토글은 상세 화면 하나만 바꾸면 끝나지 않는다.
   * 홈 추천, 탐색 목록, 위시리스트 목록이 모두 같은 일정의 저장 상태를 보여주므로,
   * onMutate에서 이 캐시들을 함께 반전해야 사용자가 어느 화면으로 돌아가도 일관된 하트 상태를 본다.
   */
  const { mutateAsync: toggleBookmark, isPending: isBookmarkPending } =
    useMutation({
      mutationFn: async (nextIsBookmarked) => {
        if (nextIsBookmarked) {
          return createBookmark(parsedScheduleId);
        }

        return deleteBookmarkApi(parsedScheduleId);
      },
      onMutate: async (nextIsBookmarked) => {
        await Promise.all([
          queryClient.cancelQueries({ queryKey: detailQueryKey }),
          queryClient.cancelQueries({ queryKey: ["home-schedules"] }),
          queryClient.cancelQueries({ queryKey: ["schedules"] }),
          queryClient.cancelQueries({ queryKey: ["bookmarks", authEmail] }),
        ]);

        const previousDetail = queryClient.getQueryData(detailQueryKey);
        const previousHomeQueries = queryClient.getQueriesData({
          queryKey: ["home-schedules"],
        });
        const previousScheduleQueries = queryClient.getQueriesData({
          queryKey: ["schedules"],
        });
        const previousBookmarks = queryClient.getQueryData([
          "bookmarks",
          authEmail,
        ]);
        const detailSnapshot = previousDetail ?? data;

        queryClient.setQueryData(detailQueryKey, (old) =>
          updateScheduleDetailBookmarkState(old ?? data, nextIsBookmarked),
        );

        previousHomeQueries.forEach(([queryKey]) => {
          queryClient.setQueryData(queryKey, (old) =>
            updateScheduleCollectionBookmarkState(
              old,
              parsedScheduleId,
              nextIsBookmarked,
            ),
          );
        });

        previousScheduleQueries.forEach(([queryKey]) => {
          queryClient.setQueryData(queryKey, (old) =>
            updateScheduleCollectionBookmarkState(
              old,
              parsedScheduleId,
              nextIsBookmarked,
            ),
          );
        });

        queryClient.setQueryData(["bookmarks", authEmail], (old) =>
          updateBookmarkedSchedulesCache(
            old,
            parsedScheduleId,
            nextIsBookmarked,
            detailSnapshot,
          ),
        );

        return {
          previousDetail,
          previousHomeQueries,
          previousScheduleQueries,
          previousBookmarks,
        };
      },
      onError: (requestError, nextIsBookmarked, context) => {
        /*
         * optimistic update는 빠른 대신 실패 시 복구 책임이 크다.
         * 그래서 onMutate에서 저장한 snapshot을 그대로 되돌려 각 화면이 서버 진실과 다시 맞도록 한다.
         */
        if (context?.previousDetail !== undefined) {
          queryClient.setQueryData(detailQueryKey, context.previousDetail);
        }

        context?.previousHomeQueries?.forEach(([queryKey, cachedData]) => {
          queryClient.setQueryData(queryKey, cachedData);
        });

        context?.previousScheduleQueries?.forEach(([queryKey, cachedData]) => {
          queryClient.setQueryData(queryKey, cachedData);
        });

        if (context?.previousBookmarks !== undefined) {
          queryClient.setQueryData(
            ["bookmarks", authEmail],
            context.previousBookmarks,
          );
        }

        showFeedback(
          "error",
          resolveRequestErrorMessage(
            requestError,
            "위시 상태 변경에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          ),
        );
      },
      onSuccess: async (response) => {
        const successMessage = response?.isBookmarked
          ? "위시리스트에 저장했어요"
          : "위시리스트에서 삭제했어요";
        showFeedback("success", successMessage);

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: detailQueryKey }),
          queryClient.invalidateQueries({ queryKey: ["home-schedules"] }),
          queryClient.invalidateQueries({ queryKey: ["schedules"] }),
          queryClient.invalidateQueries({ queryKey: ["bookmarks", authEmail] }),
        ]);
      },
    });

  const handleDelete = async () => {
    try {
      await deleteSchedule(scheduleId);

      handleClose();
      navigate("/");
    } catch (err) {
      console.error("삭제 실패", err);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleCloseFeedback = useCallback((event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setFeedback(null);
  }, []);

  /*
   * 비로그인 사용자를 클릭 즉시 로그인 화면으로 보내면
   * "일정을 둘러보다가 하트를 눌렀더니 갑자기 화면이 바뀐다"는 단절감이 생긴다.
   * 그래서 toast로 막힌 이유를 먼저 설명하고, Dialog에서 실제 이동 의사를 한 번 더 묻는다.
   */
  const handleRequireLoginForBookmark = useCallback(() => {
    showFeedback("warning", "로그인 후 이용할 수 있습니다.");
    setIsLoginPromptOpen(true);
  }, [showFeedback]);

  const handleCloseLoginPrompt = useCallback(() => {
    setIsLoginPromptOpen(false);
  }, []);

  const handleMoveToLogin = useCallback(() => {
    setIsLoginPromptOpen(false);
    navigate("/login", {
      state: { redirectTo: location.pathname },
    });
  }, [location.pathname, navigate]);

  const handleToggleBookmark = useCallback(async () => {
    if (!isLoggedIn || !authEmail) {
      handleRequireLoginForBookmark();
      return;
    }

    const currentIsBookmarked = Boolean(
      data?.isBookmarked ?? data?.schedule?.isBookmarked,
    );

    await toggleBookmark(!currentIsBookmarked);
  }, [
    authEmail,
    data?.isBookmarked,
    data?.schedule?.isBookmarked,
    handleRequireLoginForBookmark,
    isLoggedIn,
    toggleBookmark,
  ]);

  const addToGoogleCalendar = () => {
    /*
     * 캘린더 추가는 외부 URL 조합만 담당한다.
     * 서버 상태를 바꾸지 않으므로 mutation/cache invalidate 없이 현재 상세 응답 값을 그대로 사용한다.
     */
    const schedule = data?.schedule;

    if (!schedule) {
      return;
    }

    const start = new Date(schedule.startDate)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(".000", "");

    const end = new Date(schedule.endDate)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(".000", "");

    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      "&text=" +
      encodeURIComponent(schedule.title || "") +
      "&dates=" +
      encodeURIComponent(`${start}/${end}`) +
      "&details=" +
      encodeURIComponent(schedule.description || "") +
      "&location=" +
      encodeURIComponent(
        `${schedule.region || ""} ${schedule.detailRegion || ""}`,
      );

    window.open(url, "_blank");
  };

  /*
   * 호스트가 신청자 카드의 승인/거절/강퇴 버튼을 눌렀을 때 실행된다.
   * 프론트는 먼저 로그인 사용자 email을 확인하고, 사용자 확인창을 거친 뒤 PATCH /participations/{id}/status를 호출한다.
   * 실제 권한 검증, 상태 전이 가능 여부, 정원 증감은 백엔드 Service에서 최종 판단한다.
   */
  const handleApplicantAction = useCallback(
    async ({ participationId, status, reason }) => {
      if (!isLoggedIn || !authEmail) {
        navigate("/login", { replace: true });
        return;
      }

      const confirmText =
        status === "APPROVED"
          ? "이 신청을 승인하시겠습니까?"
          : status === "REJECTED"
            ? "이 신청을 거절하시겠습니까?"
            : "이 참여자를 강퇴하시겠습니까?";

      if (!window.confirm(confirmText)) {
        return;
      }

      try {
        /*
         * updateParticipationStatus mutation은 성공 시 신청자 목록, 내 일정 목록, 상세 화면 캐시를 무효화한다.
         * 승인 성공 후 currentParticipants나 일정 마감 상태가 바뀔 수 있기 때문에 상세 데이터도 다시 읽어야 한다.
         */
        await updateParticipationStatus({
          participationId,
          email: authEmail,
          status,
          reason,
        });

        showFeedback(
          "success",
          status === "APPROVED"
            ? "신청을 승인했습니다."
            : status === "REJECTED"
              ? "신청을 거절했습니다."
              : "참여자를 강퇴했습니다.",
        );
      } catch (requestError) {
        showFeedback(
          "error",
          resolveRequestErrorMessage(requestError, "상태 변경에 실패했습니다."),
        );
      }
    },
    [
      authEmail,
      isLoggedIn,
      navigate,
      resolveRequestErrorMessage,
      showFeedback,
      updateParticipationStatus,
    ],
  );

  const handleExecuteSchedule = useCallback(async () => {
    if (!isLoggedIn || !authEmail) {
      navigate("/login", { replace: true });
      return;
    }

    /*
     * 완료 처리는 되돌릴 수는 있지만 영향이 큰 상태 변경이므로 확인창을 둔다.
     * 사용자는 이 버튼 한 번으로 이후 참여 취소, 승인/거절, 수정/삭제가 잠긴다는 사실을 인지해야 한다.
     */
    if (!window.confirm("이 일정을 완료 처리하시겠습니까?")) {
      return;
    }

    try {
      await executeSchedule({
        scheduleId: parsedScheduleId,
        email: authEmail,
      });

      /*
       * 성공 후에는 mutation onSuccess에서 캐시가 무효화되고,
       * 상세 재조회가 끝나면 배지/버튼/신청자 관리 영역이 새 상태에 맞게 다시 렌더링된다.
       */
      showFeedback("success", "일정이 완료 처리되었습니다.");
    } catch (requestError) {
      showFeedback(
        "error",
        resolveRequestErrorMessage(
          requestError,
          "일정 완료 처리에 실패했습니다.",
        ),
      );
    }
  }, [
    authEmail,
    executeSchedule,
    isLoggedIn,
    navigate,
    parsedScheduleId,
    resolveRequestErrorMessage,
    showFeedback,
  ]);

  const handleRollbackScheduleExecution = useCallback(async () => {
    if (!isLoggedIn || !authEmail) {
      navigate("/login", { replace: true });
      return;
    }

    if (!window.confirm("일정완료 상태를 취소하시겠습니까?")) {
      return;
    }

    try {
      await rollbackScheduleExecution({
        scheduleId: parsedScheduleId,
        email: authEmail,
      });

      showFeedback("success", "일정완료 상태가 취소되었습니다.");
    } catch (requestError) {
      showFeedback(
        "error",
        resolveRequestErrorMessage(
          requestError,
          "일정완료 취소에 실패했습니다.",
        ),
      );
    }
  }, [
    authEmail,
    isLoggedIn,
    navigate,
    parsedScheduleId,
    resolveRequestErrorMessage,
    rollbackScheduleExecution,
    showFeedback,
  ]);

  const handleCancelSchedule = useCallback(async () => {
    if (!isLoggedIn || !authEmail) {
      navigate("/login", { replace: true });
      return;
    }

    if (!window.confirm("이 일정을 취소하시겠습니까?")) {
      return;
    }

    try {
      await cancelHostSchedule({
        scheduleId: parsedScheduleId,
        email: authEmail,
      });

      showFeedback("success", "일정이 취소되었습니다.");
    } catch (requestError) {
      showFeedback(
        "error",
        resolveRequestErrorMessage(requestError, "일정 취소에 실패했습니다."),
      );
    }
  }, [
    authEmail,
    cancelHostSchedule,
    isLoggedIn,
    navigate,
    parsedScheduleId,
    resolveRequestErrorMessage,
    showFeedback,
  ]);

  const isApplicantsForbidden = applicantsError?.response?.status === 403;

  const applicantsErrorMessage =
    applicantsError && !isApplicantsForbidden
      ? (applicantsError?.response?.data?.message ??
        applicantsError?.response?.data ??
        "신청자 목록을 불러오지 못했습니다.")
      : "";
  const schedule = data?.schedule ?? null;
  const viewerParticipationStatus = data?.viewerParticipationStatus ?? "";
  const applyActionSchedule = schedule ?? {};
  const {
    buttonLabel: applyButtonLabel,
    buttonVariant: applyButtonVariant,
    eligibilityMessages,
    handleAction: handleApplyAction,
    infoMessage: applyInfoMessage,
    isButtonDisabled: isApplyButtonDisabled,
  } = useScheduleApplyAction({
    scheduleId: applyActionSchedule.id ?? parsedScheduleId,
    status: applyActionSchedule.status,
    recruitEndDate: applyActionSchedule.recruitEndDate,
    genderLimit: applyActionSchedule.genderLimit,
    ageMin: applyActionSchedule.ageMin,
    ageMax: applyActionSchedule.ageMax,
    viewerParticipationId: data?.viewerParticipationId,
    viewerParticipationStatus,
    isHost: Boolean(data?.viewerIsHost),
    onFeedback: handleApplyFeedback,
  });

  if (!Number.isFinite(parsedScheduleId) || parsedScheduleId <= 0) {
    return <NotFoundPage />;
  }

  if (isLoading) {
    return <div className={styles.container}>로딩 중...</div>;
  }

  if (isError) {
    const errorStatus = error?.response?.status;
    if (errorStatus === 404) {
      return <NotFoundPage />;
    }

    const errorMessage =
      error?.response?.data?.message ??
      error?.response?.data ??
      "데이터를 불러오는 데 실패했습니다.";

    return <div className={styles.container}>{errorMessage}</div>;
  }

  if (!data?.schedule) {
    return <NotFoundPage />;
  }

  /*
   * viewerParticipationStatus는 참여 CTA의 버튼 문구와 취소 가능 여부를 결정한다.
   * viewerCanAccessChatLink는 오픈채팅 링크 노출 권한만 담당하므로 참여 버튼 권한과 섞지 않는다.
   */
  const viewerCanAccessChatLink = Boolean(data.viewerCanAccessChatLink);
  const details = Array.isArray(data.details) ? data.details : [];
  const rawImages = Array.isArray(data.images) ? data.images : [];
  const locationText = formatLocation(schedule);

  const categoryLabel =
    CATEGORY_LABELS[schedule.category] ?? schedule.category ?? "기타";
  const schedulePhase = resolveSchedulePhase(schedule);
  const normalizedScheduleStatus =
    schedule?.status?.trim()?.toLowerCase() ?? "";
  const isScheduleCompleted =
    normalizedScheduleStatus === SCHEDULE_STATUS.COMPLETED;
  /*
   * 일정 완료 버튼 활성 조건은 프런트에서도 먼저 계산한다.
   * 다만 이것은 UX 보조 장치일 뿐이고, 실제 최소 인원 충족 여부와 상태 전이 가능 여부는 백엔드가 최종 검증한다.
   */
  const canCompleteSchedule =
    Number(schedule.currentParticipants ?? 0) >=
    Number(schedule.minParticipants ?? 0);
  const isScheduleCanceled =
    normalizedScheduleStatus === SCHEDULE_STATUS.CANCELED;
  const isScheduleClosed = normalizedScheduleStatus === SCHEDULE_STATUS.CLOSED;
  const isScheduleRecruiting =
    normalizedScheduleStatus === SCHEDULE_STATUS.RECRUITING;
  const isScheduleActionPending =
    isCompletingSchedule || isRollbackPending || isCancelingSchedule;
  const isScheduleCancelable = isScheduleRecruiting || isScheduleClosed;
  const isScheduleCompletable =
    (isScheduleRecruiting || isScheduleClosed) && canCompleteSchedule;
  const isBookmarked = Boolean(data?.isBookmarked ?? schedule?.isBookmarked);
  const shouldShowHiddenBanner =
    Boolean(data?.hiddenFromPublic) && (viewerIsHost || viewerIsAdmin);
  const BookmarkIcon = isBookmarked
    ? FavoriteRoundedIcon
    : FavoriteBorderRoundedIcon;

  /*
   * 이미지는 썸네일 플래그가 있는 항목을 앞에 세운 뒤 URL만 추린다.
   * API 이미지가 없으면 schedule.thumbnailImage, 그것도 없으면 DEFAULT_IMAGE 순서로 fallback해 hero가 항상 렌더되게 한다.
   */
  const imageUrls =
    rawImages.length > 0
      ? [...rawImages]
          .sort((a, b) => (b?.isThumbnail ?? 0) - (a?.isThumbnail ?? 0))
          .map((image) => image?.imageUrl?.trim())
          .filter(Boolean)
      : schedule.thumbnailImage?.trim()
        ? [schedule.thumbnailImage.trim()]
        : [DEFAULT_IMAGE];

  /*
   * 이미지 목록이 재조회로 줄어들면 currentImg가 배열 범위를 벗어날 수 있다.
   * 렌더 직전에 안전 인덱스를 계산해 잘못된 src 접근과 lightbox index 오류를 막는다.
   */
  const safeCurrentImg =
    currentImg >= imageUrls.length ? 0 : Math.max(currentImg, 0);

  const lightboxSlides = imageUrls.map((url) => ({ src: url }));

  const nextSlide = () => {
    /*
     * 버튼 disabled는 이미지 1장일 때 이동을 막지만,
     * 함수 자체는 순환 로직으로 유지해 이미지가 여러 장인 경우 라이트박스/버튼 동작이 동일하게 돈다.
     */
    setCurrentImg((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    /*
     * 이전 버튼도 마지막 이미지로 순환한다.
     * 사용자가 썸네일을 직접 누른 경우에도 currentImg 기준으로 자연스럽게 이동한다.
     */
    setCurrentImg((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  const isEditable = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(schedule.recruitEndDate);
    end.setHours(0, 0, 0, 0);

    /*
     * 수정 버튼은 모집 마감일이 지나면 숨기고,
     * 추가로 completed/canceled 상태에서도 무조건 숨긴다.
     * 이렇게 프론트에서 먼저 감추더라도 서버는 updateSchedule에서 다시 차단한다.
     */
    return !isScheduleCompleted && !isScheduleCanceled && end >= today;
  })();

  /*
   * 여기부터는 API 원본을 JSX가 바로 쓰기 좋은 표시 모델로 변환한다.
   * 렌더 안에서 fallback을 반복하면 호스트/비호스트 분기마다 문구가 어긋나기 쉬워 한 곳에서 정리한다.
   */
  const hostProfile = data.host ?? {};
  const hostName = hostProfile.nickname || "호스트";
  const hostEmail = data.email?.trim?.() ?? "";
  const hostProfileImage =
    hostProfile.profileImage?.trim?.() || DEFAULT_HOST_PROFILE_IMAGE;
  const visibleApprovedApplicants = hostEmail
    ? approvedApplicants.filter(
        (applicant) => !isSameEmail(getApplicantEmail(applicant), hostEmail),
      )
    : approvedApplicants;

  const visibleApplicants = hostEmail
    ? applicants.filter(
        (applicant) => !isSameEmail(getApplicantEmail(applicant), hostEmail),
      )
    : applicants;
  const deadlineLabel = formatDDay(schedule.recruitEndDate);
  const visibleThumbnails = imageUrls.slice(0, MAX_VISIBLE_THUMBNAILS);
  const participantCount = Number(schedule.currentParticipants ?? 0);
  const maxParticipants = Number(schedule.maxParticipants ?? 0);
  const minParticipants = Number(schedule.minParticipants ?? 0);
  const costLabel = `${Number(schedule.totalPrice ?? 0).toLocaleString()}원`;
  const costTypeLabel =
    COST_TYPE_LABELS[schedule.costType] ||
    schedule.costType ||
    "정산 방식 미정";
  const genderLimitLabel = formatGenderLimit(schedule.genderLimit);
  const ageRangeLabel = formatAgeRange(schedule.ageMin, schedule.ageMax);

  return (
    <div className={styles.container}>
      <main className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.mainColumn}>
            {/*
              대표 이미지 카드다.
              실제 imageUrls만 사용하며, 이미지가 1장일 때 이전/다음 버튼은 disabled로 남겨 컨트롤 위치는 유지하되 불필요한 순환을 막는다.
            */}
            <section className={`${styles.panel} ${styles.heroCard}`}>
              <div className={styles.heroImageWrap}>
                <img
                  src={imageUrls[safeCurrentImg]}
                  alt="일정 이미지"
                  className={styles.heroImage}
                  onClick={() => setIsViewerOpen(true)}
                />

                <div className={styles.heroBadges}>
                  <span className={styles.categoryBadge}>{categoryLabel}</span>
                  <span className={schedulePhase.className}>
                    {schedulePhase.label}
                  </span>
                  <span className={styles.ddayBadge}>{deadlineLabel}</span>
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

              {/* 썸네일 스트립은 최대 3장까지만 노출한다. */}
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

            {/*
              제목/메타/핵심 조건 영역이다.
              현재 API에 있는 정보만 사용하고, HTML 시안의 포함/불포함/출발 장소 같은 더미성 항목은 넣지 않는다.
            */}
            <section className={`${styles.panel} ${styles.titleSection}`}>
              {shouldShowHiddenBanner ? (
                <div className={styles.hiddenNoticeBanner}>
                  이 일정은 비공개로 숨겨져 있으며 호스트 또는 관리자만 확인할
                  수 있습니다.
                </div>
              ) : null}
              <div className={styles.titleRow}>
                <div className={styles.titleContent}>
                  <h1 className={styles.title}>
                    {schedule.title ?? "제목 없음"}
                  </h1>
                  <div className={styles.metaLine}>
                    <span>
                      <PlaceIcon fontSize="small" /> {locationText}
                    </span>
                    <span>
                      <CalendarTodayIcon fontSize="small" />{" "}
                      {schedule.startDate || "미정"} ~{" "}
                      {schedule.endDate || "미정"}
                    </span>
                  </div>
                  <div className={styles.socialInfo}>
                    <VisibilityIcon fontSize="small" />
                    조회 {schedule.viewCount ?? 0}
                  </div>
                </div>

                <Button
                  variant={isBookmarked ? "accent" : "outline"}
                  onClick={handleToggleBookmark}
                  disabled={isBookmarkPending}
                  className={styles.bookmarkButton}
                >
                  <BookmarkIcon fontSize="small" />
                  {isBookmarked ? "위시 삭제" : "위시 추가"}
                </Button>
              </div>

              {/*
                5개 정보 그리드는 신청 전 판단에 필요한 조건을 한눈에 보여준다.
                각 값은 위 표시 모델에서 fallback이 끝난 문자열이므로 JSX는 레이아웃만 담당한다.
              */}
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <PeopleIcon className={styles.infoIcon} />
                  <p className={styles.label}>모집 인원</p>
                  <p className={styles.value}>
                    {participantCount} / {maxParticipants}명
                  </p>
                  <p className={styles.subValue}>최소 {minParticipants}명</p>
                </div>

                <div className={styles.infoItem}>
                  <WcOutlinedIcon className={styles.infoIcon} />
                  <p className={styles.label}>성별</p>
                  <p className={styles.value}>{genderLimitLabel}</p>
                </div>

                <div className={styles.infoItem}>
                  <CakeOutlinedIcon className={styles.infoIcon} />
                  <p className={styles.label}>연령</p>
                  <p className={styles.value}>{ageRangeLabel}</p>
                </div>

                <div className={styles.infoItem}>
                  <PaymentsIcon className={styles.infoIcon} />
                  <p className={styles.label}>예상 비용</p>
                  <p className={styles.value}>{costLabel}</p>
                </div>

                <div className={styles.infoItem}>
                  <ReceiptLongOutlinedIcon className={styles.infoIcon} />
                  <p className={styles.label}>정산 방식</p>
                  <p className={styles.value}>{costTypeLabel}</p>
                </div>
              </div>
            </section>

            {/*
              본문 영역은 상세 설명과 Day-by-Day만 유지한다.
              현재 details에는 dayNumber/title/description만 있으므로 시간 pill이나 태그 리스트는 하드코딩하지 않는다.
            */}
            <section className={`${styles.panel} ${styles.contentSection}`}>
              <div className={styles.contentBlock}>
                <h2 className={styles.subTitle}>상세 설명</h2>
                <p className={styles.descriptionText}>
                  {schedule.description || "상세 설명이 없습니다."}
                </p>
              </div>

              {details.length > 0 ? (
                <div className={styles.contentBlock}>
                  <h2 className={styles.subTitle}>Day-by-Day</h2>
                  <div className={styles.dailyPlanList}>
                    {details.map((detail) => (
                      <article key={detail.id} className={styles.dayCard}>
                        <span className={styles.dayNumber}>
                          Day {detail.dayNumber}
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
              ) : null}
            </section>
          </div>

          {/*
            사이드바는 viewer 역할에 따라 완전히 다른 정보를 보여준다.
            비호스트에게는 공개 가능한 호스트 요약, 호스트에게는 운영에 필요한 승인 참여자/신청자 관리 정보를 우선 배치한다.
          */}
          <aside className={styles.sideColumn}>
            {!viewerIsHost ? (
              /*
               * 비호스트에게는 신청자 목록 API를 호출하지 않고, 상세 응답의 host 요약만 보여준다.
               * 이 분기는 게스트와 일반 로그인 사용자가 모두 볼 수 있는 공개 정보 영역이다.
               */
              <section className={`${styles.panel} ${styles.hostPanel}`}>
                {hostEmail ? (
                  <button
                    type="button"
                    className={`${styles.hostProfileAction} ${styles.hostAvatarButton}`}
                    onClick={() => navigateToMyPage(hostEmail)}
                    aria-label={`${hostName} 프로필 보기`}
                  >
                    <img
                      src={hostProfileImage}
                      alt={`${hostName} 프로필`}
                      className={styles.hostAvatar}
                      onError={(event) => {
                        /*
                         * 외부 프로필 이미지가 깨졌을 때도 영역 크기를 유지해야 한다.
                         * 동일한 기본 이미지를 다시 넣고, 무한 재시도를 막기 위해 onerror를 먼저 끊는다.
                         */
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = DEFAULT_HOST_PROFILE_IMAGE;
                      }}
                    />
                  </button>
                ) : (
                  <img
                    src={hostProfileImage}
                    alt={`${hostName} 프로필`}
                    className={styles.hostAvatar}
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = DEFAULT_HOST_PROFILE_IMAGE;
                    }}
                  />
                )}
                <div className={styles.hostText}>
                  <span className={styles.hostBadge}>이 일정의 호스트</span>
                  {hostEmail ? (
                    <button
                      type="button"
                      className={`${styles.hostProfileAction} ${styles.hostNameButton}`}
                      onClick={() => navigateToMyPage(hostEmail)}
                      aria-label={`${hostName} 마이페이지로 이동`}
                    >
                      <strong className={styles.hostName}>{hostName}</strong>
                    </button>
                  ) : (
                    <strong className={styles.hostName}>{hostName}</strong>
                  )}
                  <p className={styles.hostMeta}>
                    일정 참여 전 호스트가 제공한 모집 조건을 확인해 주세요.
                  </p>
                </div>
              </section>
            ) : (
              /*
               * 호스트는 자기 프로필을 보는 것보다 현재 승인된 참여자 규모를 먼저 확인해야 한다.
               * approvedApplicants query는 현재 필터 목록과 분리되어 있어 신청자 관리 탭을 바꿔도 이 요약은 흔들리지 않는다.
               */
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subTitle}>승인 참여자</h2>
                  <span className={styles.panelCount}>
                    {visibleApprovedApplicants.length} / {maxParticipants}
                  </span>
                </div>

                {isApprovedApplicantsLoading ? (
                  <p className={styles.sideNotice}>
                    승인 참여자를 불러오는 중입니다.
                  </p>
                ) : visibleApprovedApplicants.length > 0 ? (
                  <div className={styles.avatarList}>
                    {visibleApprovedApplicants.slice(0, 8).map((applicant) =>
                      applicant.email?.trim() ? (
                        <button
                          key={applicant.participationId}
                          type="button"
                          className={`${styles.hostProfileAction} ${styles.participantAvatarButton}`}
                          onClick={() => navigateToMyPage(applicant.email)}
                          aria-label={`${
                            applicant.nickname || applicant.email
                          } 프로필 보기`}
                        >
                          {applicant.profileImage ? (
                            <img
                              src={applicant.profileImage}
                              alt={`${applicant.nickname || "참여자"} 프로필`}
                              className={styles.participantAvatar}
                            />
                          ) : (
                            <div className={styles.participantAvatar}>
                              {resolveInitial(
                                applicant.nickname || applicant.email,
                              )}
                            </div>
                          )}
                        </button>
                      ) : applicant.profileImage ? (
                        <img
                          key={applicant.participationId}
                          src={applicant.profileImage}
                          alt={`${applicant.nickname || "참여자"} 프로필`}
                          className={styles.participantAvatar}
                        />
                      ) : (
                        <div
                          key={applicant.participationId}
                          className={styles.participantAvatar}
                        >
                          {resolveInitial(
                            applicant.nickname || applicant.email,
                          )}
                        </div>
                      ),
                    )}
                    {visibleApprovedApplicants.length > 8 ? (
                      <div
                        className={`${styles.participantAvatar} ${styles.moreAvatar}`}
                      >
                        +{visibleApprovedApplicants.length - 8}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className={styles.sideNotice}>
                    아직 승인된 참여자가 없습니다.
                  </p>
                )}
              </section>
            )}

            {/*
              오픈채팅 링크는 host 또는 승인 참여자에게만 실링크를 보여준다.
              권한이 없는 사용자는 링크 유무 자체보다 "승인 후 확인 가능"이라는 상태 안내를 보게 한다.
            */}
            <section
              ref={chatLinkSectionRef}
              className={`${styles.panel} ${styles.noticePanel}`}
              id="chat-link-section"
            >
              <ChatBubbleOutlineOutlinedIcon className={styles.noticeIcon} />
              <div>
                <h2 className={styles.noticeTitle}>오픈채팅방</h2>
                {viewerCanAccessChatLink && schedule.chatLink ? (
                  <a
                    href={schedule.chatLink}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.chatLink}
                  >
                    오픈채팅방 바로가기
                  </a>
                ) : (
                  <p className={styles.chatLinkNotice}>
                    {viewerIsHost || viewerParticipationStatus === "APPROVED"
                      ? "등록된 오픈채팅방 링크가 없습니다."
                      : "오픈채팅방 링크는 참여 승인 후 확인할 수 있습니다."}
                  </p>
                )}
              </div>
            </section>

            {/*
              일정 요약은 사이드바에서 빠르게 재확인해야 하는 최소 정보만 담는다.
              캘린더 추가는 외부 이동 액션이라 상세 데이터 mutation과 분리된다.
            */}
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2 className={styles.subTitle}>일정 요약</h2>
              </div>
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span>모집 마감</span>
                  <strong>{schedule.recruitEndDate || "미정"}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>지역</span>
                  <strong>{locationText}</strong>
                </div>
                <div className={styles.summaryRow}>
                  <span>참여 인원</span>
                  <strong>
                    {participantCount} / {maxParticipants}명
                  </strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>예상 비용</span>
                  <strong>{costLabel}</strong>
                </div>

                <div className={styles.summaryRow}>
                  <span>정산 방식</span>
                  <strong>{costTypeLabel}</strong>
                </div>
              </div>

              <div className={styles.summaryActions}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addToGoogleCalendar}
                  className={styles.summaryButton}
                >
                  구글 캘린더에 추가
                </Button>

                <div className={styles.summaryApplyContainer}>
                  <Button
                    variant={applyButtonVariant}
                    size="md"
                    disabled={isApplyButtonDisabled}
                    onClick={handleApplyAction}
                    className={styles.summaryButton}
                  >
                    {applyButtonLabel}
                  </Button>

                  {eligibilityMessages.length > 0 ? (
                    <div className={styles.summaryApplyMessages}>
                      {eligibilityMessages.map((message) => (
                        <p key={message} className={styles.summaryApplyMessage}>
                          {message}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {applyInfoMessage ? (
                    <p className={styles.summaryApplyMessage}>
                      {applyInfoMessage}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {viewerIsHost ? (
              /*
               * 호스트 관리 버튼은 프론트에서 UX 차단을 먼저 하지만 서버가 최종 권한/상태를 재검증한다.
               * completed 상태에서는 수정/삭제/상태 변경을 잠그고, 일정완료 취소만 별도 액션으로 제공한다.
               */
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <h2 className={styles.subTitle}>호스트 관리</h2>
                </div>
                <div className={styles.hostActionGrid}>
                  <Button
                    variant={isScheduleCompleted ? "outline" : "accent"}
                    disabled={
                      isScheduleActionPending ||
                      (!isScheduleCompleted && !isScheduleCompletable)
                    }
                    onClick={
                      isScheduleCompleted
                        ? handleRollbackScheduleExecution
                        : handleExecuteSchedule
                    }
                  >
                    {isScheduleCompleted ? "완료 취소" : "일정 완료"}
                  </Button>

                  {isScheduleCancelable ? (
                    <Button
                      variant="outline"
                      onClick={handleCancelSchedule}
                      disabled={isScheduleActionPending}
                    >
                      일정 취소
                    </Button>
                  ) : null}

                  {isEditable ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigate(`/update/${scheduleId}`);
                      }}
                    >
                      수정
                      <EditIcon fontSize="small" />
                    </Button>
                  ) : null}

                  <Button
                    variant="outline"
                    onClick={handleOpen}
                    disabled={isScheduleCompleted}
                  >
                    삭제
                    <DeleteIcon fontSize="small" />
                  </Button>
                </div>

                {viewerIsHost &&
                !isScheduleCompleted &&
                !isScheduleCanceled &&
                !isScheduleCompletable ? (
                  <p className={styles.executionNotice}>
                    최소 {minParticipants}명이 모여야 일정 완료 처리가
                    가능합니다.
                  </p>
                ) : null}

                {viewerIsHost && isScheduleCompleted ? (
                  <p className={styles.executionNotice}>
                    일정완료 상태입니다. 참여 상태 변경, 일정 수정, 삭제는 잠겨
                    있습니다.
                  </p>
                ) : null}

                {viewerIsHost && isScheduleCanceled ? (
                  <p className={styles.executionNotice}>
                    일정취소 상태입니다. 추가 신청과 호스트 관리 액션은
                    제한됩니다.
                  </p>
                ) : null}
              </section>
            ) : null}

            {isLoggedIn &&
            authEmail &&
            viewerIsHost &&
            !isApplicantsForbidden ? (
              /*
               * 신청자 관리 목록은 로그인한 호스트에게만 렌더링한다.
               * 여기서 내려가는 applicants에는 전화번호/성별/나이 같은 개인정보가 포함될 수 있으므로 비호스트 분기와 절대 섞으면 안 된다.
               */
              <HostParticipationList
                items={visibleApplicants}
                loading={isApplicantsLoading}
                errorMessage={applicantsErrorMessage}
                emptyMessage={`${HOST_STATUS_LABELS[applicantStatus] ?? "선택한 상태"} 신청자가 없습니다.`}
                hostEmail={authEmail}
                onProfileClick={navigateToMyPage}
                onItemAction={handleApplicantAction}
                activeStatus={applicantStatus}
                onStatusChange={setApplicantStatus}
                isActionLoading={isStatusUpdating || isScheduleCompleted}
                isReadOnly={isScheduleCompleted}
              />
            ) : null}
          </aside>
        </div>
      </main>

      {/*
        삭제 확인 Dialog다.
        삭제는 복구 불가능한 호스트 액션이므로 버튼 클릭 즉시 API를 보내지 않고 한 번 더 확인한다.
      */}
      <Dialog
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: 2,
              minWidth: 320,
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 3 }}>일정 삭제</DialogTitle>

        <DialogContent sx={{ px: 10, py: 2 }}>
          <DialogContentText sx={{ fontSize: "15px", color: "#555" }}>
            삭제 후에는 복구할 수 없습니다.
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleDelete}>삭제하기</Button>

          <Button onClick={handleClose} variant="outline">
            취소
          </Button>
        </DialogActions>
      </Dialog>

      {/*
        비로그인 위시 클릭 시 사용하는 로그인 유도 Dialog다.
        즉시 redirect하지 않고 사용자가 현재 상세 페이지 맥락을 유지한 상태에서 이동을 선택하게 한다.
      */}
      <Dialog
        open={isLoginPromptOpen}
        onClose={handleCloseLoginPrompt}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3,
              p: 2,
              minWidth: 320,
            },
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>로그인이 필요합니다</DialogTitle>

        <DialogContent sx={{ px: 4, py: 2 }}>
          <DialogContentText
            sx={{ fontSize: "15px", color: "#555", lineHeight: 1.7 }}
          >
            위시리스트 기능은 로그인 후 이용할 수 있습니다. 로그인 페이지로
            이동하시겠습니까?
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleMoveToLogin} variant="accent">
            로그인하기
          </Button>

          <Button onClick={handleCloseLoginPrompt} variant="outline">
            취소
          </Button>
        </DialogActions>
      </Dialog>

      {/*
        상세 페이지의 모든 mutation 결과는 하나의 feedback surface로 모은다.
        참여/북마크/호스트 액션이 각자 Snackbar를 만들면 메시지 우선순위와 위치가 흔들린다.
      */}
      <ParticipationFeedback
        feedback={feedback}
        onClose={handleCloseFeedback}
      />

      {/*
        hero 이미지를 클릭했을 때 열리는 확대 보기다.
        slides는 imageUrls에서 만든 동일한 순서를 쓰므로 썸네일 선택 상태와 lightbox index가 맞춰진다.
      */}
      <Lightbox
        open={isViewerOpen}
        close={() => setIsViewerOpen(false)}
        slides={lightboxSlides}
        index={safeCurrentImg}
        plugins={[Zoom]}
        carousel={{
          finite: imageUrls.length <= 1,
        }}
        controller={{
          disableSwipeNavigation: imageUrls.length <= 1,
        }}
      />
    </div>
  );
}
