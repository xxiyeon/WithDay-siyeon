import { create } from "zustand"; // zustand에서 create 함수를 가져옴. (토큰 저장소 만들 때 사용)
import { createJSONStorage, persist } from "zustand/middleware"; // 새로고침 방지용
import { jwtDecode } from "jwt-decode"; // JWT 토큰 디코딩 라이브러리 (토큰 만료 여부 확인할 때 사용)

// 브라우저의 로컬 스토리지에 저장될 이름 (개발자 도구 -> Application 탭에서 확인 가능, "auth-storage"라는 이름으로 저장됨)
export const AUTH_STORAGE_KEY = "auth-storage";

// 커스텀 스토리지 만드는 함수 (상황에 따라 로컬/세션을 골라서 저장)
const dynamicStorage = {
  getItem: (name) => {
    // 가져올 때 로컬, 세션 둘 다 뒤져서 값이 있는 곳에서 꺼내옴. (둘 다 있으면 로컬이 우선)
    return (
      window.localStorage.getItem(name) || window.sessionStorage.getItem(name)
    );
  },

  setItem: (name, value) => {
    // value 안에는 Zustand가 저장하려는 전체 데이터가 JSON 문자열로 들어있음. (예: '{"state":{"token":"abc123", "isAutoLogin":true}}')
    const parsed = JSON.parse(value);

    // 상태 안의 isAutoLogin 값이 true면 로컬(영구)에, false면 세션(임시)에 저장
    if (parsed.state.isAutoLogin) {
      window.localStorage.setItem(name, value);
      window.sessionStorage.removeItem(name); // 꼬이지 않게 반대쪽 Storage는 청소
    } else {
      window.sessionStorage.setItem(name, value);
      window.localStorage.removeItem(name); // 꼬이지 않게 반대쪽 Storage는 청소
    }
  },
  removeItem: (name) => {
    // 로그아웃 시 두 Storage를 모두 깨끗하게 비움.
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

// 전역 Store 생성
export const useAuthStore = create(
  // persist: 새로고침(F5)을 누르면 리액트 데이터가 날아가는 단점을 방어하는 자동 백업 장치. 데이터를 브라우저의 로컬 스토리지에 영구 보존해서, 창을 껐다 켜도 로그인이 풀리지 않게 해줌!
  persist(
    (set, get) => ({
      // Store 안에 들어갈 초기 데이터들
      token: null,
      user: null,
      isLoggedIn: false, // 로그인 여부
      isAutoLogin: false, //자동 로그인 여부

      // 로그인 성공 시 Store 데이터를 채우는 함수 (Login.jsx에서 사용함)
      setLogin: (token, userData, isAutoLogin = false) =>
        set({
          token, // 백엔드에서 받아온 토큰 저장
          user: userData ?? null, // userData가 비어있으면 null 저장. 비어있을수가 없긴한데 혹여나 오류로 userData가 안 들어오는 경우(이때 undefined를 넣음)를 대비해서 null로 저장하게 함.
          // 토큰도 있고 유저 이메일도 있으면 true, 아니면 false로 저장하여 로그인 상태 저장
          isLoggedIn: Boolean(token && userData?.email),
          isAutoLogin, // 자동 로그인 여부도 저장
        }),

      // 로그아웃 시 Store를 비우는 함수
      // 로그아웃 버튼 누를 때 사용
      // 토큰이 만료되어 자동 로그아웃 될 때도 이 함수를 사용
      // 세션 스토리지에 저장된 경우는 창을 닫으면 자동으로 로그아웃되니까 그 때도 이 함수 사용
      setLogout: () =>
        set({
          token: null,
          user: null,
          isLoggedIn: false,
          isAutoLogin: false,
        }),

      // 현재 저장된 JWT 토큰이 만료됐는지 확인하는 함수, getTokenRemainingTime() 함수와 거의 동일한 로직이지만, 만료 여부만 true/false로 반환
      // app.jsx에선 getTokenRemainingTime()만 사용했지만 그래도 혹시 몰라서 따로 isTokenExpired() 함수도 만들어 둠. (필요할 때 getTokenRemainingTime()보다 isTokenExpired()가 더 직관적일 수 있어서)
      isTokenExpired: () => {
        const token = get().token;

        // 토큰이 없으면 만료된 것으로 간주
        if (!token) {
          return true;
        }

        try {
          // jwtDecode 라이브러리를 사용하여 토큰 디코딩 (토큰 안에 exp(만료 시간) 정보가 있다고 가정)
          const decoded = jwtDecode(token);

          // exp(만료 시간) 정보가 없으면 만료된 것으로 간주
          if (!decoded.exp) {
            return true;
          }

          // 현재 시간과 비교하여 토큰이 만료됐는지 여부 반환 (만료 시간이 현재 시간보다 이전이면 true, 아니면 false)
          return decoded.exp * 1000 <= Date.now();
        } catch (error) {
          return true;
        }
      },

      // 토큰이 만료되기까지 남은 시간을 밀리초 단위로 반환하는 함수 (자동 로그아웃 타이머 설정할 때 사용)
      getTokenRemainingTime: () => {
        const token = get().token;

        // 토큰이 없으면 남은 시간을 0으로 반환
        if (!token) {
          return 0;
        }

        try {
          // jwtDecode 라이브러리를 사용하여 토큰 디코딩 (토큰 안에 exp(만료 시간) 정보가 있다고 가정)
          const decoded = jwtDecode(token);

          // exp(만료 시간) 정보가 없으면 남은 시간을 0으로 반환
          if (!decoded.exp) {
            return 0;
          }

          // 토큰이 만료되기까지 남은 시간 계산 (만료 시간에서 현재 시간을 뺀 값, 단위는 밀리초)
          return Math.max(decoded.exp * 1000 - Date.now(), 0);
        } catch (error) {
          return 0;
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY, // 로컬 스토리지에 저장될 키값 지정

      storage: createJSONStorage(() => dynamicStorage), // 커스텀 스토리지 사용하도록 지정 (로컬/세션 선택 가능)
    },
  ),
);
