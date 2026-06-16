import axios from "axios"; // 백엔드와 통신(GET, POST등)을 담당하는 라이브러리
import { useAuthStore } from "./store/authStore"; // AuthStore는 로그인시 유저 정보가 저장됨. 거기서 토큰 꺼내올 때 쓸 훅

// .env 파일에 숨긴 백엔드 주소 가져오기
const BASE_URL = import.meta.env.VITE_BACKSERVER;

// 매번 통신할 때마다 전체 주소나 형식을 적기 귀찮으므로(axios사용시 매번 새로 세팅해야함.), 기본 세팅이 완료된 api를 만들어 axios대신 사용.
export const api = axios.create({
  baseURL: `${BASE_URL}`, // baseURL: 모든 요청 주소 앞에 이 백엔드 주소가 자동으로 붙음 (예: /users/login만 적어도 됨)

  // headers: 백엔드에 보내는 데이터는 기본적으로 JSON(글자/객체) 형태라고 정함. (파일 업로드처럼 JSON이 아닌 데이터를 보낼 때는, 해당 함수에서 headers를 덮어씌워서 multipart/form-data로 바꿔줌)
  headers: {
    "Content-Type": "application/json",
  },
});

// 프론트엔드에서 백엔드로 요청(Request)이 출발하기 '직전'에 무조건 여기를 거쳐갑니다.
// interceptors.request.use()는 axios의 공식 문법으로, 백엔드 요청을 하기 전에 가로채서(config) 세팅을 할 수 있게 해주는 기능
api.interceptors.request.use(
  (config) => {
    // AuthStore(Zustand)에서 현재 자신의 로그인 토큰을 꺼냄. 리액트 컴포넌트 밖(일반 js 파일)이므로 getState()를 사용(getState: 리액트 컴포넌트 밖에서 store 값을 꺼낼 때 사용)하여 토큰을 직접 꺼내와야 함.
    const token = useAuthStore.getState().token;

    // 토큰이 있다면(로그인한 상태라면)
    if (token) {
      // config.headers["Authorization"]: 백엔드에 보내는 요청(Request)의 헤더(headers)중 Authorization이라는 칸을 세팅 (Authorization = 권한, 허가증 같은 의미)
      // `Bearer ${token}`: "Bearer "라는 글자 뒤에 실제 토큰 값을 붙여서 세팅. (예: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config; // 세팅된 config를 백엔드로 보내는 요청(Request)을 할 수 있게 반환(return)함.
  },
  (error) => {
    // 백엔드 요청하기전에 문제가 생기면(인터넷 끊김 등), 자바스크립트 확성기(Promise.reject)로 에러를 던짐.
    // 그래야 React Query의 onError 같은 곳에서 에러를 낚아채서 알림을 띄울 수 있음.
    return Promise.reject(error);
  },
);

// 백엔드 통신 함수들 (React Query의 mutationFn/queryFn이 아래의 함수들을 가져다 씀)
// [공통 원리]
// 1. async/await: 백엔드와 통신하는 동안 자바스크립트가 기다리게 함. (통신이 느릴 때, 통신이 끝날 때까지 다음 줄로 넘어가지 않고 기다림) -> 백엔드에서 응답이 오면(response) 그때부터 다음 줄 실행
// 2. api.post / api.get: 위에서 세팅한 api를 통해 데이터를 보내거나(post) 가져옴(get).
// -> (백엔드 주소의 뒷부분(예: /users/login), 백엔드로 보낼 데이터(예: { email, password }), 옵션(예: 파일 업로드할 때 headers 덮어씌우기, 생략시 기본값인 JSON 형태로 보냄)) 순서로 작성
// 3. return response.data: 백엔드가 준 데이터 리턴 (React Query의 onSuccess에서 이 데이터를 받아서 처리할 수 있게 함)

// 갑자기 생각나서 적는 주석. export: 여기서 만든 함수들을 다른 파일에서 쓸수 있게 해줌.
// 회원가입
export const signupUser = async (formData) => {
  const response = await api.post(`/users/signup`, formData, {
    // 사진 파일(profileImage)이 포함되어 있으므로, 기본 설정(json)을 강제로 multipart/form-data로 덮어씌움. (파일 업로드할 때는 multipart/form-data로 보내야 백엔드에서 파일을 받을 수 있음)
    // 아래의 다른 함수들은 파일 업로드가 없으므로, 기본 설정인 JSON 형태로 보내도 백엔드에서 문제없이 받을 수 있어서 옵션을 생략했음.
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// 이메일 인증 코드 보내기
export const sendEmailVerification = async (email) => {
  const response = await api.post(`/users/email-verification`, { email });
  return response.data;
};

// 약관 정보 불러오기
export const fetchTerms = async () => {
  const response = await api.get(`/users/terms`);
  return response.data;
};

// 관심사 정보 전체 불러오기
export const fetchInterests = async () => {
  const response = await api.get(`/users/interests`);
  return response.data;
};

// 일반 로그인
export const loginUser = async (loginData) => {
  const response = await api.post(`/users/login`, loginData);
  return response.data;
};

// 구글 로그인
export const googleLoginUser = async (googleData) => {
  const response = await api.post(`/users/google-login`, googleData);
  return response.data;
};

// 소셜 로그인 회원가입
export const socialSignupUser = async (signupData) => {
  const response = await api.post(`/users/social-signup`, signupData);
  return response.data;
};

export const getNotificationCount = async (email) => {
  const response = await api.get(
    `/notifications/count/${encodeURIComponent(email)}`,
  );
  return response.data;
};

// 아이디 찾기
export const findIdUser = async (findIdData) => {
  const response = await api.post(`/users/find-id`, findIdData);
  return response.data;
};

// 비밀번호 찾기 - 인증번호 전송
export const sendPasswordResetCode = async (email) => {
  const response = await api.post(`/users/find-password/email-verification`, {
    email,
  });
  return response.data;
};

// 비밀번호 찾기 - 인증번호 확인
export const verifyPasswordResetCode = async (verifyData) => {
  const response = await api.post(
    `/users/find-password/verify-code`,
    verifyData,
  );
  return response.data;
};

// 비밀번호 재설정
export const resetPassword = async (resetData) => {
  const response = await api.post(`/users/reset-password`, resetData);
  return response.data;
};
