import clsx from "clsx";
import {
  BottomNavigation,
  BottomNavigationAction,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
} from "@mui/material";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../features/auth/store/authStore";
import styles from "./BottomNav.module.css";

const getTabValue = (pathname) => {
  if (pathname.startsWith("/explore")) {
    return 1;
  }

  if (pathname.startsWith("/write") || pathname.startsWith("/recommended")) {
    return 2;
  }

  if (pathname.startsWith("/my-schedule")) {
    return 3;
  }

  if (pathname.startsWith("/wishlist")) {
    return 4;
  }

  return 0;
};

const NAV_ITEMS = [
  {
    label: "홈",
    activeIcon: HomeRoundedIcon,
    inactiveIcon: HomeOutlinedIcon,
    route: "/",
  },
  {
    label: "탐색",
    activeIcon: ManageSearchIcon,
    inactiveIcon: SearchRoundedIcon,
    route: "/explore",
  },
  {
    label: "",
    activeIcon: AddRoundedIcon,
    inactiveIcon: AddRoundedIcon,
    route: "add-menu",
    isAdd: true,
  },
  {
    label: "내 일정",
    activeIcon: CalendarMonthRoundedIcon,
    inactiveIcon: CalendarMonthOutlinedIcon,
    route: "/my-schedule",
  },
  {
    label: "위시리스트",
    activeIcon: FavoriteRoundedIcon,
    inactiveIcon: FavoriteBorderRoundedIcon,
    route: "/wishlist",
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  const value = getTabValue(location.pathname);

  const closeAddMenu = () => {
    setIsAddMenuOpen(false);
  };

  const handleAddButtonClick = () => {
    // 로그인 안 된 상태에서는 기존 로그인 필요 기능들과 동일하게
    // 우선 보호 라우트(/write)로 보내고, PrivateRoute가 로그인 페이지로 이동시킴.
    if (!isLoggedIn) {
      setIsAddMenuOpen(false);
      navigate("/write");
      return;
    }

    setIsAddMenuOpen((prev) => !prev);
  };

  const handleDirectWrite = () => {
    setIsAddMenuOpen(false);
    navigate("/write");
  };

  const handleRecommendedSchedule = () => {
    setIsAddMenuOpen(false);
    navigate("/recommended-schedules");
  };

  const handleChange = (event, newValue) => {
    switch (newValue) {
      case 0:
        setIsAddMenuOpen(false);
        navigate("/");
        break;
      case 1:
        setIsAddMenuOpen(false);
        navigate("/explore");
        break;
      case 2:
        handleAddButtonClick();
        break;
      case 3:
        setIsAddMenuOpen(false);
        navigate("/my-schedule");
        break;
      case 4:
        setIsAddMenuOpen(false);
        navigate("/wishlist");
        break;
      default:
        break;
    }
  };

  return (
    <div className={styles.wrapper}>
      <BottomNavigation
        className={styles.innerNav}
        value={value}
        onChange={handleChange}
        showLabels
      >
        {NAV_ITEMS.map((item, index) => {
          const isActive = value === index;
          const Icon = isActive ? item.activeIcon : item.inactiveIcon;

          return (
            <BottomNavigationAction
              key={item.route}
              label={item.label}
              className={clsx(
                styles.navAction,
                isActive && styles.navActionActive,
                item.isAdd && styles.navActionAddSpacer,
              )}
              icon={
                item.isAdd ? (
                  <span className={styles.addButtonSpacer} />
                ) : (
                  <Icon className={styles.navIcon} />
                )
              }
            />
          );
        })}
      </BottomNavigation>

      <SpeedDial
        ariaLabel="일정 작성 메뉴"
        className={styles.addSpeedDial}
        icon={
          <SpeedDialIcon
            icon={<AddRoundedIcon />}
            openIcon={<AddRoundedIcon />}
          />
        }
        open={isAddMenuOpen}
        onClose={closeAddMenu}
        direction="up"
        FabProps={{
          className: styles.addSpeedDialFab,
          onClick: handleAddButtonClick,
        }}
      >
        <SpeedDialAction
          icon={
            <Tooltip title="직접 글쓰기" placement="left" arrow>
              <EditNoteRoundedIcon />
            </Tooltip>
          }
          onClick={handleDirectWrite}
          FabProps={{
            className: styles.speedDialActionFab,
          }}
        />

        <SpeedDialAction
          icon={
            <Tooltip title="추천 일정" placement="left" arrow> 
              <AutoAwesomeRoundedIcon />
            </Tooltip>
          }
          onClick={handleRecommendedSchedule}
          FabProps={{
            className: styles.speedDialActionFab,
          }}
        />
      </SpeedDial>
    </div>
  );
}
