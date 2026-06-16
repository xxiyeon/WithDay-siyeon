import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dayjs } from "../../../shared/lib/dateUtile";
import { useAuthStore } from "../../auth/store/authStore";
import {
  useApplyScheduleMutation,
  useCancelParticipationMutation,
} from "../../participation/model/mutations";
import {
  SCHEDULE_STATUS,
  getScheduleStatusLabel,
} from "./constants";
import { getScheduleEligibility } from "./eligibility";

const isScheduleClosedByDate = (recruitEndDate) => {
  if (!recruitEndDate) {
    return null;
  }

  const deadline = dayjs(recruitEndDate).endOf("day");

  if (!deadline.isValid()) {
    return null;
  }

  return dayjs().isAfter(deadline);
};

const normalizeScheduleStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase();

/*
 * 일정 상세 참여 CTA용 도메인 로직 hook이다.
 * UI는 ScheduleDetail이 직접 렌더링하고, 이 hook은 버튼 문구/비활성 여부/클릭 흐름만 책임진다.
 */
export function useScheduleApplyAction({
  scheduleId,
  status,
  recruitEndDate,
  genderLimit = "all",
  ageMin = null,
  ageMax = null,
  viewerParticipationId = null,
  viewerParticipationStatus = "",
  isHost = false,
  onFeedback,
}) {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthStore();

  const [localParticipationStatus, setLocalParticipationStatus] =
    useState(null);

  const { applySchedule, isPending } = useApplyScheduleMutation();
  const { cancelParticipation, isPending: isCancelPending } =
    useCancelParticipationMutation();

  const closedByDate = useMemo(
    () => isScheduleClosedByDate(recruitEndDate),
    [recruitEndDate],
  );

  const normalizedScheduleStatus = normalizeScheduleStatus(status);
  const isCompleted = normalizedScheduleStatus === SCHEDULE_STATUS.COMPLETED;
  const isClosedByStatus =
    normalizedScheduleStatus !== SCHEDULE_STATUS.RECRUITING;
  const isClosedByDate = closedByDate === true;
  const isClosed = isClosedByStatus || isClosedByDate;

  const eligibility = useMemo(
    () =>
      getScheduleEligibility({
        userGender: user?.gender,
        birthday: user?.birthday,
        genderLimit,
        ageMin,
        ageMax,
      }),
    [ageMax, ageMin, genderLimit, user?.birthday, user?.gender],
  );

  const normalizedParticipationStatus =
    viewerParticipationStatus?.trim()?.toUpperCase() ?? "";
  const effectiveParticipationStatus =
    localParticipationStatus || normalizedParticipationStatus;

  const canApply =
    !effectiveParticipationStatus ||
    effectiveParticipationStatus === "CANCELED";
  const canCancel =
    effectiveParticipationStatus === "PENDING" ||
    effectiveParticipationStatus === "APPROVED";
  const isActionPending = isPending || isCancelPending;
  const isEligible = eligibility.isEligible;
  const shouldEnforceEligibility = isLoggedIn && canApply;

  const buttonLabel = useMemo(() => {
    if (isHost) return "내가 만든 일정";
    if (isCompleted) return getScheduleStatusLabel(SCHEDULE_STATUS.COMPLETED);
    if (isActionPending) {
      return canCancel ? "취소 처리 중..." : "신청 중...";
    }
    if (effectiveParticipationStatus === "PENDING") return "신청 취소";
    if (effectiveParticipationStatus === "APPROVED") return "참여 취소";
    if (effectiveParticipationStatus === "REJECTED") return "거절됨";
    if (effectiveParticipationStatus === "KICKED") return "참여 불가";
    if (isClosed) {
      return getScheduleStatusLabel(
        isClosedByDate ? SCHEDULE_STATUS.CLOSED : status,
      );
    }
    return "참여 신청하기";
  }, [
    canCancel,
    effectiveParticipationStatus,
    isCompleted,
    isActionPending,
    isClosed,
    isClosedByDate,
    isHost,
    status,
  ]);

  const isButtonDisabled =
    isHost ||
    isCompleted ||
    effectiveParticipationStatus === "REJECTED" ||
    effectiveParticipationStatus === "KICKED" ||
    isActionPending ||
    (shouldEnforceEligibility && !isEligible) ||
    (canCancel && !viewerParticipationId);

  const buttonVariant = !isClosed || canCancel ? "accent" : "outline";

  const eligibilityMessages =
    shouldEnforceEligibility && !isEligible
      ? eligibility.reasons
      : [];

  const infoMessage = isCompleted
    ? "일정완료 상태의 일정은 참여 신청이나 취소를 할 수 없습니다."
    : "";

  const showFeedback = ({ message, severity }) => {
    onFeedback?.({
      id: Date.now(),
      message,
      severity,
    });
  };

  const resolveErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData === "string" && responseData.trim()) {
      return responseData;
    }

    if (
      typeof responseData?.message === "string" &&
      responseData.message.trim()
    ) {
      return responseData.message;
    }

    if (
      typeof responseData?.detail === "string" &&
      responseData.detail.trim()
    ) {
      return responseData.detail;
    }

    if (typeof error?.message === "string" && error.message.trim()) {
      return error.message;
    }

    return "참여 처리에 실패했습니다.";
  };

  const handleAction = async () => {
    if (!isLoggedIn) {
      navigate("/login", { replace: true });
      return;
    }

    const email = user?.email?.trim();

    if (!email || isButtonDisabled) {
      return;
    }

    if (isCompleted) {
      showFeedback({
        severity: "info",
        message: "일정완료 상태의 일정은 참여 신청이나 취소를 할 수 없습니다.",
      });
      return;
    }

    if (canApply && isClosed) {
      showFeedback({
        severity: "warning",
        message: "이미 마감된 일정입니다",
      });
      return;
    }

    try {
      if (canCancel) {
        const confirmCancel = window.confirm(
          effectiveParticipationStatus === "APPROVED"
            ? "이 일정 참여를 취소하시겠습니까?"
            : "이 일정 신청을 취소하시겠습니까?",
        );

        if (!confirmCancel) {
          return;
        }

        await cancelParticipation({
          participationId: viewerParticipationId,
          scheduleId,
          email,
        });

        setLocalParticipationStatus("CANCELED");
        showFeedback({
          severity: "success",
          message:
            effectiveParticipationStatus === "APPROVED"
              ? "참여가 취소되었습니다"
              : "신청이 취소되었습니다",
        });
        return;
      }

      const confirmJoin = window.confirm("이 일정에 참여 신청을 하시겠습니까?");
      if (!confirmJoin) {
        return;
      }

      await applySchedule({ email, scheduleId });

      setLocalParticipationStatus("PENDING");
      showFeedback({
        severity: "success",
        message:
          effectiveParticipationStatus === "CANCELED"
            ? "참여 신청이 다시 완료되었습니다"
            : "참여 신청이 완료되었습니다",
      });
    } catch (error) {
      showFeedback({
        severity: "error",
        message: resolveErrorMessage(error),
      });
    }
  };

  return {
    buttonLabel,
    buttonVariant,
    eligibilityMessages,
    handleAction,
    infoMessage,
    isButtonDisabled,
  };
}
