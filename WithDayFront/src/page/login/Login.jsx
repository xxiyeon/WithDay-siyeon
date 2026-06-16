import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// useQuery: 데이터를 가져올 때(Read) 사용. (예: 내 프로필 보기, 게시글 목록 가져오기)
// useMutation: 데이터를 바꾸거나 보낼 때(Create, Update, Delete) 사용. (예: 로그인하기, 회원가입하기, 게시글 삭제하기)
// 둘다 그때 사용하는 이유는 그것에 특화된 리엑트 쿼리들이라서
import { useMutation, useQuery } from "@tanstack/react-query";

import { Snackbar, Alert } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import { useAuthStore } from "../../features/auth/store/authStore";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

import { loginSchema } from "../../features/auth/validation/authSchema";
import { loginUser, googleLoginUser } from "../../features/auth/api"; // axios 대신에 api.js로 빼서 백엔드와 소통

import FormField from "../../shared/ui/Form/FormField";
import { Input } from "../../shared/ui/Form/Form"; //
import Button from "../../shared/ui/Button/Button";
import styles from "./Auth.module.css";

import OneSignal from "../../shared/lib/oneSignal";
import { getNotificationTerm } from "../../features/notification/api";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 페이지 정보 저장. URL에 숨겨서 넘긴 state를 꺼내 쓸 수 있음. (빈 값 에러를 막기 위해 꺼낼 땐 location.state?. 로 접근)
  const setLogin = useAuthStore((state) => state.setLogin); // 로그인 정보를 보관하는 useAuthStore에서 로그인 데이터(토큰, 유저 정보)를 전역에 저장(세팅)하는 함수를 가져옴.

  // 알림창(토스트, 기존 윈도우의 alert대신 사용) state
  const [toast, setToast] = useState({
    open: false, // 알림창을 띄울지 말지 (true면 띄움)
    message: "", // 알림창에 적힐 글씨
    severity: "error", // 알림창의 디자인 테마 (색상, 아이콘)
  });

  const [showPw, setShowPw] = useState(false); // 비밀번호 보임/숨김 결정하는 state

  // 페이지가 처음 딱 켜졌을 때 1번만 실행됨(useEffect니까). 이때 location 즉 다른페이지에서 넘긴 값이 있다면 아래에 if문이 실행됨.
  useEffect(() => {
    // 만약 회원가입 페이지에서 "잘못된 접근" or "가입 성공"이라는 toastMessage값을 넘겼다면
    if (location.state?.toastMessage) {
      // 알림창(토스트) 세팅
      setToast({
        open: true,
        message: location.state.toastMessage,
        severity: location.state?.toastSeverity || "success",
      }); // "잘못된 접근" or "가입 성공" 알림 띄우기

      // 새로고침(f5) 시 알림 무한반복을 막기 위해 알람창을 띄운 후에 history state 데이터 초기화, 사용법: window.history.replaceState( 1.저장할데이터, 2.페이지제목, 3.바꿀주소(생략가능) )
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 알림창 끄기버튼(X표시) 누르거나 시간 지나면 닫히게(UI 하단의 Snackbar 태그에 있는 autoHideDuration 속성으로 시간이 되면 자동으로 닫힘.)하는 함수,
  // reason: 알림창(토스트)가 닫히는 이유, event: 여기선 안쓰긴 하는데 마우스의 x,y 좌표및 어떤 html태그를 클릭했는지등의 정보를 가짐
  const handleCloseToast = (event, reason) => {
    // reason 즉 닫히는 이유가 바깥 클릭이면 닫히는 걸 막음.
    if (reason === "clickaway") {
      return;
    }
    setToast((prev) => ({ ...prev, open: false })); // 기존상태 유지하게하고, 토스트의 open을 false로 해야 알람이 닫힘.
  };

  // React Hook Form(useForm으로 사용) 초기화 및 설정. 이때 yup이 보안 규칙을 정해놓고 가지고 있는데 그걸 가져올거임.
  const {
    register, // 아래의 UI에서 email, pw등을 가져올 명찰
    handleSubmit, // 에러(loginSchema 규칙 틀림)가 있으면 통과 안시켜주고, 규칙을 다 지키면 진짜 제출 함수(onSubmit)를 실행시켜 줌.
    formState: { errors }, // 에러(loginSchema 규칙 틀림)발생시 에러문구를 loginSchema에서 가져옴.
  } = useForm({
    resolver: yupResolver(loginSchema), // authSchema(yup)의 loginSchema 규칙대로 검사한다고 지정
    mode: "onSubmit", // 타이핑할 때마다 검사하지 말고, 제출(submit) 버튼 누를 때만 검사
  }); // 여기서 세팅한 폼은 UI의 <form onSubmit={handleSubmit(onSubmit)}> 와 연결되어 검사 통과 시 onSubmit 함수로 데이터를 넘겨주고 mutation.mutate를 통해 백엔드로 값을 보냄.

  // 로컬 로그인 Mutation (백엔드 통신)
  const mutation = useMutation({
    mutationFn: loginUser, // api.js에 있는 loginUser로 POST 요청 함수 실행해서 백엔드로 로그인 정보를 보냄
    // 통신 성공시
    onSuccess: async (data, variables) => {
      const { token, user } = data; // 백엔드가 준 데이터(data)에서 토큰과 유저 정보를 꺼냄

      setLogin(token, user, variables.autoLogin); // authStore의 setLogin에 토큰, 유저정보, 자동 로그인 여부를 저장 (사이트 전체 로그인됨)

      // 백그라운드에서 실행
      (async () => {
        try {
          // 로그인 후 진행해야 되는 부분으로 기존 방식 채택
          // useQuery는 컴포넌트 최상단에서만 사용 가능.
          const notificationTerm = await getNotificationTerm(token);

          if (notificationTerm === 1) {
            const permission = await OneSignal.Notifications.permissionNative;

            // 브라우저가 이미 구독 상태라면 알림 허용 창 뜨지 않음
            if (permission === "default") {
              await OneSignal.Notifications.requestPermission(); // 브라우저 알림 여부 창
            }
            await OneSignal.login(user.email.toString()); // OneSignal 유저 연결
            // 사용자의 푸시 알림 수신을 활성화 함
            await window.OneSignal.User.PushSubscription.optIn();
          }
        } catch (error) {
          console.error("OneSignal 연결 실패:", error);
        } finally {
          navigate("/");
        }
      })();
    },
    // 통신 실패시
    onError: (error) => {
      // 서버가 준 에러 메세지를 알림창에 띄움
      const errMsg =
        error.response?.data?.message || error.response?.data || error.message; // 백엔드 커스텀 메세지(예: "비밀번호가 일치하지 않습니다.") -> 백엔드 기본 응답(예: "존재하지 않는 이메일입니다.") -> 네트워크 통신 에러 순으로 탐색(예: "403에러", 백엔드로 못 보낸 상황)

      // 알림창(토스트) 세팅
      setToast({
        open: true,
        message: `로그인 실패: ${typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg}`, // 리액트는 화면에 글자를 띄울때 값이 객체나 배열이면 화면이 죽음. 그래서 객체이면 강제로 문자열로 변환함.
        severity: "error",
      });
    },
  });

  // 구글 로그인 Mutation (백엔드 통신)
  const googleMutation = useMutation({
    mutationFn: googleLoginUser, // api.js에 있는 googleLoginUser POST 요청 함수 실행해서 백엔드로 소셜 로그인 정보를 보냄

    // data: 백엔드가 준 데이터(토큰, 유저정보등 / 이때 로컬 로그인때 받는 data랑 비슷하지만 다름.)
    // variables: 백엔드 서버로 보냈던 구글 데이터 원본
    onSuccess: async (data, variables) => {
      // data에 유저정보에 회원가입 유무가 false인 경우 (신규 유저인 경우)
      if (data.isRegistered === false) {
        // 회원가입 마무리 페이지(/signup/extra)로 보냄, 이때 구글 데이터(variables)를 state에 넣고 보냄.
        navigate("/signup/extra", { state: { googleData: variables } });
      } else {
        // 회원가입 유무가 true인 경우 (기존 유저인 경우)
        const { token, user } = data; // 백엔드가 준 데이터(data)에서 토큰과 유저 정보를 꺼냄

        setLogin(token, user, true); // authStore의 setLogin에 토큰, 유저정보를 저장 (사이트 전체 로그인됨), 자동 로그인 여부는 true(소셜 로그인은 자동 로그인으로 처리)

        navigate("/");

        // 백그라운드에서 실행
        (async () => {
          try {
            // 로그인 후 진행해야 되는 부분으로 기존 방식 채택
            // useQuery는 컴포넌트 최상단에서만 사용 가능.
            const notificationTerm = await getNotificationTerm(token);

            if (notificationTerm === 1) {
              const permission = await OneSignal.Notifications.permissionNative;

              // 브라우저가 이미 구독 상태라면 알림 허용 창 뜨지 않음
              if (permission === "default") {
                await OneSignal.Notifications.requestPermission(); // 브라우저 알림 여부 창
              }
              await OneSignal.login(user.email.toString()); // OneSignal 유저 연결
              // 사용자의 푸시 알림 수신을 활성화 함
              await window.OneSignal.User.PushSubscription.optIn();
            }
          } catch (error) {
            console.error("OneSignal 연결 실패:", error);
          } finally {
            navigate("/");
          }
        })();
      }
    },
    // 통신 실패시
    onError: (error) => {
      // 로컬 로그인과 달리 에러 메세지가 하나인 이유 : 로컬 로그인의 에러는 유저의 실수가 대부분임(비번 오타, 가입안된 이메일등). 즉 백엔드에서 에러메세지를 주냐 안주냐 차이임.
      // 소셜 로그인의 에러는 유저가 실수를 할게 없으니 시스템 문제가 대부분임. 즉 네트워크 통신 오류만이 남음.
      setToast({
        open: true,
        message: "구글 로그인 실패. 다시 시도해주세요.",
        severity: "error",
      });
    },
  });

  // 로그인 버튼을 눌렀을 때 실행될 함수 (위에 useForm의 handleSubmit이 에러가 없을 때만 이걸 실행시켜줌)
  const onSubmit = (data) => {
    // data: react-hook-form이 UI에서 얻은 값 { email, password }을 가진 객체
    mutation.mutate(data); // 위에서 만든 로컬 로그인 함수에 데이터를 줘서 백엔드로 보냄.
  };

  // 구글 버튼 누르고 구글 서버에서 성공적으로 응답을 받았을 때 실행됨. (아래에 UI에서 이때 사용함.)
  const handleGoogleSuccess = (credentialResponse) => {
    // 구글이 유저정보(이메일등)을 그냥 주지 않음.(해킹의 위험때문에) 때문에 구글이 준 암호 덩어리(credential)를 jwtDecode로 해석함.
    const decodedPayload = jwtDecode(credentialResponse.credential);
    // 우리 백엔드에서 쓸수있게 디코드한 데이터를 googleData로 포장.
    const googleData = {
      email: decodedPayload.email,
      nickname: decodedPayload.name,
      providerId: decodedPayload.sub,
      profileImage: decodedPayload.picture,
    };
    googleMutation.mutate(googleData); // 위에서 만든 소셜 로그인 함수에 데이터를 줘서 백엔드로 보냄.
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>WithDay 로그인</h1>
          <p className={styles.subtitle}>당신의 여행 일정을 확인해보세요.</p>
        </div>

        {/* handleSubmit(onSubmit): HTML 기본 제출 기능을 막고(이게 없으면 html의 form은 누르면 바로 sumbit하려함), React Hook Form의 검증을 거친 후 onSubmit을 실행시킴 */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* FormField: 폼 UI의 일관성을 위해 만든 공통 컴포넌트. label과 error 객체만 props로 던져주면, 내부의 children(<Input>)과 조합하여 라벨-입력창-에러메세지 세트를 자동으로 완성해줌. */}
          <FormField label="이메일" error={errors.email}>
            {/* {...register('email')}: 이 input창을 폼(useForm)이 값을 추적해서, yup(보안규칙)의 'email'규칙과 연결시킴 */}
            <Input
              type="email"
              placeholder="이메일을 입력하세요"
              // 이전 프로젝트에서는 {...register("")} 대신 아래 주석과 같이 사용했었음. 이번엔 react-hook-form 라이브러리를 활용해서 함.
              // name="email"
              // value={member.email}
              // onChange={(e) => {
              //   setMember({ ...member, [e.target.name]: e.target.value });
              // }}
              {...register("email")}
            />
          </FormField>

          <FormField label="비밀번호" error={errors.password}>
            <div className={styles.pwInputWrap}>
              <Input
                type={showPw ? "text" : "password"} // showPw 상태에 따라 글자가 보일지 숨길지 정해짐
                placeholder="비밀번호를 입력하세요"
                {...register("password")} // 'password'규칙과 연결
                style={{ paddingRight: "40px" }} // 글씨가 눈알 아이콘을 파고들지 않게 오른쪽 여백 줌
              />
              {/* 눈알 아이콘을 누르면 showPw 상태가 반대로 뒤집힘 (true <-> false) */}
              <div
                className={styles.pwIcon}
                onClick={() => {
                  setShowPw(!showPw);
                }}
              >
                {showPw ? (
                  <VisibilityOffIcon fontSize="small" />
                ) : (
                  <VisibilityIcon fontSize="small" />
                )}
              </div>
            </div>
          </FormField>

          {/* 자동 로그인 체크박스 */}
          <div className={styles.marginBottom8}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" {...register("autoLogin")} />
              <span className={styles.checkboxText}>자동 로그인</span>
            </label>
          </div>

          {/* 아이디 / 비밀번호 찾기 링크 */}
          <div className={styles.findLinks}>
            <span onClick={() => navigate("/find-id")}>아이디 찾기</span>
            <span className={styles.findDivider}>|</span>
            <span onClick={() => navigate("/find-pw")}>비밀번호 찾기</span>
          </div>

          {/* 버튼: 서버와 통신 중(isPending)일 때는 버튼을 비활성화(disabled) 시켜서 유저가 여러 번 누르는 걸 막음 */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={mutation.isPending || googleMutation.isPending}
          >
            {mutation.isPending ? "로그인 중..." : "로그인"}{" "}
            {/* 테스트 환경에서는 렉이 없어 로그인 중...은 안보일수 있지만 인터넷이 느린 곳에서 하면 로그인 중...을 확인할 수 있음. */}
          </Button>
        </form>

        <div className={styles.googleLoginWrap}>
          {/* 구글에서 제공하는 공식 컴포넌트 */}
          <GoogleLogin
            // onSuccess: 소셜 로그인을 성공하면
            onSuccess={handleGoogleSuccess}
            // onError: 소셜 로그인을 실패하면
            onError={() =>
              setToast({
                open: true,
                message: "구글 로그인 창이 닫혔거나 실패했습니다.",
                severity: "error",
              })
            }
          />
        </div>

        <p className={styles.linkText}>
          {/* {" "}는 띄어쓰기 위해서 */}
          아직 계정이 없으신가요?{" "}
          <span
            className={styles.linkClickable}
            onClick={() => navigate("/signup")}
          >
            회원가입하기
          </span>
        </p>
      </div>

      {/* MUI 알림창: toast 상태에 따라 화면 하단에 나타났다가 3초(autoHideDuration={3000ms}) 후 사라짐 */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: "80px !important" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Login;
