import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { Snackbar, Alert } from "@mui/material";

import { findIdSchema } from "../../features/auth/validation/authSchema";
import { findIdUser } from "../../features/auth/api";

import FormField from "../../shared/ui/Form/FormField";
import { Input } from "../../shared/ui/Form/Form";
import Button from "../../shared/ui/Button/Button";
import styles from "./Find.module.css";

const FindId = () => {
  const navigate = useNavigate();

  const [foundEmail, setFoundEmail] = useState(null);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(findIdSchema),
    mode: "onSubmit",
  });

  const handleCloseToast = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    setToast((prev) => ({ ...prev, open: false }));
  };

  const formatPhoneNumber = (value) => {
    const onlyNumbers = value.replace(/\D/g, "").slice(0, 11);

    if (onlyNumbers.length <= 3) {
      return onlyNumbers;
    }

    if (onlyNumbers.length <= 7) {
      return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3)}`;
    }

    return `${onlyNumbers.slice(0, 3)}-${onlyNumbers.slice(3, 7)}-${onlyNumbers.slice(7)}`;
  };

  const mutation = useMutation({
    mutationFn: findIdUser,

    onSuccess: (data) => {
      setFoundEmail(data.email);

      setToast({
        open: true,
        message: "가입된 아이디를 찾았습니다.",
        severity: "success",
      });
    },

    onError: (error) => {
      const errMsg =
        error.response?.data?.message ||
        error.response?.data ||
        "일치하는 회원 정보를 찾을 수 없습니다.";

      setToast({
        open: true,
        message: errMsg,
        severity: "error",
      });
    },
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
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
          <h1 className={styles.findTitle}>아이디 찾기</h1>
          <p className={`${styles.findSubtitle} ${styles.findIdSubtitle}`}>
            가입 시 입력한 닉네임과 전화번호로 아이디를 찾을 수 있어요.
          </p>
        </div>

        {!foundEmail ? (
          <form className={styles.findForm} onSubmit={handleSubmit(onSubmit)}>
            <FormField label="닉네임" error={errors.nickname}>
              <Input
                type="text"
                placeholder="닉네임을 입력해주세요"
                maxLength={20}
                {...register("nickname")}
              />
            </FormField>

            <FormField label="전화번호" error={errors.phone}>
              <Input
                type="tel"
                inputMode="numeric"
                placeholder="010-1234-5678"
                {...register("phone")}
                onChange={(e) => {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setValue("phone", formattedPhone, {
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
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "찾는 중..." : "아이디 찾기"}
            </Button>
          </form>
        ) : (
          <div className={styles.resultBox}>
            <div className={styles.resultIcon}>✓</div>

            <h2 className={styles.resultTitle}>가입된 아이디를 찾았어요</h2>
            <p className={styles.resultDesc}>
              개인정보 보호를 위해 이메일 일부만 보여드려요.
            </p>

            <div className={styles.emailResult}>{foundEmail}</div>

            <div className={styles.resultActions}>
              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => navigate("/login")}
              >
                로그인하기
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => navigate("/find-pw")}
              >
                비밀번호 찾기
              </Button>
            </div>
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

export default FindId;
