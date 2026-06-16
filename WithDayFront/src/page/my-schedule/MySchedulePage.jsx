import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./MySchedulePage.module.css";

import { useAuthStore } from "../../features/auth/store/authStore";
import { dayjs } from "../../shared/lib/dateUtile";
import Pagination from "../../shared/ui/Pagination/Pagination";
import { PARTICIPATION_TABS } from "../../features/participation/model/constants";
import {
  useMySchedulesQuery,
  useParticipationMutation,
} from "../../features/participation/model/queries";
import { SCHEDULE_STATUS } from "../../features/schedule/model/constants";
import ParticipationFeedback from "../../features/participation/ui/ParticipationFeedback/ParticipationFeedback";
import ParticipationList from "../../features/participation/ui/ParticipationList/ParticipationList";
import ParticipationTabs from "../../features/participation/ui/ParticipationTabs/ParticipationTabs";

const CLOSED_HOSTING_PAGE_SIZE = 4;
const CLOSED_HOSTING_NAV_SIZE = 5;

const normalizeScheduleStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const resolvePrimaryDeadline = (item) => {
  const recruitEnd = dayjs(item?.recruitEndDate).startOf("day");
  if (recruitEnd.isValid()) {
    return recruitEnd;
  }

  const end = dayjs(item?.endDate).startOf("day");
  return end.isValid() ? end : null;
};

const resolveEndDate = (item) => {
  const end = dayjs(item?.endDate).startOf("day");
  return end.isValid() ? end : null;
};

const isClosedHostingSchedule = (item) => {
  const normalizedStatus = normalizeScheduleStatus(item?.scheduleStatus);
  const today = dayjs().startOf("day");
  const endDate = resolveEndDate(item);

  if (endDate && endDate.isBefore(today)) {
    return true;
  }

  return (
    normalizedStatus === SCHEDULE_STATUS.CLOSED ||
    normalizedStatus === SCHEDULE_STATUS.COMPLETED ||
    normalizedStatus === SCHEDULE_STATUS.CANCELED
  );
};

const compareHostingDeadlineAsc = (left, right) => {
  const leftDeadline = resolvePrimaryDeadline(left);
  const rightDeadline = resolvePrimaryDeadline(right);

  if (leftDeadline && rightDeadline) {
    if (leftDeadline.isBefore(rightDeadline)) return -1;
    if (leftDeadline.isAfter(rightDeadline)) return 1;
  } else if (leftDeadline) {
    return -1;
  } else if (rightDeadline) {
    return 1;
  }

  const leftEndDate = resolveEndDate(left);
  const rightEndDate = resolveEndDate(right);
  if (leftEndDate && rightEndDate) {
    if (leftEndDate.isBefore(rightEndDate)) return -1;
    if (leftEndDate.isAfter(rightEndDate)) return 1;
  } else if (leftEndDate) {
    return -1;
  } else if (rightEndDate) {
    return 1;
  }

  return Number(left?.scheduleId ?? 0) - Number(right?.scheduleId ?? 0);
};

const compareHostingDeadlineDesc = (left, right) =>
  compareHostingDeadlineAsc(right, left);

const MySchedulePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "participating"
  );
  const [feedback, setFeedback] = useState(null);
  const [showClosedHosting, setShowClosedHosting] = useState(false);
  const [closedHostingPage, setClosedHostingPage] = useState(0);
  const email = useAuthStore((state) => state.user.email);

  const participatingQuery = useMySchedulesQuery(email, "participating");
  const pendingQuery = useMySchedulesQuery(email, "pending");
  const hostingQuery = useMySchedulesQuery(email, "hosting");
  const {
    cancelParticipation,
    deleteParticipation,
    isPending: isMutationPending,
  } = useParticipationMutation(email);

  const tabItems = useMemo(
    () => ({
      participating: participatingQuery.data ?? [],
      pending: pendingQuery.data ?? [],
      hosting: hostingQuery.data ?? [],
    }),
    [hostingQuery.data, participatingQuery.data, pendingQuery.data]
  );

  const currentItems = tabItems[activeTab] ?? [];
  const currentQuery =
    activeTab === "participating"
      ? participatingQuery
      : activeTab === "pending"
      ? pendingQuery
      : hostingQuery;

  const hostingSections = useMemo(() => {
    const hostingItems = Array.isArray(tabItems.hosting)
      ? tabItems.hosting
      : [];
    const activeHostingItems = hostingItems
      .filter((item) => !isClosedHostingSchedule(item))
      .sort(compareHostingDeadlineAsc);
    const closedHostingItems = hostingItems
      .filter((item) => isClosedHostingSchedule(item))
      .sort(compareHostingDeadlineDesc);

    return {
      activeHostingItems,
      closedHostingItems,
    };
  }, [tabItems.hosting]);

  const closedHostingTotalPage = useMemo(
    () =>
      Math.ceil(
        hostingSections.closedHostingItems.length / CLOSED_HOSTING_PAGE_SIZE
      ),
    [hostingSections.closedHostingItems.length]
  );

  const safeClosedHostingPage =
    closedHostingTotalPage > 0
      ? Math.min(closedHostingPage, closedHostingTotalPage - 1)
      : 0;

  const pagedClosedHostingItems = useMemo(() => {
    const startIndex = safeClosedHostingPage * CLOSED_HOSTING_PAGE_SIZE;
    const endIndex = startIndex + CLOSED_HOSTING_PAGE_SIZE;
    return hostingSections.closedHostingItems.slice(startIndex, endIndex);
  }, [hostingSections.closedHostingItems, safeClosedHostingPage]);

  const errorMessage = useMemo(
    () =>
      currentQuery.error?.response?.data?.message ??
      "내 일정 정보를 불러오지 못했습니다.",
    [currentQuery.error]
  );

  const tabCounts = useMemo(
    () => ({
      participating: tabItems.participating.length,
      pending: tabItems.pending.length,
      hosting: tabItems.hosting.length,
    }),
    [tabItems]
  );

  const emptyStateCopy = useMemo(() => {
    if (!email) {
      return {
        title: "로그인 후 내 일정을 확인해 주세요",
        description: "참여한 일정과 신청한 일정을 한곳에서 관리할 수 있어요.",
        actionLabel: "로그인하기",
        actionPath: "/login",
      };
    }

    if (activeTab === "pending") {
      return {
        title: "아직 신청한 일정이 없어요.",
        description: "참여하고 싶은 일정을 신청해보세요.",
        actionLabel: "일정 탐색하기",
        actionPath: "/explore",
      };
    }

    if (activeTab === "hosting") {
      return {
        title: "아직 만든 일정이 없어요.",
        description: "함께하고 싶은 하루를 직접 만들어보세요.",
        actionLabel: "일정 만들기",
        actionPath: "/write",
      };
    }

    return {
      title: "아직 참여 확정된 일정이 없어요.",
      description: "마음에 드는 일정을 찾아 함께해보세요.",
      actionLabel: "일정 탐색하기",
      actionPath: "/explore",
    };
  }, [activeTab, email]);

  const handleCloseFeedback = useCallback((event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setFeedback(null);
  }, []);

  const showFeedback = useCallback((severity, message) => {
    setFeedback({ severity, message });
  }, []);

  const runScheduleMutation = useCallback(
    async ({ request, successMessage, failureMessage, confirmMessage }) => {
      if (confirmMessage && !window.confirm(confirmMessage)) {
        return;
      }

      try {
        await request();
        showFeedback("success", successMessage);
      } catch (mutationError) {
        showFeedback(
          "error",
          mutationError?.response?.data?.message ?? failureMessage
        );
      }
    },
    [showFeedback]
  );

  const handleScheduleAction = useCallback(
    async (item, action = "detail") => {
      if (!email) {
        navigate("/login", { replace: true });
        return;
      }

      if (action === "detail" || action === "manage") {
        navigate(`/schedule/${item.scheduleId}`);
        return;
      }

      if (action === "chat") {
        navigate(`/schedule/${item.scheduleId}`, {
          state: { focusSection: "chat-link" },
        });
        return;
      }

      if (action === "cancel" && item.participationId) {
        await runScheduleMutation({
          confirmMessage: "이 일정 신청을 취소하시겠습니까?",
          successMessage: "일정 신청이 취소되었습니다.",
          failureMessage:
            "신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          request: () =>
            cancelParticipation({
              participationId: item.participationId,
              email,
            }),
        });
        return;
      }

      if (action === "delete" && item.participationId) {
        await runScheduleMutation({
          confirmMessage: "이 참여 내역을 삭제하시겠습니까?",
          successMessage: "참여 내역이 삭제되었습니다.",
          failureMessage: "삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.",
          request: () =>
            deleteParticipation({
              participationId: item.participationId,
              email,
            }),
        });
      }
    },
    [
      cancelParticipation,
      deleteParticipation,
      email,
      navigate,
      runScheduleMutation,
    ]
  );

  const handleTabChange = useCallback((nextTab) => {
    setActiveTab(nextTab);

    if (nextTab === "hosting") {
      setClosedHostingPage(0);
    }
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.contentShell}>
        <ParticipationFeedback
          feedback={feedback}
          onClose={handleCloseFeedback}
        />

        <section className={styles.tabsSection}>
          <ParticipationTabs
            tabs={PARTICIPATION_TABS}
            counts={tabCounts}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </section>

        <section className={styles.listSection}>
          {activeTab === "hosting" ? (
            <div className={styles.hostingSections}>
              <section className={styles.scheduleSection}>
                <div className={styles.sectionHeader}>
                  <h3 className={styles.sectionTitle}>진행 중 일정</h3>
                  <p className={styles.sectionDescription}>
                    모집중 상태이거나 아직 일정완료/일정취소로 전환되지 않은 일정입니다.
                  </p>
                </div>

                <ParticipationList
                  items={hostingSections.activeHostingItems}
                  loading={currentQuery.isPending}
                  errorMessage={currentQuery.error ? errorMessage : ""}
                  emptyTitle="진행 중인 일정이 없어요."
                  emptyDescription="현재 운영 중인 일정이 생기면 이곳에서 바로 확인할 수 있어요."
                  emptyActionLabel="일정 만들기"
                  onEmptyAction={() => navigate("/write")}
                  onItemAction={handleScheduleAction}
                  isActionLoading={isMutationPending}
                  itemKeyPrefix="hosting-active"
                />
              </section>

              {hostingSections.closedHostingItems.length > 0 ? (
                <section className={styles.closedSection}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.closedHeadingRow}>
                      <div>
                        <h3 className={styles.sectionTitle}>모집마감/완료/취소 일정</h3>
                        <p className={styles.sectionDescription}>
                          모집마감, 일정완료, 일정취소 상태의 일정입니다.
                        </p>
                      </div>

                      <button
                        type="button"
                        className={styles.closedToggleButton}
                        onClick={() => setShowClosedHosting((prev) => !prev)}
                      >
                        {showClosedHosting
                          ? "종료 상태 일정 숨기기"
                          : `종료 상태 일정 보기 (${hostingSections.closedHostingItems.length})`}
                      </button>
                    </div>
                  </div>

                  {showClosedHosting ? (
                    <>
                      <ParticipationList
                        items={pagedClosedHostingItems}
                        loading={currentQuery.isPending}
                        errorMessage={currentQuery.error ? errorMessage : ""}
                        emptyTitle="종료 상태 일정이 없습니다."
                        emptyDescription="아직 모집마감, 일정완료, 일정취소 상태 일정이 없어요."
                        onItemAction={handleScheduleAction}
                        isActionLoading={isMutationPending}
                        itemKeyPrefix="hosting-closed"
                      />

                      {closedHostingTotalPage > 1 ? (
                        <div className={styles.paginationWrap}>
                          <Pagination
                            page={safeClosedHostingPage}
                            setPage={setClosedHostingPage}
                            totalPage={closedHostingTotalPage}
                            naviSize={CLOSED_HOSTING_NAV_SIZE}
                          />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </section>
              ) : null}
            </div>
          ) : (
            <ParticipationList
              key={activeTab}
              items={currentItems}
              loading={currentQuery.isPending}
              errorMessage={currentQuery.error ? errorMessage : ""}
              emptyTitle={emptyStateCopy.title}
              emptyDescription={emptyStateCopy.description}
              emptyActionLabel={emptyStateCopy.actionLabel}
              onEmptyAction={() => navigate(emptyStateCopy.actionPath)}
              onItemAction={handleScheduleAction}
              isActionLoading={isMutationPending}
              itemKeyPrefix={activeTab}
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default MySchedulePage;
