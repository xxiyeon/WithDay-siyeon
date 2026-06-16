import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { useMypage } from "../../features/user/mypage/useMypage";
import { useAuthStore } from "../../features/auth/store/authStore";
import LayoutContainer from "../../shared/ui/LayoutContainer/LayoutContainer";
import NotificationPopover from "../../features/notification/ui/NotificationPopover";
import Badge from "@mui/material/Badge";
import { getNotificationCount } from "../../features/notification/api";

const DEFAULT_PROFILE_IMAGE = "/logo.png";

export default function Header() {
  const navigate = useNavigate();

  const { user: loginUser, isLoggedIn } = useAuthStore();
  const { mypageQuery } = useMypage(undefined, isLoggedIn);

  const headerProfileImage = isLoggedIn
    ? mypageQuery.data?.profileImage ||
      loginUser?.profileImage ||
      DEFAULT_PROFILE_IMAGE
    : DEFAULT_PROFILE_IMAGE;

  const avatarFallback = isLoggedIn
    ? (
        loginUser?.nickname?.trim()?.charAt(0) ||
        loginUser?.email?.trim()?.charAt(0) ||
        ""
      ).toUpperCase()
    : "";

  const handleProfileClick = () => {
    if (isLoggedIn && loginUser?.email) {
      navigate(`/mypage/${loginUser.email}`);
      return;
    }

    navigate("/login");
  };

  const { data: notificationCount = 0 } = useQuery({
    queryKey: ["notification-count", loginUser?.email],
    queryFn: () => getNotificationCount(loginUser.email),
    // 로그인 상태와 로그인한 유저의 이메일 값이 있을 때만 API실행하도록 함
    enabled: !!(isLoggedIn && loginUser?.email),
    refetchOnWindowFocus: true, // 사용자가 앱/탭에 다시 들어왔을 때만 최신화되도록 자동 재조회
  });

  // 팝오버가 붙을 기준 DOM 요소
  const [anchorEl, setAnchorEl] = useState(null);

  const handleNotificationClick = (event) => {
    setAnchorEl(event.currentTarget); // ahchorEl 설정
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <header className={styles.header}>
      <LayoutContainer className={styles.contentShell}>
        <div className={styles.leftGroup}>
          <button
            type="button"
            className={styles.logoButton}
            onClick={() => navigate("/")}
            aria-label="WithDay 홈으로 이동"
          >
            <img
              src="/withday_logo.png"
              alt="WithDay"
              className={styles.logoImage}
            />
          </button>
        </div>

        <div className={styles.rightGroup}>
          {isLoggedIn && (
            <>
              <IconButton
                className={styles.actionButton}
                aria-label="알림"
                onClick={handleNotificationClick} //AnchorEl으로 설정
              >
                <Badge
                  color="error"
                  variant="dot" // 읽지 않은 알림 있을 때 빨간 점 표시하도록 설정
                  invisible={notificationCount === 0} // 읽지 않은 알림 있을 때는 점이 사라지도록
                >
                  <NotificationsNoneRoundedIcon />
                </Badge>
              </IconButton>

              <NotificationPopover // 알림창 Popover
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                handleClose={handleClose}
              />
            </>
          )}

          <IconButton
            className={styles.actionButton}
            aria-label="마이페이지"
            onClick={handleProfileClick}
          >
            <Avatar src={headerProfileImage} className={styles.profileAvatar}>
              {avatarFallback || <PersonOutlineRoundedIcon fontSize="small" />}
            </Avatar>
          </IconButton>
        </div>
      </LayoutContainer>
    </header>
  );
}
