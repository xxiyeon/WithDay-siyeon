import { NavLink } from "react-router-dom";

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import EventNoteIcon from "@mui/icons-material/EventNote";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import styles from "./AdminSidebar.module.css";

const AdminSidebar = ({ closeDrawer = () => {} }) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span>WithDay</span>
        <span className={styles.admin}>Admin</span>
      </div>

      <nav className={styles.menu}>
        <NavLink
          to="/admin/dashboard"
          end
          onClick={closeDrawer}
          className={({ isActive }) =>
            isActive ? `${styles.menuItem} ${styles.active}` : styles.menuItem
          }
        >
          <DashboardOutlinedIcon />
          <span>대시보드</span>
        </NavLink>

        <NavLink
          to="/admin/member"
          onClick={closeDrawer}
          className={({ isActive }) =>
            isActive ? `${styles.menuItem} ${styles.active}` : styles.menuItem
          }
        >
          <GroupOutlinedIcon />
          <span>회원 관리</span>
        </NavLink>

        <NavLink
          to="/admin/schedule"
          onClick={closeDrawer}
          className={({ isActive }) =>
            isActive ? `${styles.menuItem} ${styles.active}` : styles.menuItem
          }
        >
          <EventNoteIcon />
          <span>일정 관리</span>
        </NavLink>

        <NavLink
          to="/admin/setting"
          onClick={closeDrawer}
          className={({ isActive }) =>
            isActive ? `${styles.menuItem} ${styles.active}` : styles.menuItem
          }
        >
          <SettingsOutlinedIcon />
          <span>설정</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default AdminSidebar;
