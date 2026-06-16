import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKSERVER;

export const api = axios.create({
  baseURL: `${BASE_URL}`,
});

// 대시보드 데이터 조회
export const getDashboardData = async (period) => {
  const { data } = await api.get(`/admins/dashboards`, {
    params: {
      period,
    },
  });
  return data;
};

// 약관 목록 조회
export const getAdminTerms = async () => {
  const { data } = await api.get("/admins/terms");
  return data;
};

// 약관 수정
export const updateAdminTerms = async ({ id, version, content }) => {
  const { data } = await api.put(`/admins/terms/${id}`, {
    version,
    content,
  });

  return data;
};

// 관심사 목록 조회
export const getAdminInterests = async () => {
  const { data } = await api.get("/admins/interests");
  return data;
};

// 관심사 추가
export const createAdminInterest = async ({ interestName, iconName }) => {
  const { data } = await api.post("/admins/interests", {
    interestName,
    iconName,
  });

  return data;
};

// 관심사 수정
export const updateAdminInterest = async ({ id, interestName, iconName }) => {
  const { data } = await api.put(`/admins/interests/${id}`, {
    interestName,
    iconName,
  });

  return data;
};

// 관심사 삭제
export const deleteAdminInterest = async (id) => {
  const { data } = await api.delete(`/admins/interests/${id}`);
  return data;
};

// 회원 조회
export const selectAllMember = async (params) => {
  const { data } = await api.get(`/admins/members`, {
    params,
  });
  return data;
};

// 회원 관리자로 변경
export const roleChange = async (email) => {
  const { data } = await api.patch(`/admins/members/admin/${email}`);
  return data;
};

// 회원 정지
export const suspendUser = async (email) => {
  const { data } = await api.patch(`/admins/members/suspend/${email}`);
  return data;
};

// 회원 정지 해제
export const releaseUser = async (email) => {
  const { data } = await api.patch(`/admins/members/release/${email}`);
  return data;
};

// 일정 조회
export const selectAllSchedule = async (params) => {
  const { data } = await api.get(`/admins/schedules`, {
    params,
  });
  return data;
};

// 일정 공개 상태 변경
export const updateSchedulePublic = async (scheduleId) => {
  const { data } = await api.patch(`/admins/schedules/public/${scheduleId}`);
  return data;
};

// 일정 삭제
export const deleteSchedule = async (scheduleId) => {
  const { data } = await api.delete(`/admins/schedules/delete/${scheduleId}`);
  return data;
};
