import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { Snackbar, Alert } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import {
  findPwEmailSchema,
  findPwCodeSchema,
  findPwResetSchema,
} from "../../features/auth/validation/authSchema";

import {
  sendPasswordResetCode,
  verifyPasswordResetCode,
  resetPassword,
} from "../../features/auth/api";

import FormField from "../../shared/ui/Form/FormField";
import { Input } from "../../shared/ui/Form/Form";
import Button from "../../shared/ui/Button/Button";
import styles from "./Find.module.css";

const FindPw = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // 1단계: 이메일 입력 폼
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm({
    resolver: yupResolver(findPwEmailSchema),
    mode: "onSubmit",
  });

  // 2단계: 인증번호 입력 폼
  const {
    register: registerCode,
    handleSubmit: handleSubmitCode,
    setValue: setCodeValue,
    formState: { errors: codeErrors },
  } = useForm({
    resolver: yupResolver(findPwCodeSchema),
    mode: "onSubmit",
  });

  // 3단계: 새 비밀번호 입력 폼
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
  } = useForm({
    resolver: yupResolver(findPwResetSchema),
    mode: "onSubmit",
  });

  const handleCloseToast = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setToast((prev) => ({ ...prev, open: false }));
  };

  // 비밀번호 찾기 인증번호 전송 mutation
  const sendCodeMutation = useMutation({
    mutationFn: sendPasswordResetCode,

    onSuccess: (data, email) => {
      setVerifiedEmail(email);
      setStep(2);

      setToast({
        open: true,
        message: "인증번호가 이메일로 발송되었습니다.",
        severity: "success",
      });
    },

    onError: (error) => {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data ||
        "인증번호 발송에 실패했습니다.";

      setToast({
        open: true,
        message: errMsg,
        severity: "error",
      });
    },
  });

  // 비밀번호 찾기 인증번호 확인 mutation
  const verifyCodeMutation = useMutation({
    mutationFn: verifyPasswordResetCode,

    onSuccess: () => {
      setStep(3);

      setToast({
        open: true,
        message: "인증번호 확인이 완료되었습니다.",
        severity: "success",
      });
    },

    onError: (error) => {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data ||
        "인증번호가 일치하지 않습니다.";

      setToast({
        open: true,
        message: errMsg,
        severity: "error",
      });
    },
  });

  // 비밀번호 재설정 mutation
  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,

    onSuccess: () => {
      setStep(4);

      setToast({
        open: true,
        message: "비밀번호가 변경되었습니다.",
        severity: "success",
      });
    },

    onError: (error) => {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data ||
        "비밀번호 변경에 실패했습니다.";

      setToast({
        open: true,
        message: errMsg,
        severity: "error",
      });
    },
  });

  // 인증번호 전송 버튼을 눌렀을 때
  const handleSendAuthCode = (data) => {
    // data: { email }
    sendCodeMutation.mutate(data.email);
  };

  // 인증번호 확인 버튼을 눌렀을 때
  const handleVerifyAuthCode = (data) => {
    // data: { authCode }
    verifyCodeMutation.mutate({
      email: verifiedEmail,
      authCode: data.authCode,
    });
  };

  // 비밀번호 재설정 버튼을 눌렀을 때
  const handleResetPassword = (data) => {
    // data: { newPassword, newPasswordConfirm }
    resetPasswordMutation.mutate({
      email: verifiedEmail,
      newPassword: data.newPassword,
    });
  };

  return (
    <div className={styles.findPage}>
      <div className={styles.findCard}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/login")}
        >
          {"<"} 로그인으로 돌아가기
        </button>

        <div className={styles.findHeader}>
          <p className={styles.findEyebrow}>WITHDAY ACCOUNT</p>
          <h1 className={styles.findTitle}>비밀번호 찾기</h1>
          <p className={`${styles.findSubtitle} ${styles.findPwSubtitle}`}>
            이메일 인증 후 새 비밀번호를 설정할 수 있어요.
          </p>
        </div>

        {step < 4 && (
          <div className={styles.findStepBar}>
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`${styles.findStepDot} ${
                  step >= stepNumber ? styles.findStepDotActive : ""
                }`}
              >
                {stepNumber}
              </div>
            ))}
          </div>
        )}

        {step === 1 && (
          <form
            className={styles.findForm}
            onSubmit={handleSubmitEmail(handleSendAuthCode)}
          >
            <FormField
              label="이메일"
              error={emailErrors.email}
              helperText="가입한 이메일 주소를 입력해주세요."
            >
              <Input
                type="email"
                placeholder="example@withday.com"
                {...registerEmail("email")}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={sendCodeMutation.isPending}
            >
              {sendCodeMutation.isPending ? "전송 중..." : "인증번호 전송"}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form
            className={styles.findForm}
            onSubmit={handleSubmitCode(handleVerifyAuthCode)}
          >
            <FormField
              label="인증번호"
              error={codeErrors.authCode}
              helperText="이메일로 전송된 인증번호 6자리를 입력해주세요."
            >
              <Input
                type="text"
                inputMode="numeric"
                placeholder="인증번호 6자리"
                maxLength={6}
                {...registerCode("authCode")}
                onChange={(e) => {
                  // 영문자 + 숫자만 입력되게 하고, 특수문자/한글/공백은 제거함.
                  const authCodeValue = e.target.value.replace(
                    /[^A-Za-z0-9]/g,
                    "",
                  );
                  setCodeValue("authCode", authCodeValue, {
                    shouldValidate: true,
                  });
                }}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={verifyCodeMutation.isPending}
            >
              {verifyCodeMutation.isPending ? "확인 중..." : "인증번호 확인"}
            </Button>

            <button
              type="button"
              className={styles.textButton}
              onClick={() => {
                setStep(1);
                setVerifiedEmail("");
                setCodeValue("authCode", "");
              }}
            >
              이메일 다시 입력하기
            </button>
          </form>
        )}

        {step === 3 && (
          <form
            className={styles.findForm}
            onSubmit={handleSubmitReset(handleResetPassword)}
          >
            <FormField label="새 비밀번호" error={resetErrors.newPassword}>
              <div className={styles.passwordInputWrap}>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="새 비밀번호를 입력해주세요"
                  style={{ paddingRight: "40px" }}
                  {...registerReset("newPassword")}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPw((prev) => !prev)}
                >
                  {showPw ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </button>
              </div>
            </FormField>

            <FormField
              label="새 비밀번호 확인"
              error={resetErrors.newPasswordConfirm}
            >
              <div className={styles.passwordInputWrap}>
                <Input
                  type={showPwConfirm ? "text" : "password"}
                  placeholder="새 비밀번호를 다시 입력해주세요"
                  style={{ paddingRight: "40px" }}
                  {...registerReset("newPasswordConfirm")}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPwConfirm((prev) => !prev)}
                >
                  {showPwConfirm ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </button>
              </div>
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending
                ? "변경 중..."
                : "비밀번호 재설정"}
            </Button>
          </form>
        )}

        {step === 4 && (
          <div className={styles.resultBox}>
            <div className={styles.resultIcon}>✓</div>

            <h2 className={styles.resultTitle}>비밀번호가 변경되었어요</h2>
            <p className={styles.resultDesc}>
              새 비밀번호로 다시 로그인해주세요.
            </p>

            <Button
              type="button"
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate("/login")}
            >
              로그인하러 가기
            </Button>
          </div>
        )}
      </div>

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

export default FindPw;
