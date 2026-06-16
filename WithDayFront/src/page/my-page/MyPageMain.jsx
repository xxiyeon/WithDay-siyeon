import styles from "./MyPageMain.module.css";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import { useAuthStore } from "../../features/auth/store/authStore";
import { clearAuthSession } from "../../features/auth/lib/clearAuthSession";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMypage } from "../../features/user/mypage/useMypage";
import InterestIcon from "../../shared/ui/InterestIconRenderer/InterestIconRenderer";
import { useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Calendar,
  User,
  CalendarCheck,
  UsersRound,
  BadgeCheck,
  ChevronDown,
  MessageCircle,
  BookHeart,
  X,
  ArrowRight,
} from "lucide-react";

const MyPageMain = () => {
  const navigate = useNavigate();
  const { email: targetEmail } = useParams();
  const loginUser = useAuthStore((state) => state.user);
  // 이메일은 URL 인코딩된 상태로 들어올 수 있으므로 decode 후 비교해야 본인 여부 판별이 틀어지지 않는다.
  const normalizedTargetEmail = targetEmail
    ? decodeURIComponent(targetEmail)
    : "";
  // /mypage 또는 /mypage/{내 이메일} 은 자기 프로필, 그 외 /mypage/{다른 이메일} 은 타인 프로필로 본다.
  const isOwnProfile =
    !normalizedTargetEmail || normalizedTargetEmail === loginUser?.email;
  const { mypageQuery } = useMypage(
    isOwnProfile ? undefined : normalizedTargetEmail,
  );
  const isAdmin = mypageQuery.data?.status === "admin";
  const [isServiceOpen, setIsServiceOpen] = useState(false);
  const [activeServiceTab, setActiveServiceTab] = useState("recommend");
  const [isWitLogInfoOpen, setIsWitLogInfoOpen] = useState(false);
  const queryClient = useQueryClient();
  const serviceTabs = [
    {
      key: "recommend",
      label: "추천 일정 기반 서비스",
      title: "WITH DAY 소개",
      description:
        "WITH DAY는 여행 코스, 팝업스토어 방문 일정, 전시 및 문화생활 코스, 맛집·카페 일정, 드라이브 및 액티비티 일정 등 혼자 가기엔 조금 아쉽고\n 함께하면 더 즐거운 순간들을 연결하는 일정 기반 동행 플랫폼입니다.\n추천 일정 탐색부터 일정 생성, 참여 신청, 승인, 일정 관리까지 하나의 흐름으로 자연스럽게 이어질 수 있도록 설계했습니다.\n단순한 모집 게시판이 아닌, 추천 일정 기반 구조를 통해 더 신뢰도 높은 일정 경험을 제공하는 것을 목표로 합니다.",
    },
    {
      key: "create",
      label: "일정 생성 및 참여",
      title: "일정 생성 및 참여",
      description:
        "사용자는 관심 있는 주제와 지역을 바탕으로 직접 일정을 만들거나 다른 사용자가 만든 일정에 참여할 수 있습니다.\n일정에는 다음 정보가 포함됩니다.\n- 일정 기간\n- 모집 인원\n- 지역\n- 카테고리\n- 비용 정보\n- 외부 채팅 링크\n등 실제 일정 운영에 필요한 정보를 함계 제공합니다.",
    },
    {
      key: "approval",
      label: "참여 신청 및 승인 구조",
      title: "참여 신청 및 승인 구조",
      description:
        "WITH DAY는 호스트가 신청자를 확인하고 승인하는 구조를 중심으로 운영됩니다.\n호스트는 참여 신청자를 확인한 뒤\n- 승인\n- 거절\n- 모집 마감\n- 참여 제외\n등의 관리를 진행할 수 있습니다.\n이를 통해 일정의 목적과 분위기에 맞는 참여자를 선택할 수 있고, 더 안정적인 동행 경험을 제공합니다.",
    },
    {
      key: "chat",
      label: "외부 채팅 및 캘린더 지원",
      title: "외부 채팅 및 캘린더 지원",
      description:
        "일정 진행을 위해 다음 기능을 지원합니다.\n- 카카오톡 오픈채팅 링크\n- 디스코드 링크\n- 텔레그램 링크\n- 구글 캘린더 등록\n실제 일정 진행까지 더 자연스럽게 이어질 수 있도록 구성했습니다.",
    },
    {
      key: "privacy",
      label: "개인정보 보호 정책",
      title: "개인정보 보호 정책",
      description:
        "WITH DAY는 서비스 제공에 필요한 최소한의 개인정보를 수집하며, 회원 식별, 일정 참여, 알림 제공 등 서비스 운영 목적에 맞게 사용합니다.\n승인 이전에는 다음 정보만 공개됩니다.\n- 닉네임\n- 프로필 이미지\n- 자기소개\n승인 이후에만 확인 가능한 정보\n- 외부 채팅 링크\n- 참여자 정보\n전화번호 및 이메일 등 민감 정보는 서비스 내에서 직접 공개되지 않습니다.",
    },
    {
      key: "operation",
      label: "운영 및 신고 정책",
      title: "운영 및 신고 정책",
      description:
        "WITH DAY는 사용자가 안전하고 쾌적하게 서비스를 이용할 수 있도록 운영 정책을 마련하고 있습니다.\n부적절한 일정, 허위 정보, 불쾌감을 주는 행위 등은 신고 대상이 될 수 있습니다.\n신고 가능 항목 예시\n- 반복적인 일정 파기\n- 비매너 행동\n- 부적절한 채팅\n- 광고 및 홍보 행위\n운영 정책 위반 시 일부 기능 제한 또는 서비스 이용 제한이 적용될 수 있습니다.",
    },
    {
      key: "support",
      label: "고객 문의",
      title: "고객 문의",
      description:
        "문의 사항은 아래 채널을 통해 접수하실 수 있습니다.\n이메일: support@withday.kr\n운영시간: 평일 오전 10:00 ~ 오후 6:00",
    },
    {
      key: "company",
      label: "회사 정보",
      title: "회사 정보",
      description:
        "서비스명: WITH DAY\n서비스 유형: 추천 일정 기반 동행 플랫폼\n대표자: 홍길동\n사업자등록번호: 000-00-00000\n통신판매업 신고번호: 2025-서울강남-00000",
    },
    {
      key: "copyright",
      label: "저작권 안내",
      title: "저작권 안내",
      description:
        "WITH DAY 내 이미지 및 콘텐츠의 저작권은 각 작성자 또는 운영사에 귀속됩니다.\n서비스 내 콘텐츠의 무단 복제 및 상업적 이용을 금지합니다.",
    },
  ];

  const activeService =
    serviceTabs.find((tab) => tab.key === activeServiceTab) ?? serviceTabs[0];

  if (mypageQuery.isLoading) {
    return <div>불러오는 중...</div>;
  }

  if (mypageQuery.isError) {
    const errorStatus = mypageQuery.error?.response?.status;
    const errorMessage = mypageQuery.error?.response?.data;

    // 없는 사용자와 일반 서버 오류를 같은 문구로 보여주면 원인을 오해하기 쉬우므로 404는 별도 처리한다.
    if (errorStatus === 404) {
      return <div>존재하지 않는 사용자입니다.</div>;
    }

    // 401/500/네트워크 오류 등은 서버 메시지가 있으면 우선 그대로 보여준다.
    return <div>{errorMessage || "프로필 정보를 불러오지 못했습니다."}</div>;
  }

  const mypage = mypageQuery.data;

  const nickname = mypage?.nickname || "닉네임";
  const email = mypage?.email || loginUser?.email || "이메일 정보 없음";
  const profileImage = mypage?.profileImage || "/logo.png";
  const selectedInterestIds = mypage?.selectedInterestIds ?? [];
  const allInterests = mypage?.allInterests ?? [];

  const formatDateOnly = (dateValue) => {
    if (!dateValue) return "정보 없음";
    return String(dateValue).slice(0, 10).replaceAll("-", ".");
  };
  const formatScheduleDate = (startDate, endDate) => {
    if (!startDate) return "날짜 미정";

    const start = String(startDate).slice(0, 10).replaceAll("-", ".");
    const end = endDate
      ? String(endDate).slice(0, 10).replaceAll("-", ".")
      : "";

    if (!end || start === end) {
      return start;
    }

    return `${start} ~ ${end}`;
  };

  //상단 조회데이터 3종
  const togetherScheduleCount = mypage?.togetherScheduleCount ?? 0;
  const metWitCount = mypage?.metWitCount ?? 0;
  const joinDate = formatDateOnly(mypage?.createdAt);

  // 위트 로그는 백엔드가 "보여줘야 할 completed 일정"만 골라서 내려준다는 전제 아래 그대로 렌더한다.
  const mySchedules = mypageQuery.data?.mySchedules ?? [];
  const selectedInterests = allInterests.filter((interest) =>
    selectedInterestIds
      .map(Number)
      .includes(Number(interest.interestId ?? interest.id)),
  );
  const intro =
    mypage?.intro ||
    (isOwnProfile
      ? // 자기 프로필에서는 수정 유도 문구가 자연스럽다.
        "아직 등록된 소개글이 없습니다. 회원정보 수정에서 소개글을 작성해보세요."
      : // 타인 프로필에서 상대에게 수정하라고 안내하면 어색하므로 중립 문구를 쓴다.
        "아직 등록된 소개글이 없습니다.");

  return (
    <div>
      <section>
        <div className={styles.profile_Box}>
          <div className={styles.profile_wrapper}>
            {/* 왼쪽 프로필 영역 */}
            <div className={styles.profile_left}>
              <div className={styles.image_wrapper}>
                <img
                  src={profileImage}
                  alt="프로필"
                  className={styles.profile_img}
                />

                {isOwnProfile && loginUser?.email ? (
                  <button
                    type="button"
                    className={styles.retouch_btn}
                    // 수정 버튼은 본인 프로필에서만 노출해 1차 UX 차단을 하고, 수정 화면/백엔드가 다시 최종 검증한다.
                    onClick={() =>
                      navigate(
                        `/mypage/edit/${encodeURIComponent(loginUser.email)}`,
                      )
                    }
                    aria-label="프로필 수정"
                  >
                    <EditCalendarOutlinedIcon />
                  </button>
                ) : null}
              </div>

              <div className={styles.profile_text}>
                <span className={styles.my_nickname}>{nickname}</span>
                <span className={styles.my_email}>{email}</span>

                {isOwnProfile ? (
                  <div className={styles.buttonRow}>
                    <button
                      type="button"
                      className={styles.logout}
                      onClick={() => void clearAuthSession()}
                    >
                      로그아웃
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        className={styles.profileActionButton}
                        // 관리자 페이지 이동은 "현재 로그인한 내 계정" 맥락에서만 의미가 있어 타인 프로필에서는 숨긴다.
                        onClick={() => navigate("/admin/dashboard")}
                      >
                        관리자 페이지
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            {/* 오른쪽 요약 영역 */}
            <div className={styles.profile_summary}>
              <div className={styles.summary}>
                <CalendarCheck className={styles.summary_icon} size={18} />
                <span className={styles.summary_label}>My Track</span>
                <span className={styles.summary_value}>
                  {togetherScheduleCount}회
                </span>
                <span className={styles.summary_desc}>함께한 일정</span>
              </div>

              <div className={styles.summary}>
                <UsersRound className={styles.summary_icon} size={18} />
                <span className={styles.summary_label}>With Wits</span>
                <span className={styles.summary_value}>{metWitCount}명</span>
                <span className={styles.summary_desc}>만난 위트</span>
              </div>

              <div className={styles.summary}>
                <BadgeCheck className={styles.summary_icon} size={18} />
                <span className={styles.summary_label}>가입일</span>
                <span className={styles.summary_value}>{joinDate}</span>
                <span className={styles.summary_desc}>여정 시작일</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className={styles.Inter_container}>
          <div className={styles.Interest}>
            Interest | {isOwnProfile ? "나의 관심사" : `${nickname}님의 관심사`}
          </div>

          <div className={styles.int_boxs}>
            {selectedInterests.length > 0 ? (
              selectedInterests.map((interest) => {
                const interestId = Number(interest.interestId ?? interest.id);
                const interestName = interest.interestName ?? interest.name;
                const iconName = interest.iconName;

                return (
                  <div className={styles.int_btn} key={interestId}>
                    <InterestIcon iconName={iconName} size={18} />
                    <span>{interestName}</span>
                  </div>
                );
              })
            ) : (
              <div className={styles.emptyInterest}>
                아직 선택한 관심사가 없습니다.
              </div>
            )}
          </div>

          <div className={styles.intro_box}>
            <div className={styles.intro}>
              <span>{isOwnProfile ? "소갯말" : `${nickname}님의 소갯말`}</span>
            </div>
            <div className={styles.intro_text}>
              <span>{intro}</span>
            </div>
          </div>

          <div className={styles.log_container}>
            <div className={styles.log_title}>
              <div className={styles.Interest}>
                My Wit Log |{" "}
                {isOwnProfile ? "나의 위트 로그" : `${nickname}님의 위트 로그`}
              </div>
            </div>
            <div className={styles.scroll_wrapper}>
              <div className={styles.log_box}>
                {mySchedules.length > 0 ? (
                  mySchedules.map((schedule) => {
                    const scheduleId = schedule.id ?? schedule.scheduleId;
                    const title = schedule.title || "제목 없는 일정";

                    const regionText = [schedule.region, schedule.detailRegion]
                      .filter(Boolean)
                      .join(" ");

                    const dateText = formatScheduleDate(
                      schedule.startDate,
                      schedule.endDate,
                    );

                    const witCount =
                      schedule.currentParticipants ??
                      schedule.witCount ??
                      schedule.participantCount ??
                      0;

                    return (
                      <div
                        key={scheduleId}
                        className={styles.log_card}
                        onClick={() => navigate(`/schedule/${scheduleId}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            navigate(`/schedule/${scheduleId}`);
                          }
                        }}
                      >
                        <img
                          src={schedule.thumbnailImage || "/dog.jpg"}
                          alt={title}
                          className={styles.dog}
                        />

                        <div className={styles.card_bottom}>
                          <h3 className={styles.card_title}>{title}</h3>

                          <div className={styles.card_info_row}>
                            <div className={styles.card_info_item}>
                              <MapPin size={13} />
                              <span>{regionText || "지역 미정"}</span>
                            </div>

                            <div className={styles.card_divider}></div>

                            <div className={styles.card_info_item}>
                              <Calendar size={13} />
                              <span>{dateText}</span>
                            </div>

                            <div className={styles.card_divider}></div>

                            <div className={styles.card_info_item}>
                              <User size={13} />
                              <span>위트 {witCount}명</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.emptyWitLogCard}>
                    {!isWitLogInfoOpen ? (
                      <>
                        <div className={styles.emptyWitTopRow}>
                          <div className={styles.emptyWitVisual}>
                            <div className={styles.emptyTicket}>
                              <span className={styles.ticketLogo}>W</span>
                              <span className={styles.ticketLine}></span>
                              <span className={styles.ticketRoute}>
                                WITH → DAY
                              </span>
                              <span className={styles.ticketSub}>
                                JOURNEY PASS
                              </span>
                            </div>

                            <div className={styles.emptyPin}></div>
                          </div>

                          <div className={styles.emptyWitTextBox}>
                            <h3 className={styles.emptyWitTitle}>
                              아직 위트 로그가 없어요
                            </h3>

                            <p className={styles.emptyWitDesc}>
                              함께한 순간을 모아,
                              <br />
                              나만의 위트 로그를 만들어보세요.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.emptyWitPrimaryButton}
                          onClick={() => navigate("/explore")}
                        >
                          일정 둘러보기
                          <ArrowRight size={16} />
                        </button>

                        <button
                          type="button"
                          className={styles.emptyWitTextButton}
                          onClick={() => setIsWitLogInfoOpen(true)}
                        >
                          위트 로그가 무엇인가요?
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.emptyWitCloseButton}
                          onClick={() => setIsWitLogInfoOpen(false)}
                          aria-label="위트 로그 설명 닫기"
                        >
                          <X size={16} />
                        </button>

                        <div className={styles.witInfoIconBox}>
                          <BookHeart size={28} />
                        </div>

                        <h3 className={styles.emptyWitTitle}>
                          위트 로그가 무엇인가요?
                        </h3>

                        <p className={styles.emptyWitDesc}>
                          위트 로그는 내가 참여하고 완료된 일정을 기록하는
                          공간이에요.
                          <br />
                          함께한 일정, 만난 위트, 다녀온 순간들이 쌓이면 나만의
                          활동 기록처럼 확인할 수 있어요.
                        </p>

                        <div className={styles.witInfoList}>
                          <div>
                            <strong>완료된 일정만 기록</strong>
                            <span>모집 중인 일정은 표시되지 않아요.</span>
                          </div>

                          <div>
                            <strong>함께한 경험 저장</strong>
                            <span>참여한 일정이 끝나면 로그로 남아요.</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section>
        <div className={styles.serviceAccordion}>
          <button
            type="button"
            className={styles.serviceAccordionHeader}
            onClick={() => setIsServiceOpen((prev) => !prev)}
            aria-expanded={isServiceOpen}
          >
            <span>WithDay 서비스 소개</span>
            <ChevronDown
              size={22}
              className={
                isServiceOpen
                  ? styles.serviceAccordionIconOpen
                  : styles.serviceAccordionIcon
              }
            />
          </button>

          {isServiceOpen && (
            <div className={styles.serviceAccordionBody}>
              <div className={styles.serviceTabList}>
                {serviceTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={
                      activeServiceTab === tab.key
                        ? `${styles.serviceTab} ${styles.serviceTabActive}`
                        : styles.serviceTab
                    }
                    onClick={() => setActiveServiceTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={styles.serviceContentCard}>
                <h3 className={styles.serviceContentTitle}>
                  {activeService.title}
                </h3>

                <p className={styles.serviceContentDesc}>
                  {activeService.description}
                </p>

                <div className={styles.serviceDivider}></div>

                <div className={styles.servicePointGrid}>
                  <div className={styles.servicePoint}>
                    <div className={styles.servicePointIcon}>
                      <CalendarCheck size={32} />
                    </div>

                    <div className={styles.servicePointTextBox}>
                      <strong className={styles.servicePointTitle}>
                        추천 일정 기반
                      </strong>
                      <span className={styles.servicePointText}>
                        맞춤 추천 일정을 통해 더 쉽게 새로운 일정을 발견할 수
                        있어요.
                      </span>
                    </div>
                  </div>

                  <div className={styles.servicePoint}>
                    <div className={styles.servicePointIcon}>
                      <UsersRound size={32} />
                    </div>

                    <div className={styles.servicePointTextBox}>
                      <strong className={styles.servicePointTitle}>
                        신뢰할 수 있는 참여 구조
                      </strong>
                      <span className={styles.servicePointText}>
                        참여 신청부터 승인까지 안전하고 투명하게 운영돼요.
                      </span>
                    </div>
                  </div>

                  <div className={styles.servicePoint}>
                    <div className={styles.servicePointIcon}>
                      <MessageCircle size={32} />
                    </div>

                    <div className={styles.servicePointTextBox}>
                      <strong className={styles.servicePointTitle}>
                        편리한 일정 경험
                      </strong>
                      <span className={styles.servicePointText}>
                        채팅, 캘린더 연동 등 다양한 기능으로 일정을 더 편하게
                        관리할 수 있어요.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MyPageMain;
