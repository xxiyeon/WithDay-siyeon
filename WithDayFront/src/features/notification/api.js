import axios from "axios";
import { useAuthStore } from "../auth/store/authStore";

const BASE_URL = import.meta.env.VITE_BACKSERVER;

export const api = axios.create({
  baseURL: `${BASE_URL}`,
});

// 인증에 필요한 토큰을 로그인 후 최신 토큰 반영
// interceptors -  then 또는 catch로 처리 전 요청/응답을 가로챈다
// interceptors.request - 요정 보내기 전 하는 작업으로 사용
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  // console.log("인터셉터 실행");
  // console.log("토큰:", token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 알림 개수 조회
export const getNotificationCount = async () => {
  // 백엔드에서 현재 로그인한 사용자를 꺼내 그 사람의 알림만 조회하도록 설정
  const response = await api.get("/notifications/count", {
    headers: {
      // 현재 Zustand에 저장된 토큰을 꺼내 서버로 전달
      Authorization: `Bearer ${useAuthStore.getState().token}`,
    },
  });

  return response.data;
};

// 알림 조회
export const getNotifications = async () => {
  // 백엔드에서 현재 로그인한 사용자를 꺼내 그 사람의 알림만 조회하도록 설정
  const response = await api.get("/notifications", {
    headers: {
      Authorization: `Bearer ${useAuthStore.getState().token}`,
    },
  });

  return response.data;
};

// 알림 전체 읽음 처리
export const readAllNotification = async () => {
  const response = await api.patch(`/notifications/read`);

  return response.data;
};

// 알림 1개 읽음 처리
export const readNotification = async (notificationId) => {
  const response = await api.patch(`/notifications/${notificationId}/read`);

  return response.data;
};

// 알림 동의 여부 조회
export const getNotificationTerm = async (token) => {
  const response = await api.get("/notifications/notification-term", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
};

// 알림 한 개 삭제
export const deleteNotification = async (notificationId) => {
  const response = await api.delete(`/notifications/${notificationId}`);

  return response.data;
};

// 읽은 알림 전체 삭제
export const deleteReadNotifications = async () => {
  const response = await api.delete("/notifications/read");

  return response.data;
};

// 알림 전체 삭제
export const deleteAllNotifications = async () => {
  const response = await api.delete("/notifications");

  return response.data;
};
