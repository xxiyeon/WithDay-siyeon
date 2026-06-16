import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
// useQuery: 데이터를 가져올 때(Read) 사용. (예: 내 프로필 보기, 게시글 목록 가져오기)
// useMutation: 데이터를 바꾸거나 보낼 때(Create, Update, Delete) 사용. (예: 로그인하기, 회원가입하기, 게시글 삭제하기)
// 둘다 그때 사용하는 이유는 그것에 특화된 리엑트 쿼리들이라서
import { useMutation, useQuery } from "@tanstack/react-query";

import DaumPostcode from "react-daum-postcode"; // 카카오(다음)에서 제공하는 "주소 검색" 모달 띄우기용 라이브러리

import {
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import * as FaIcons from "react-icons/fa";

import { socialExtraSchema } from "../../features/auth/validation/authSchema";
import {
  fetchTerms,
  socialSignupUser,
  fetchInterests,
} from "../../features/auth/api"; // axios 대신에 api.js로 빼서 백엔드와 소통

import FormField from "../../shared/ui/Form/FormField";
import { Input } from "../../shared/ui/Form/Form";
import Button from "../../shared/ui/Button/Button";
import styles from "./Auth.module.css";

const SocialExtra = () => {
  const navigate = useNavigate();
  const location = useLocation(); // 현재 페이지 정보 저장. URL에 숨겨서 넘긴 state를 꺼내 쓸 수 있음. (빈 값 에러를 막기 위해 꺼낼 땐 location.state?. 로 접근)
  // 달력에서 미래 날짜를 선택하지 못하게 하기 위해 현재 날짜를 "YYYY-MM-DD" 형태로 뽑아냄. (HTML의 달력(date)은 반드시 "YYYY-MM-DD" 모양을 사용)
  // 순서(값은 예시) -> new Date(): Wed May 13 2026 17:35:00 GMT+0900 (한국 표준시), .toISOString(): "2026-05-13T08:35:00.000Z", .split("T"): ["2026-05-13", "08:35:00.000Z"], [0]: "2026-05-13"
  const todayDate = new Date().toISOString().split("T")[0];

  // 알림창(토스트, 기존 윈도우의 alert대신 사용) state
  const [toast, setToast] = useState({
    open: false, // 알림창을 띄울지 말지 (true면 띄움)
    message: "", // 알림창에 적힐 글씨
    severity: "success", // 알림창의 디자인 테마 (색상, 아이콘)
  });

  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); // 주소 검색창을 킬지 끌지 정하는 state
  const [openTerms, setOpenTerms] = useState(null); // 약관 팝업용 state(어떤 약관을 열었는지 문자열로 저장, null / "TOS" / "PRIVACY" / "MARKETING" / "NOTIFICATION")
  const [selectedInterests, setSelectedInterests] = useState([]); // 선택한 관심사 id들을 저장하는 state (배열로 저장, 예: [1, 3, 5])

  const [step, setStep] = useState(1); // 소셜 회원가입 단계 결정하는 state ((1: 약관동의, 2: 기본정보, 3: 관심사 선택, 4: 회원가입 완료)

  // 페이지가 처음 딱 켜졌을 때 1번만 실행됨(useEffect니까). 이때 location 즉 다른페이지에서 넘긴 값(여기선 구글 정보)이 없다면 아래에 if문이 실행됨.
  useEffect(() => {
    // location.state: 로그인페이지에서 넘긴 구글 정보가 담긴 state.
    // location.state?.googleData: location.state에 googleData라는 구글 정보가 담김.
    // 이때 둘중 하나라도 없으면 접근 금지. 돌려보냄
    if (!location.state || !location.state.googleData) {
      navigate("/login", {
        // replace: true -> 브라우저 방문 기록(History)에 이 페이지를 남기지 않고 로그인 페이지로 덮어씌움, 유저가 뒤로가기를 눌러서 다시 이 '잘못된 접근' 페이지로 무한 루프 도는 것을 방지함.
        replace: true,
        // state의 값 설정. 로그인 페이지의 useEffect에서 location.state?.toastMessage로 이 값을 받아서 알림창에 띄울거임.
        state: {
          toastMessage: "잘못된 접근입니다. 다시 로그인해주세요.",
          toastSeverity: "error",
        },
      });
    }
  }, [location]); // 에러나면 여기에 navigate도 넣어보기(리엑트 ESLint때문에 navigate도 넣으라고 할 수 있음)

  // 회원가입 완료 단계(step이 4)가 되면 3초 뒤에 로그인 화면으로 이동하는 useEffect
  useEffect(() => {
    // step이 4일 때(소셜 회원가입 완료 단계)
    if (step === 4) {
      // 3초(3000ms) 뒤에 로그인 화면으로 이동하는 타이머 설정
      const timer = setTimeout(() => {
        navigate("/login", {
          state: {
            toastMessage: "회원가입이 완료되었습니다! 다시 로그인해주세요.",
          },
        });
      }, 3000);

      // 회원가입 완료 단계에서 페이지를 떠나거나(step이 4가 아니게 되거나) 컴포넌트가 사라질 때 타이머 정지 (안그러면 3초 뒤에 갑자기 로그인 화면으로 이동하는 버그 발생)
      return () => clearTimeout(timer);
    }
  }, [step, navigate]);

  // 구글이 준 4가지 데이터(이메일, 이름, providerId(google), 프사)를 변수에 저장. location.state가 있으면 googleData를 꺼내고, 없으면 빈 객체를 줌. (빈 객체로 안 하면 undefined에러남.)
  const googleData = location.state?.googleData || {};

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
    register, // 아래의 UI에서 생년월일, 닉네임, 주소등을 가져올 명찰 (소셜 가입이라 email, pw는 없음!)
    handleSubmit, // 에러(socialExtraSchema 규칙 틀림)가 있으면 통과 안시켜주고, 규칙을 다 지키면 진짜 제출 함수(onSubmit)를 실행시켜 줌.
    setValue, // 직접 타이핑하지 않고도 코드를 통해 강제로 값을 넣기위해 사용.
    watch, // 특정 입력창(체크박스등도 포함)을 보고 값이 바뀔때마다 화면에 반영함(렌더링). 여기선 약관 4개를 다 체크하면 전체체크에도 자동으로 체크되게 만들때 사용.
    getValues,
    trigger, // 특정 입력창의 yup 검사를 강제로 실행시킴. 여기선 다음 step로 넘어갈 때 그 step에서 검사해야할 입력창들의 yup 검사를 실행시키는 데 사용.
    formState: { errors }, // 에러(socialExtraSchema 규칙 틀림)발생시 에러문구를 socialExtraSchema에서 가져옴.
  } = useForm({
    resolver: yupResolver(socialExtraSchema), // authSchema(yup)의 socialExtraSchema 규칙대로 검사한다고 지정 (일반 가입과 다르게 email, pw 검사가 빠진 규칙)
    mode: "onChange", // 로그인때는 onSubmit이었지만 이번엔 완전히 반대로 타이핑 할때마다 실시간으로 검사함.
    // 약관 체크박스는 처음에 모두 false(체크해제) 상태로 시작
    defaultValues: {
      agreeTos: false,
      agreePrivacy: false,
      agreeMarketing: false,
      agreeNotification: false,
    },
  }); // 여기서 세팅한 폼은 UI의 form 제출 흐름과 연결됨. 현재는 form 기본 제출을 preventDefault로 먼저 막고, handleSubmit(onSubmit)을 통해 React Hook Form 검증을 통과했을 때만 onSubmit 함수로 데이터를 넘겨줌.

  // 구글이 준 이름을 닉네임 입력창에 기본값으로 넣어주는 useEffect. googleData.nickname이 바뀔 때마다 실행됨.
  useEffect(() => {
    if (googleData.nickname) {
      setValue("nickname", googleData.nickname, {
        shouldValidate: true,
        shouldDirty: false,
      });
    }
  }, [googleData.nickname, setValue]);

  // 다음으로 버튼을 눌렀을 때 step 이동 로직
  const handleNextStep = async () => {
    let isStepValid = false;

    if (step === 1) {
      // 1단계: 약관 필수 항목 2개만 검사 (이용약관 동의, 개인정보 수집 및 이용 동의)
      isStepValid = await trigger(["agreeTos", "agreePrivacy"]);
    } else if (step === 2) {
      // 2단계: 기본 정보 검사 (닉네임, 생년월일, 성별, 전화번호, 주소)
      isStepValid = await trigger([
        "nickname",
        "birthday",
        "gender",
        "phone",
        "postcode",
        "address",
        "detailAddress",
      ]);
    }

    // 검사가 통과(isStepValid가 true)하면 step을 1 증가시켜서 다음 step으로 넘어가게 함.
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  // watch로 4개의 체크박스를 실시간으로 확인하여 4개 다 true면 allAgreed도 true가 됨.
  const allAgreed =
    watch("agreeTos") &&
    watch("agreePrivacy") &&
    watch("agreeMarketing") &&
    watch("agreeNotification");

  // 전체 동의 체크박스를 클릭했을 때
  const handleAgreeAll = (e) => {
    const isChecked = e.target.checked; // 전체동의 박스가 체크(true)인지 체크해제(false)인지 저장.
    // setValue(target이름, 넣을 값(value), 추가 옵션 객체(options))를 통해 강제로 나머지 4개 박스의 값을 똑같이 isChecked로 바꿈.
    // shouldValidate를 써서 yup의 검사를 다시함. 이유: setValue는 watch처럼 값이 바뀐다고 렌더링되지 않음. setValue만으로는 yup 검사를 하지않음.
    setValue("agreeTos", isChecked, { shouldValidate: true });
    setValue("agreePrivacy", isChecked, { shouldValidate: true });
    setValue("agreeMarketing", isChecked, { shouldValidate: true });
    setValue("agreeNotification", isChecked, { shouldValidate: true });
  };

  // 백엔드에서 약관 데이터 가져오기(useQuery니까 페이지 들어가자마자 데이터 가져옴)
  // 백엔드에서 가져온 데이터(data)를 termsData라고 부를거임.
  const { data: termsData } = useQuery({
    queryKey: ["terms"], // fetchTerms로 가져온 데이터를 terms라고 저장.
    queryFn: fetchTerms, // api.js에 있는 fetchTerms로 GET 요청 함수 실행해서 백엔드에서 약관 정보를 가져옴.
  });

  // 백엔드에서 관심사 데이터 가져오기(useQuery니까 페이지 들어가자마자 데이터 가져옴)
  // data는 interestsData라는 이름으로 사용하고, 아직 데이터가 없을 때를 대비해 기본값을 빈 배열([])로 둠.
  // isLoading / isError는 관심사 목록을 불러오는 중이거나 실패했을 때 UI 표시와 가입 버튼 비활성화에 사용함.
  const {
    data: interestsData = [],
    isLoading: isInterestsLoading,
    isError: isInterestsError,
  } = useQuery({
    queryKey: ["interests"], // fetchInterests로 가져온 데이터를 interests라고 저장.
    queryFn: fetchInterests, // api.js에 있는 fetchInterests로 GET 요청 함수 실행해서 백엔드에서 관심사 정보를 가져옴.
  });

  // 칩(Chip)을 클릭했을 때 실행되는 토글 함수
  const handleToggleInterest = (id) => {
    setSelectedInterests((prev) =>
      // 이미 배열에 있는 ID면 빼버리고(filter), 없으면 배열 끝에 추가함([...prev, id])
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // 백엔드/코드에서 쓰는 약관 이름(TOS 등)을 한글로 바꿔주는 함수 (약관 제목용)
  const getTermTitle = (type) => {
    if (type === "TOS") {
      return "이용약관";
    } else if (type === "PRIVACY") {
      return "개인정보 수집 및 이용";
    } else if (type === "MARKETING") {
      return "마케팅 정보 수신";
    } else if (type === "NOTIFICATION") {
      return "알림 수신";
    } else {
      return "약관"; // 앞의 TOS, PRIVACY등이 안들어왔을때 빈칸이나 에러 대신 약관을 씀.
    }
  };

  // 모달창 띄울 때 넘겨받은 데이터(openTerms state)와 같은 내용(백엔드에서 받아온 termsData)을 찾는 함수 (약관 내용용)
  const getTermContent = (type) => {
    // 페이지 들어와서 useQuery로 데이터 가져오는중일때 (termsData가 비어있음 -> false)
    if (!termsData) {
      return "약관 데이터를 불러오는 중입니다...";
    }
    // openTerms state에 설정된 값과 termsData와 같은 것을 찾아서 term에 저장
    const term = termsData.find((t) => {
      return t.type === type;
    });
    // term은 이용약관 데이터를 다 가지고 있음. 그중 내용을 띄움.
    return term ? term.content : "약관 내용이 없습니다.";
  };

  // 주소 찾기 팝업에서 주소를 클릭했을 때 실행되는 함수
  const handleCompletePostcode = (data) => {
    let fullAddress = data.address; // 카카오가 준 기본 주소 (예: "경기 성남시 분당구 판교역로 166")
    let extraAddress = ""; // 괄호 안에 들어갈 추가 주소 (아파트 이름, 동이름등)

    // R: Road(도로명 주소), J: Jibun(지번 주소) / 도로명 주소일 때 괄호 치고 (법정동, 건물명) 이런식으로 씀.
    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname; // 위에서 extraAddress가 괄호에 들어간다 했음. 법정동 이름(예: 백현동)
      }
      if (data.buildingName !== "") {
        extraAddress +=
          extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName; // buildingName: 건물 이름(예: 카카오 판교아지트) / extraAddress가 비어있지 않으면 (~~, 건물이름)으로 들어가고 비어있으면 (건물이름)만 들어감.
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : ""; // fullAddress + extraAddress 했을때 비어있지 않으면 -> 최종 완성: 인천 남동구 구월동 (ㅇㅇ아파트)
    }

    // 폼(input) 안에 있는 postcode, address에 setValue로 값을 넣음.
    setValue("postcode", data.zonecode); // 카카오가 준 우편번호
    setValue("address", fullAddress); // 최종 완성된 주소
    setIsPostcodeOpen(false); // 주소 찾았으니 팝업은 닫음.
  };

  // 전화번호 입력값에서 숫자만 남기고 010-1234-5678 형태로 바꿔주는 함수
  const formatPhoneNumber = (value) => {
    // 입력값에서 숫자만 추출하고 최대 11자리로 자르기, /\D/g는 숫자가 아닌 걸 전부 제거한다는 뜻
    const onlyNumbers = value.replace(/\D/g, "").slice(0, 11);

    // 숫자만 남긴 값이 3자리 이하이면 그대로 반환
    if (onlyNumbers.length <= 3) {
      return onlyNumbers;
    }

    // 숫자만 남긴 값이 4~7자리면 010-1234 형태로 반환
    if (onlyNumbers.length <= 7) {
      return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3)}`;
    }

    // 숫자만 남긴 값이 8자리 이상이면 010-1234-5678 형태로 반환
    return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3, 7)}-${onlyNumbers.slice(7)}`;
  };

  // 회원가입 mutation (백엔드 통신)
  const mutation = useMutation({
    mutationFn: socialSignupUser, // api.js에 있는 socialSignupUser로 POST 요청 함수 실행해서 백엔드로 회원가입 정보를 보냄
    // 통신 성공시
    onSuccess: () => {
      // 마케팅 약관 동의 시 알림 처리

      if (getValues("agreeNotification")) {
        if (window.OneSignal) {
          //window 전역 객체 사용
          window.OneSignal.Notifications.requestPermission();
        }
      }

      setStep(4); // 회원가입 완료 단계로 이동
    },
    // 통신 실패시
    onError: (error) => {
      // 서버가 준 에러 메세지를 알림창에 띄움
      const errMsg = error.response?.data || "가입에 실패했습니다."; // 백엔드 기본 응답(예: "이미 있는 이메일입니다.") or 커스텀"실패"메세지
      setToast({ open: true, message: errMsg, severity: "error" }); // 알림창(토스트) 세팅
    },
  });

  // 소셜 회원가입 관심사 단계에서 가입 완료/건너뛰기 버튼을 눌렀을 때 실행되는 최종 회원가입 제출 함수
  const onSubmit = (data) => {
    // step이 3이 아니면 함수 종료 (관심사 선택 단계에서만 onSubmit이 실행되게 함)
    if (step !== 3) {
      return;
    }

    // 백엔드의 SignupRequestDTO 모양에 맞춰서 객체를 만듬.
    const signupData = {
      user: {
        // --- 구글에서 가져온 거 ---
        email: googleData.email,
        nickname: data.nickname, // 구글이 준 이름을 닉네임 입력창에 기본값으로 넣어줬지만, 유저가 수정할 수도 있으니까 입력창에서 가져온 data.nickname을 사용함.
        providerId: googleData.providerId, // 구글 고유 회원 번호 (백엔드 식별용)
        profileImage: googleData.profileImage, // 진짜 파일이 아니라 구글 프사 URL 텍스트임
        // --- 유저가 쓴 거 ---
        birthday: data.birthday,
        gender: data.gender,
        phone: data.phone,
        postcode: data.postcode,
        address: data.address,
        detailAddress: data.detailAddress,
      },
      terms: {
        TOS: data.agreeTos,
        PRIVACY: data.agreePrivacy,
        MARKETING: data.agreeMarketing || false, // false는 체크 안한 상태, true는 체크한 상태.
        NOTIFICATION: data.agreeNotification || false, // false는 체크 안한 상태, true는 체크한 상태.
      },
      interests: selectedInterests, // 선택한 관심사 id 배열 그대로 넣음 (예: [1, 3, 5])
    };

    mutation.mutate(signupData); // 여기는 파일 전송(FormData, Blob)이 없으므로, 방금 조립한 깔끔한 JSON 객체(signupData)를 그대로 백엔드로 보냄.
  };

  return (
    <div className={styles.signupPage}>
      <main className={styles.signupMain}>
        <section className={styles.formSection}>
          <div className={styles.formCard}>
            {step < 4 && (
              <nav
                className={styles.signupStepperSocial}
                aria-label="소셜 회원가입 단계"
              >
                {["약관동의", "기본 정보", "관심사 선택"].map(
                  (label, index) => {
                    const stepNumber = index + 1;
                    return (
                      <div
                        key={label}
                        className={`${styles.signupStep} ${
                          step === stepNumber ? styles.signupStepActive : ""
                        } ${step > stepNumber ? styles.signupStepDone : ""}`}
                      >
                        <div className={styles.signupStepNumber}>
                          <span>{stepNumber}</span>
                        </div>
                        <div className={styles.signupStepLabel}>{label}</div>
                      </div>
                    );
                  },
                )}
                <div
                  className={`${styles.signupStep} ${step === 4 ? styles.signupStepActive : ""}`}
                >
                  <div className={styles.signupStepNumber}>
                    <span>4</span>
                  </div>
                  <div className={styles.signupStepLabel}>가입 완료</div>
                </div>
              </nav>
            )}

            <form
              className={styles.signupForm}
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(onSubmit)(e);
              }}
            >
              {step === 1 && (
                <section className={styles.flowSection}>
                  <div className={styles.flowHeroCenter}>
                    <h2 className={styles.flowTitle}>약관에 동의해주세요</h2>
                    <p className={styles.flowDescription}>
                      WithDay의 서비스 이용을 위해 아래 약관에 동의해주세요.
                    </p>
                  </div>

                  <label className={`${styles.termCard} ${styles.termCardAll}`}>
                    <span className={styles.checkBoxWrap}>
                      <input
                        type="checkbox"
                        className={styles.checkBoxNative}
                        checked={allAgreed}
                        onChange={handleAgreeAll}
                      />
                    </span>
                    <span className={styles.termTextArea}>
                      <strong className={styles.termTitle}>전체 동의</strong>
                      <span className={styles.termDesc}>
                        선택 항목을 포함한 모든 약관에 동의합니다.
                      </span>
                    </span>
                  </label>

                  <div className={styles.termList}>
                    <label className={styles.termRow}>
                      <span className={styles.checkBoxWrap}>
                        <input
                          type="checkbox"
                          className={styles.checkBoxNative}
                          {...register("agreeTos")}
                        />
                      </span>
                      <span className={styles.termRowTitle}>
                        <b>[필수]</b> 서비스 이용약관 동의
                      </span>
                      <button
                        type="button"
                        className={styles.termViewButton}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenTerms("TOS");
                        }}
                      >
                        자세히보기
                      </button>
                      {errors.agreeTos && (
                        <span className={styles.termError}>
                          {errors.agreeTos.message}
                        </span>
                      )}
                    </label>

                    <label className={styles.termRow}>
                      <span className={styles.checkBoxWrap}>
                        <input
                          type="checkbox"
                          className={styles.checkBoxNative}
                          {...register("agreePrivacy")}
                        />
                      </span>
                      <span className={styles.termRowTitle}>
                        <b>[필수]</b> 개인정보 수집 및 이용 동의
                      </span>
                      <button
                        type="button"
                        className={styles.termViewButton}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenTerms("PRIVACY");
                        }}
                      >
                        자세히보기
                      </button>
                      {errors.agreePrivacy && (
                        <span className={styles.termError}>
                          {errors.agreePrivacy.message}
                        </span>
                      )}
                    </label>

                    <label className={styles.termRow}>
                      <span className={styles.checkBoxWrap}>
                        <input
                          type="checkbox"
                          className={styles.checkBoxNative}
                          {...register("agreeMarketing")}
                        />
                      </span>
                      <span className={styles.termRowTitle}>
                        <b>[선택]</b> 마케팅 정보 수신 동의
                      </span>
                      <button
                        type="button"
                        className={styles.termViewButton}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenTerms("MARKETING");
                        }}
                      >
                        자세히보기
                      </button>
                    </label>

                    <label className={styles.termRow}>
                      <span className={styles.checkBoxWrap}>
                        <input
                          type="checkbox"
                          className={styles.checkBoxNative}
                          {...register("agreeNotification")}
                        />
                      </span>
                      <span className={styles.termRowTitle}>
                        <b>[선택]</b> 알림 수신 동의
                      </span>
                      <button
                        type="button"
                        className={styles.termViewButton}
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenTerms("NOTIFICATION");
                        }}
                      >
                        자세히보기
                      </button>
                    </label>
                  </div>

                  <p className={styles.noticeText}>
                    필수 항목에 동의해야 회원가입을 진행하실 수 있습니다.
                  </p>
                </section>
              )}

              {step === 2 && (
                <section className={styles.flowSection}>
                  <div className={styles.flowHeroCenter}>
                    <h2 className={styles.flowTitle}>
                      기본 정보를 입력해주세요
                    </h2>
                    <p className={styles.flowDescription}>
                      소셜 계정에 연결할 기본 프로필 정보를 입력해주세요.
                    </p>
                  </div>

                  <div className={styles.profileGrid}>
                    <div className={styles.basicFields}>
                      <div className={styles.formRow}>
                        <span className={styles.formRowLabel}>닉네임</span>
                        <div className={styles.formControlArea}>
                          <FormField error={errors.nickname}>
                            <Input
                              type="text"
                              placeholder="닉네임을 입력해주세요"
                              maxLength={20}
                              {...register("nickname")}
                            />
                          </FormField>
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <span className={styles.formRowLabel}>생년월일</span>
                        <div className={styles.formControlArea}>
                          <FormField error={errors.birthday}>
                            <Input
                              type="date"
                              max={todayDate}
                              {...register("birthday")}
                            />
                          </FormField>
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <span className={styles.formRowLabel}>성별</span>
                        <div className={styles.formControlArea}>
                          <FormField error={errors.gender}>
                            <div className={styles.segmentGroup}>
                              <label className={styles.segmentItem}>
                                <input
                                  type="radio"
                                  value="1"
                                  {...register("gender")}
                                />
                                <span>남성</span>
                              </label>
                              <label className={styles.segmentItem}>
                                <input
                                  type="radio"
                                  value="2"
                                  {...register("gender")}
                                />
                                <span>여성</span>
                              </label>
                            </div>
                          </FormField>
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <span className={styles.formRowLabel}>전화번호</span>
                        <div className={styles.formControlArea}>
                          <FormField error={errors.phone}>
                            <Input
                              type="tel"
                              inputMode="numeric"
                              placeholder="010-1234-5678"
                              {...register("phone")}
                              onChange={(e) => {
                                const formattedPhone = formatPhoneNumber(
                                  e.target.value,
                                );
                                setValue("phone", formattedPhone, {
                                  shouldValidate: true,
                                });
                              }}
                            />
                          </FormField>
                        </div>
                      </div>

                      <div className={styles.formRow}>
                        <span className={styles.formRowLabel}>주소</span>
                        <div className={styles.formControlArea}>
                          <FormField
                            error={
                              errors.postcode ||
                              errors.address ||
                              errors.detailAddress
                            }
                          >
                            <div className={styles.addressStack}>
                              <div className={styles.inputRow}>
                                <div className={styles.flex1}>
                                  <Input
                                    type="text"
                                    placeholder="우편번호"
                                    readOnly
                                    {...register("postcode")}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={styles.inlineActionButton}
                                  onClick={() => setIsPostcodeOpen(true)}
                                >
                                  검색
                                </Button>
                              </div>
                              <Input
                                type="text"
                                placeholder="기본 주소"
                                readOnly
                                {...register("address")}
                              />
                              <Input
                                type="text"
                                placeholder="상세 주소를 입력해주세요"
                                {...register("detailAddress")}
                              />
                            </div>
                          </FormField>
                        </div>
                      </div>
                    </div>

                    <label className={styles.photoUploadBox}>
                      {googleData.profileImage ? (
                        <span className={styles.photoPreviewFrame}>
                          <img
                            src={googleData.profileImage}
                            alt="구글 프로필 미리보기"
                            referrerPolicy="no-referrer"
                          />
                        </span>
                      ) : (
                        <span className={styles.photoIcon}>📷</span>
                      )}
                      <strong>구글 프로필 사용</strong>
                      <span>
                        소셜 계정의 프로필 이미지가 자동으로 연결됩니다.
                      </span>
                      <small>{googleData.email || "Google 계정"}</small>
                    </label>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section className={styles.flowSection}>
                  <div className={styles.flowHeroCenter}>
                    <h2 className={styles.flowTitle}>관심사를 선택해주세요</h2>
                    <p className={styles.flowDescription}>
                      관심사를 선택하면 더 잘 맞는 위트와 일정을 추천받을 수
                      있어요.
                    </p>
                  </div>

                  <div className={styles.interestGrid}>
                    {isInterestsLoading && (
                      <p className={styles.emptyText}>
                        관심사를 불러오는 중입니다...
                      </p>
                    )}
                    {isInterestsError && (
                      <p className={styles.errorText}>
                        관심사 목록을 불러오지 못했습니다.
                      </p>
                    )}
                    {!isInterestsLoading &&
                      !isInterestsError &&
                      interestsData.length === 0 && (
                        <p className={styles.emptyText}>
                          표시할 관심사가 없습니다.
                        </p>
                      )}

                    {!isInterestsLoading &&
                      !isInterestsError &&
                      interestsData.map((interest) => {
                        const isSelected = selectedInterests.includes(
                          interest.id,
                        );
                        const IconComponent = FaIcons[interest.iconName];

                        return (
                          <button
                            key={interest.id}
                            type="button"
                            className={`${styles.interestButton} ${isSelected ? styles.interestButtonActive : ""}`}
                            onClick={() => handleToggleInterest(interest.id)}
                          >
                            {IconComponent && (
                              <IconComponent className={styles.interestIcon} />
                            )}
                            <span>{interest.interestName}</span>
                          </button>
                        );
                      })}
                  </div>

                  <div className={styles.selectedInterestBox}>
                    <div className={styles.selectedInterestHead}>
                      <strong>
                        선택한 관심사 {selectedInterests.length}개
                      </strong>
                      {selectedInterests.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedInterests([])}
                        >
                          모두 해제 ↻
                        </button>
                      )}
                    </div>
                    {selectedInterests.length > 0 ? (
                      <div className={styles.selectedPills}>
                        {selectedInterests.map((id) => {
                          const interest = interestsData.find(
                            (item) => item.id === id,
                          );
                          return (
                            <button
                              key={id}
                              type="button"
                              className={styles.selectedPill}
                              onClick={() => handleToggleInterest(id)}
                            >
                              {interest?.interestName || id} <span>×</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className={styles.selectedEmpty}>
                        관심사를 선택하지 않아도 가입할 수 있어요.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {step === 4 && (
                <section
                  className={`${styles.flowSection} ${styles.completeSection}`}
                >
                  <div className={styles.flowHeroCenter}>
                    <h2 className={styles.completeTitle}>
                      가입이 완료되었어요!
                    </h2>
                    <p className={styles.flowDescription}>
                      이제 WithDay에서 당신의 여행 메이트, 위트를 만나보세요.
                    </p>
                  </div>

                  <div className={styles.completeVisual}>
                    <span className={styles.confettiMark}>◆</span>
                    <span className={styles.confettiMark}>~</span>
                    <div className={styles.completeCheck}>✓</div>
                    <span className={styles.confettiMark}>◆</span>
                    <span className={styles.confettiMark}>~</span>
                  </div>

                  <div className={styles.completePanel}>
                    <div className={styles.completePanelIcon}>👤</div>
                    <div>
                      <strong>프로필 설정이 완료되었습니다</strong>
                      <p>
                        당신만을 위한 여행 메이트 추천과 맞춤형 여행 경험을
                        시작할 준비가 되었어요.
                      </p>
                    </div>
                  </div>

                  <p className={styles.autoRedirectText}>
                    잠시 후 로그인 페이지로 자동 이동합니다.
                  </p>
                </section>
              )}

              {step < 4 && (
                <div className={styles.signupActions}>
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className={styles.prevButton}
                      onClick={() => setStep((prev) => prev - 1)}
                    >
                      ‹ 이전
                    </Button>
                  ) : (
                    <button
                      type="button"
                      className={styles.backToLoginButton}
                      onClick={() => navigate("/login")}
                    >
                      ‹ 로그인으로 돌아가기
                    </button>
                  )}

                  {step < 3 ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className={styles.nextButton}
                      onClick={handleNextStep}
                    >
                      다음 ›
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className={styles.nextButton}
                      disabled={
                        mutation.isPending ||
                        isInterestsLoading ||
                        isInterestsError
                      }
                      onClick={handleSubmit(onSubmit)}
                    >
                      {mutation.isPending
                        ? "가입하는 중..."
                        : selectedInterests.length === 0
                          ? "건너뛰고 가입"
                          : "가입 완료"}{" "}
                      ›
                    </Button>
                  )}
                </div>
              )}
            </form>
          </div>
        </section>

        <aside className={styles.imageSection} aria-hidden="true">
          <img src="/withday_signup_bg.jpg" alt="" className={styles.bgImage} />
        </aside>
      </main>

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

      <Dialog
        open={isPostcodeOpen}
        onClose={() => setIsPostcodeOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          주소 검색
          <IconButton onClick={() => setIsPostcodeOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <DaumPostcode
            onComplete={handleCompletePostcode}
            style={{ width: "100%", height: "400px" }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={openTerms !== null}
        onClose={() => setOpenTerms(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            m: 0,
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: "bold",
          }}
        >
          {openTerms ? getTermTitle(openTerms) : ""}
          <IconButton onClick={() => setOpenTerms(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <pre className={styles.termPre}>
            {openTerms ? getTermContent(openTerms) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialExtra;
