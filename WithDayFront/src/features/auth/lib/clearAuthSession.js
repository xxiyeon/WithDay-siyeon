import OneSignal from "../../../shared/lib/oneSignal";
import {
  AUTH_STORAGE_KEY,
  useAuthStore,
} from "../store/authStore";

const LEGACY_AUTH_KEYS = ["accessToken", "refreshToken", "user", "token"];

const clearBrowserAuthStorage = (storage) => {
  storage.removeItem(AUTH_STORAGE_KEY);

  LEGACY_AUTH_KEYS.forEach((key) => {
    storage.removeItem(key);
  });
};

// 로그아웃/탈퇴/토큰 만료가 서로 다른 화면에서 발생해도
// 세션 정리 규칙은 한 곳으로 모아야 스토리지 찌꺼기나 푸시 세션 누락이 남지 않는다.
export const clearAuthSession = async () => {
  useAuthStore.getState().setLogout();

  clearBrowserAuthStorage(window.localStorage);
  clearBrowserAuthStorage(window.sessionStorage);

  try {
    if (OneSignal?.logout) {
      await OneSignal.logout();
    }
  } catch (error) {
    console.error("OneSignal 로그아웃 실패:", error);
  }
};
