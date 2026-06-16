import { api } from "../../auth/api";

// 로그인한 사용자 자신의 마이페이지 조회용
// 기존 수정 페이지 API를 그대로 재사용하므로, 내 프로필에서는 프런트 계약을 최소 수정으로 유지할 수 있다.
export const getMypageData = async () => {
  const response = await api.get("/users/mypage/edit");
  // console.log("마이페이지 조회 응답:", response.data);
  return response.data;
};

// 다른 사용자 공개 프로필 조회용
// email 은 path segment 로 들어가므로, @ 같은 문자가 깨지지 않게 URL 인코딩을 적용한다.
export const getUserProfileData = async (email) => {
  const response = await api.get(`/users/profile/${encodeURIComponent(email)}`);
  // console.log("공개 프로필 조회 응답:", response.data);
  return response.data;
};

export const getMypageEditData = async () => {
  const response = await api.get("/users/mypage/edit");

  return response.data;
};

export const updateMypageData = async (data) => {
  const response = await api.post("/users/mypage/edit", data);

  return response.data;
};

export const withdrawMe = async () => {
  const response = await api.delete("/users/me");

  return response.data;
};

export const uploadMypageProfileImage = async (file) => {
  const formData = new FormData();
  formData.append("profileFile", file);

  const response = await api.post("/users/mypage/profile-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};
