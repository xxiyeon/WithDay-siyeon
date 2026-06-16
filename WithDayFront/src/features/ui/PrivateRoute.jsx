import { useAuthStore } from "../auth/store/authStore";
import { clearAuthSession } from "../auth/lib/clearAuthSession";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const PrivateRoute = ({ children }) => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isTokenExpired = useAuthStore((state) => state.isTokenExpired);

  const navigate = useNavigate();

  const isExpired = isLoggedIn && isTokenExpired();
  const shouldBlock = !isLoggedIn || isExpired;

  useEffect(() => {
    if (isExpired) {
      void clearAuthSession();
    }

    if (shouldBlock) {
      const timer = setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            toastMessage: isExpired
              ? "로그인 시간이 만료되었습니다. 다시 로그인해주세요."
              : "로그인이 필요한 기능입니다.",
            toastSeverity: "warning",
          },
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isExpired, shouldBlock, navigate]);

  if (shouldBlock) {
    return (
      <Snackbar
        open={true}
        autoHideDuration={1500}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{
          top: {
            xs: "100px", // 모바일
            sm: "80px", // 태블릿
            md: "100px", // PC
          },
        }}
      >
        <Alert severity="warning" variant="filled">
          {isExpired
            ? "로그인 시간이 만료되었습니다"
            : "로그인이 필요한 기능입니다"}
        </Alert>
      </Snackbar>
    );
  }

  // 로그인 인증 완료 시
  return children;
};

export default PrivateRoute;
