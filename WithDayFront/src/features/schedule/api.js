import axios from "axios";
import { useAuthStore } from "../auth/store/authStore";

const BASE_URL = import.meta.env.VITE_BACKSERVER;

/*
 * 일정 관련 API 클라이언트다.
 * Home/Explore/ScheduleDetail 모두 같은 axios 인스턴스를 사용해 baseURL과 Authorization 헤더 규칙을 공유한다.
 */
export const api = axios.create({
  baseURL: `${BASE_URL}`,
});

api.interceptors.request.use((config) => {
  /*
   * schedule feature도 로그인 사용자별 북마크/상세 권한 정보를 다루기 시작했기 때문에
   * localStorage만 직접 읽는 방식으로는 sessionStorage 로그인 사용자를 놓치게 된다.
   * authStore를 단일 source로 읽으면 자동 로그인/세션 로그인 모두 같은 경로로 토큰을 공급할 수 있다.
   */
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/*
 * 일정 상세 API다.
 * email을 함께 보내면 백엔드가 viewerIsHost, viewerParticipationStatus, viewerCanAccessChatLink를 계산해준다.
 * 이 값들은 상세 페이지에서 참여 버튼 상태와 오픈채팅 링크 노출 여부를 결정하는 데 사용된다.
 */
export const fetchScheduleDetail = async (scheduleId, email = "") => {
  const normalizedEmail = email?.trim() ?? "";
  const { data } = await api.get(`/schedules/${scheduleId}`, {
    params: normalizedEmail ? { email: normalizedEmail } : {},
  });

  if (import.meta.env.DEV) {
    console.debug("[schedule-detail] response", data);
  }

  return data;
};

// 조회수 증가는 상세 조회와 분리해서 호출한다.
// 이렇게 해두면 상세 GET 요청이 캐시되거나 재시도될 때 조회수가 함께 흔들리지 않는다.
export const incrementScheduleViewCount = async (scheduleId) => {
  await api.post(`/schedules/${scheduleId}/view`);
};

/*
 * 호스트가 일정 완료 처리 버튼을 눌렀을 때 호출하는 API다.
 * 요청 자체는 단순 POST지만, 서버에서는 아래 정책을 함께 검증한다.
 * - 요청자가 실제 호스트인지
 * - 최소 인원이 충족됐는지
 * - 현재 상태가 recruiting/closed인지
 *
 * 프런트는 "완료 처리 요청"만 보내고, 상태 전이 가능 여부의 최종 판단은 서버에 맡긴다.
 */
export const completeSchedule = async ({ scheduleId, email }) => {
  const normalizedEmail = email?.trim() ?? "";
  const { data } = await api.post(`/schedules/${scheduleId}/complete`, null, {
    params: normalizedEmail ? { email: normalizedEmail } : {},
  });

  return data;
};

/*
 * 호스트가 일정완료 취소 버튼을 눌렀을 때 호출하는 API다.
 * 서버는 이 요청을 받아 completed -> recruiting 또는 completed -> closed 중 어느 쪽으로 갈지 결정한다.
 * 즉, 프런트는 복귀 상태를 계산하지 않고 "일정완료 취소 의도"만 전달한다.
 */
export const rollbackCompletedSchedule = async ({ scheduleId, email }) => {
  const normalizedEmail = email?.trim() ?? "";
  const { data } = await api.post(
    `/schedules/${scheduleId}/complete/rollback`,
    null,
    {
      params: normalizedEmail ? { email: normalizedEmail } : {},
    }
  );

  return data;
};

/*
 * 호스트가 모집중 또는 모집마감 상태의 일정을 취소할 때 호출하는 API다.
 * canceled는 일정 자체가 더 이상 진행되지 않는 종료 상태이므로 closed와 분리해 다룬다.
 */
export const cancelSchedule = async ({ scheduleId, email }) => {
  const normalizedEmail = email?.trim() ?? "";
  const { data } = await api.post(`/schedules/${scheduleId}/cancel`, null, {
    params: normalizedEmail ? { email: normalizedEmail } : {},
  });

  return data;
};

const normalizeFilterValue = (value) => value?.trim() ?? "";

/*
 * 홈/탐색 탭의 일정 리스트 API다.
 * 같은 GET /schedules 엔드포인트를 사용하지만, 홈은 기본 목록을 받고,
 * 탐색은 사용자가 검색 버튼으로 확정한 필터만 params로 전달한다.
 */
export const fetchSchedules = async ({
  category,
  keyword,
  region,
  district,
  genderLimit,
  startDate,
  endDate,
  sort,
  email = "",
}) => {
  const params = {};

  // "전체" 카테고리는 백엔드 필터를 걸지 않는다는 의미라 category 파라미터를 생략한다.
  if (category && category !== "all") {
    params.category = category;
  }

  // 검색어는 Explore에서 검색 버튼으로 확정된 값만 들어온다.
  const normalizedKeyword = normalizeFilterValue(keyword);
  if (normalizedKeyword) {
    params.keyword = normalizedKeyword;
  }

  // Explore 지역 필터는 시/도와 시/군/구를 분리해서 보낸다.
  const normalizedRegion = normalizeFilterValue(region);
  if (normalizedRegion) {
    params.region = normalizedRegion;
  }

  const normalizedDistrict = normalizeFilterValue(district);
  if (normalizedDistrict) {
    params.district = normalizedDistrict;
  }

  if (genderLimit && genderLimit !== "all") {
    params.genderLimit = genderLimit;
  }

  if (startDate) {
    params.startDate = startDate;
  }

  if (endDate) {
    params.endDate = endDate;
  }

  if (sort) {
    params.sort = sort;
  }

  /*
   * 북마크 여부는 사용자별로 달라지는 값이라,
   * 로그인 사용자가 목록을 볼 때만 email을 함께 보내 서버가 EXISTS 기반 isBookmarked를 계산하도록 한다.
   */
  const normalizedEmail = normalizeFilterValue(email);
  if (normalizedEmail) {
    params.email = normalizedEmail;
  }

  const { data } = await api.get("/schedules", { params });
  return data;
};

/*
 * 위시리스트 목록은 bookmark 테이블 기준 최신 저장순으로 내려오며,
 * 카드 렌더링에 필요한 schedule 필드를 그대로 받는다.
 */
export const fetchBookmarkedSchedules = async () => {
  const { data } = await api.get("/bookmarks");
  return data;
};

/*
 * 북마크 추가/삭제 응답은 복잡한 payload보다 "대상 일정 id + 최종 저장 상태"만 확정한다.
 * 프론트는 이 응답을 optimistic update 검증과 토스트 문구 결정에 사용한다.
 */
export const createBookmark = async (scheduleId) => {
  const { data } = await api.post("/bookmarks", { scheduleId });
  return data;
};

export const deleteBookmark = async (scheduleId) => {
  const { data } = await api.delete(`/bookmarks/${scheduleId}`);
  return data;
};

export const fetchBookmarkExists = async (scheduleId) => {
  const { data } = await api.get(`/bookmarks/${scheduleId}/exists`);
  return data;
};

export const insertSchedule = async (post, images, detailSchedule) => {
  const formData = new FormData();

  const formatDate = (date) => {
    if (!date) return null;

    const d = new Date(date);

    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // 날짜 변환
  const convertedPost = {
    ...post,
    startDate: formatDate(post.startDate),
    endDate: formatDate(post.endDate),
    recruitStartDate: formatDate(post.recruitStartDate),
    recruitEndDate: formatDate(post.recruitEndDate),
  };

  // console.log(post);
  // console.log(images);
  // console.log(detailSchedule);

  formData.append(
    "data",
    new Blob(
      [
        JSON.stringify({
          schedule: convertedPost,
          detailSchedule: detailSchedule,
          email: post.email,
        }),
      ],
      { type: "application/json" }
    )
  );

  // 이미지파일 넣음
  images.forEach((file) => {
    formData.append("images", file);
  });

  const response = await api.post("/schedules", formData);

  return response.data;
};

export const updateSchedule = async (
  scheduleId,
  post,
  images,
  detailSchedule,
  deletedImageIds
) => {
  const formData = new FormData();

  const formatDate = (date) => {
    if (!date) return null;

    const d = new Date(date);
    if (isNaN(d.getTime())) return null;

    return d.toISOString().split("T")[0];
  };

  const convertedPost = {
    ...post,
    startDate: formatDate(post.startDate),
    endDate: formatDate(post.endDate),
    recruitStartDate: formatDate(post.recruitStartDate),
    recruitEndDate: formatDate(post.recruitEndDate),
  };

  const payload = {
    email: post.email,
    schedule: convertedPost,
    detailSchedule: detailSchedule ?? [],
    deletedImageIds: deletedImageIds ?? [],
  };

  // console.log("🔥 최종 payload", payload);

  formData.append(
    "data",
    new Blob([JSON.stringify(payload)], {
      type: "application/json",
    })
  );

  images.forEach((file) => {
    formData.append("images", file);
  });

  const response = await api.put(`/schedules/${scheduleId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const deleteSchedule = async (scheduleId) => {
  const response = await api.delete(`/schedules/${scheduleId}`);

  return response.data;
};
