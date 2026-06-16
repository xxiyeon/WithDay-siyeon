import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import styles from "./AdminPage.module.css";

import AdminSidebar from "../../features/admin/ui/AdminSidebar";
import MemberManagementPage from "../../features/admin/ui/MemberManagementPage";
import { useAuthStore } from "../../features/auth/store/authStore";
import Dashboard from "../../features/admin/ui/Dashboard";
import ScheduleManagementPage from "../../features/admin/ui/ScheduleManagementPage";
import AdminSignupSettingPage from "../../features/admin/ui/AdminSignupSettingPage";
import AdminInterestPage from "../../features/admin/ui/AdminInterestPage";

const AdminPage = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  // 관리자만 페이지에 진입할 수 있도록 설정
  if (user.status !== "admin") {
    // replace - react-router-dom의 Navigate가 브라우저 히스토리를 교체할지 여부를 결정하는 속성
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.admin_wrap}>
      {/* 모바일 헤더 */}
      <header className={styles.mobile_header}>
        <IconButton onClick={() => setDrawerOpen(true)} size="large">
          <MenuIcon />
        </IconButton>

        <h2>WithDay Admin</h2>
      </header>

      {/* PC 사이드바 */}
      <aside className={styles.sidebar}>
        <AdminSidebar />
      </aside>

      {/* 모바일 Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 240,
            height: "100dvh",
            overflow: "hidden",
          },
        }}
      >
        <AdminSidebar closeDrawer={() => setDrawerOpen(false)} />
      </Drawer>

      {/* 오른쪽 컨텐츠 */}
      <main className={styles.content}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
        </Routes>
        <Routes>
          <Route path="member" element={<MemberManagementPage />} />
        </Routes>
        <Routes>
          <Route path="schedule" element={<ScheduleManagementPage />} />
        </Routes>
        <Routes>
          <Route path="interests" element={<AdminInterestPage />} />
        </Routes>
        <Routes>
          <Route path="setting" element={<AdminSignupSettingPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminPage;
