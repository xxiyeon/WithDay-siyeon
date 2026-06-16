import "./app/styles/fonts.css";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./app/queryClient.js";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ScrollToTop from "./features/ui/ScrollToTop.jsx";

// .env에 숨겨둔 클라이언트 ID 가져오기
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FONT_FAMILY_BASE =
  '"Suit", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const appTheme = createTheme({
  typography: {
    fontFamily: FONT_FAMILY_BASE,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          fontFamily: FONT_FAMILY_BASE,
        },
        body: {
          fontFamily: FONT_FAMILY_BASE,
        },
        "#root": {
          fontFamily: FONT_FAMILY_BASE,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY_BASE,
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY_BASE,
        },
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY_BASE,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY_BASE,
        },
        message: {
          fontFamily: FONT_FAMILY_BASE,
        },
      },
    },
    MuiButtonBase: {
      styleOverrides: {
        root: {
          fontFamily: FONT_FAMILY_BASE,
        },
      },
    },
  },
});

createRoot(document.getElementById("root")).render(
  // App 전체를 구글 프로바이더로 감싸줍니다
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <BrowserRouter>
        {/* 페이지 이동 시 항상 맨 위로 이동하도록 */}
        <ScrollToTop />
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  </GoogleOAuthProvider>,
);
