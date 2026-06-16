import { Input, TextArea } from "../../shared/ui/Form/Form";
import styles from "./RecommendedScheduleWrite.module.css";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../shared/ui/Button/Button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDetailRegion, getRegion } from "../../features/region/api";
import { createRecommendedSchedule } from "../../features/recommended/api";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { recommendedScheduleSchema } from "../../features/recommended/validation/recommendedScheduleSchema";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useAuthStore } from "../../features/auth/store/authStore";
import CommonSelect from "../../shared/ui/Select/CommonSelect";

const RecommendedScheduleWrite = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // DB Enum 매핑용 카테고리 리스트
  const categories = [
    { label: "선택하세요", value: "" },
    { label: "여행", value: "travel" },
    { label: "팝업", value: "popup" },
    { label: "식사", value: "food" },
    { label: "액티비티", value: "activity" },
    { label: "문화", value: "culture" },
    { label: "기타", value: "etc" },
  ];

  // 이미지용 useState, RHF가 처리할 수 없어서 그대로 사용
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);

  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.status === "admin";

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitted },
  } = useForm({
    resolver: yupResolver(recommendedScheduleSchema),
    defaultValues: {
      recommendedSchedule: {
        title: "",
        description: "",
        category: "",
        region: "",
        detailRegion: "",
        durationDays: null,
        minParticipants: null,
        maxParticipants: null,
        ageMin: null,
        ageMax: null,
        genderLimit: "all",
        totalPrice: null,
        costType: "per_person",
      },
      files: [],
      detailSchedule: [
        {
          dayNumber: 1,
          sortOrder: 1,
          title: "",
          description: "",
        },
      ],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "detailSchedule",
  });

  const region = watch("recommendedSchedule.region");
  const genderLimit = watch("recommendedSchedule.genderLimit");
  const costType = watch("recommendedSchedule.costType");
  const totalPrice = watch("recommendedSchedule.totalPrice");

  const flattenErrors = (errorsObj) => {
    return Object.values(errorsObj).flatMap((err) => {
      if (!err) return [];

      // nested error
      if (err?.message) return [err.message];

      // array error
      if (Array.isArray(err)) {
        return err.flatMap((item) =>
          Object.values(item ?? {})
            .map((e) => e?.message)
            .filter(Boolean),
        );
      }

      // nested object
      return Object.values(err ?? {})
        .map((e) => e?.message)
        .filter(Boolean);
    });
  };

  const errorList = flattenErrors(errors);
  const hasError = isSubmitted && Object.keys(errors).length > 0;
  const errorMessage = errorList.join("\n");

  // 시/도 조회
  const { data: regions = [] } = useQuery({
    queryKey: ["recommended-region"],
    queryFn: getRegion,
  });

  // 군/구 조회
  const { data: detailRegions = [] } = useQuery({
    queryKey: ["recommended-detail-region", region],
    queryFn: () => getDetailRegion(region),
    enabled: !!region,
  });

  // 지역이 바뀌면 상세 지역 초기화
  useEffect(() => {
    setValue("recommendedSchedule.detailRegion", "");
  }, [region, setValue]);

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toLocaleString();
  };

  // 관리자 권한 방어
  useEffect(() => {
    if (!user) return;

    if (!isAdmin) {
      navigate("/recommended-schedules", { replace: true });
    }
  }, [user, isAdmin, navigate]);

  // 사진 업로드 시 시간 오래 걸릴 때 등록 버튼 막음
  const { mutateAsync: submitRecommendedSchedule, isPending } = useMutation({
    mutationFn: ({ recommendedData, images }) => {
      return createRecommendedSchedule({
        recommendedData,
        images,
      });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({
        queryKey: ["recommended-schedules"],
      });

      navigate("/recommended-schedules");
    },
    onError: (err) => {
      console.error("error: ", err);
    },
  });

  const onSubmit = async (formValues) => {
    // 등록 2차 방어
    if (isPending) return;

    const recommendedData = {
      recommendedSchedule: {
        ...formValues.recommendedSchedule,
        durationDays: Number(formValues.recommendedSchedule.durationDays),
        minParticipants: Number(formValues.recommendedSchedule.minParticipants),
        maxParticipants: Number(formValues.recommendedSchedule.maxParticipants),
        ageMin: Number(formValues.recommendedSchedule.ageMin),
        ageMax: Number(formValues.recommendedSchedule.ageMax),
        totalPrice:
          formValues.recommendedSchedule.totalPrice === null
            ? 0
            : Number(formValues.recommendedSchedule.totalPrice),
      },
      detailSchedule: formValues.detailSchedule.map((item, index) => ({
        dayNumber: Number(item.dayNumber),
        sortOrder: index + 1,
        title: item.title,
        description: item.description,
      })),
    };

    await submitRecommendedSchedule({
      recommendedData,
      images: files,
    });
  };

  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleCostTypeChange = (type) => {
    setValue("recommendedSchedule.costType", type, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (type === "free") {
      setValue("recommendedSchedule.totalPrice", 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setValue("recommendedSchedule.totalPrice", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  useEffect(() => {
    setOpenSnackbar(hasError);
  }, [hasError]);

  if (!isAdmin) {
    return (
      <>
        <header className={styles.header}></header>
        <main className={styles.main}>
          <div className={styles.contentWrap}>
            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>권한 확인</h2>
              <div className={styles.sectionContent}>
                관리자 권한을 확인하는 중입니다.
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  const validateRange = ({
    min,
    max,
    minField,
    maxField,
    minLimit,
    maxLimit,
    minMessage,
    maxMessage,
    crossMessage,
  }) => {
    // 범위 체크
    if (min != null && (min < minLimit || min > maxLimit)) {
      setError(minField, { message: minMessage });
    } else {
      clearErrors(minField);
    }

    if (max != null && (max < minLimit || max > maxLimit)) {
      setError(maxField, { message: maxMessage });
    } else {
      clearErrors(maxField);
    }

    // 교차 체크 (핵심)
    if (min != null && max != null && min > max) {
      setError(minField, { message: crossMessage });
      setError(maxField, { message: crossMessage });
    }
  };

  return (
    <>
      <header className={styles.header}></header>
      <main className={styles.main}>
        <div className={styles.contentWrap}>
          <form
            onSubmit={handleSubmit(onSubmit, (err) => {
              console.log("validation error", err);
            })}
          >
            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>기본 정보</h2>
              <div className={styles.sectionContent}>
                <ul className={`${styles.inputWrap} ${styles.title}`}>
                  <li>
                    <label htmlFor="title">일정명</label>
                  </li>
                  <li>
                    <Input
                      type="text"
                      name="title"
                      id="title"
                      placeholder="일정명"
                      {...register("recommendedSchedule.title")}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.description}`}>
                  <li>
                    <label htmlFor="description">일정 설명</label>
                  </li>
                  <li>
                    <TextArea
                      name="description"
                      id="description"
                      placeholder="일정 설명"
                      {...register("recommendedSchedule.description")}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.category}`}>
                  <li>
                    <label htmlFor="category">일정 종류</label>
                  </li>
                  <li>
                    <Controller
                      name="recommendedSchedule.category"
                      control={control}
                      render={({ field }) => (
                        <CommonSelect
                          label="일정 종류"
                          value={field.value}
                          onChange={field.onChange}
                          options={categories}
                        />
                      )}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.region}`}>
                  <li>
                    <label htmlFor="region">지역(시/도)</label>
                  </li>
                  <li>
                    <Controller
                      name="recommendedSchedule.region"
                      control={control}
                      render={({ field }) => (
                        <CommonSelect
                          label="시/도"
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { label: "시/도", value: "" },
                            ...regions.map((item) => ({
                              label: item.regionName,
                              value: item.regionName,
                            })),
                          ]}
                        />
                      )}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.detailRegion}`}>
                  <li>
                    <label htmlFor="detailRegion">지역(시/군/구)</label>
                  </li>
                  <li>
                    <Controller
                      name="recommendedSchedule.detailRegion"
                      control={control}
                      render={({ field }) => (
                        <CommonSelect
                          label="시/군/구"
                          value={field.value}
                          onChange={field.onChange}
                          options={[
                            { label: "시/군/구", value: "" },
                            ...detailRegions.map((item) => ({
                              label: item.detailName,
                              value: item.detailName,
                            })),
                          ]}
                        />
                      )}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.duration}`}>
                  <li>
                    <label htmlFor="durationDays">추천 기간</label>
                  </li>
                  <li>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="1"
                      {...register("recommendedSchedule.durationDays", {
                        setValueAs: (v) => (v === "" ? null : Number(v)),

                        onChange: (e) => {
                          const onlyNumber = e.target.value.replace(
                            /[^0-9]/g,
                            "",
                          );
                          e.target.value = onlyNumber;
                        },

                        onBlur: (e) => {
                          let value = e.target.value;
                          if (value === "") return;

                          value = Number(value);

                          if (value < 1) value = 1;
                          if (value > 30) value = 30;

                          setValue("recommendedSchedule.durationDays", value);
                        },
                      })}
                    />
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>인원 및 성별 정보</h2>
              <div className={styles.gridContainer}>
                {/* ================= 최소 인원 ================= */}
                <ul className={`${styles.inputWrap} ${styles.peopleInfo}`}>
                  <li>최소 인원</li>
                  <li className={styles.peopleField}>
                    <Controller
                      name="recommendedSchedule.minParticipants"
                      control={control}
                      render={({ field }) => {
                        const error =
                          errors?.recommendedSchedule?.minParticipants;

                        return (
                          <div>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={field.value ?? ""}
                              placeholder={2}
                              className={error ? styles.errorInput : ""}
                              onChange={(e) => {
                                const onlyNumber = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                field.onChange(
                                  onlyNumber === "" ? null : Number(onlyNumber),
                                );
                              }}
                              onBlur={() => {
                                const min = field.value;
                                const max = getValues(
                                  "recommendedSchedule.maxParticipants",
                                );

                                if (!min) return;

                                if (min < 2 || min > 100) {
                                  setError(
                                    "recommendedSchedule.minParticipants",
                                    {
                                      message:
                                        "최소 인원은 2~100 사이여야 합니다",
                                    },
                                  );
                                  return;
                                }

                                if (max && min > max) {
                                  setError(
                                    "recommendedSchedule.minParticipants",
                                    {
                                      message:
                                        "최소 인원은 최대 인원보다 클 수 없습니다",
                                    },
                                  );
                                  return;
                                }

                                clearErrors(
                                  "recommendedSchedule.minParticipants",
                                );
                              }}
                            />

                            {error && (
                              <p className={styles.errorText}>
                                {error.message}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <span>명</span>
                  </li>
                </ul>

                {/* ================= 최대 인원 ================= */}
                <ul className={`${styles.inputWrap} ${styles.peopleInfo}`}>
                  <li>최대 인원</li>
                  <li className={styles.peopleField}>
                    <Controller
                      name="recommendedSchedule.maxParticipants"
                      control={control}
                      render={({ field }) => {
                        const error =
                          errors?.recommendedSchedule?.maxParticipants;

                        return (
                          <div>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={field.value ?? ""}
                              placeholder={100}
                              className={error ? styles.errorInput : ""}
                              onChange={(e) => {
                                const onlyNumber = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                field.onChange(
                                  onlyNumber === "" ? null : Number(onlyNumber),
                                );
                              }}
                              onBlur={() => {
                                const max = field.value;
                                const min = getValues(
                                  "recommendedSchedule.minParticipants",
                                );

                                if (!max) return;

                                if (max < 2 || max > 100) {
                                  setError(
                                    "recommendedSchedule.maxParticipants",
                                    {
                                      message:
                                        "최대 인원은 2~100 사이여야 합니다",
                                    },
                                  );
                                  return;
                                }

                                if (min && max < min) {
                                  setError(
                                    "recommendedSchedule.maxParticipants",
                                    {
                                      message:
                                        "최대 인원은 최소 인원보다 작을 수 없습니다",
                                    },
                                  );
                                  return;
                                }

                                clearErrors(
                                  "recommendedSchedule.maxParticipants",
                                );
                              }}
                            />

                            {error && (
                              <p className={styles.errorText}>
                                {error.message}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <span>명</span>
                  </li>
                </ul>

                {/* ================= 최소 연령 ================= */}
                <ul className={`${styles.inputWrap} ${styles.peopleInfo}`}>
                  <li>최소 연령</li>
                  <li className={styles.peopleField}>
                    <Controller
                      name="recommendedSchedule.ageMin"
                      control={control}
                      render={({ field }) => {
                        const error = errors?.recommendedSchedule?.ageMin;
                        const max = getValues("recommendedSchedule.ageMax");

                        return (
                          <div>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={field.value ?? ""}
                              placeholder={18}
                              className={error ? styles.errorInput : ""}
                              onChange={(e) => {
                                const onlyNumber = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                field.onChange(
                                  onlyNumber === "" ? null : Number(onlyNumber),
                                );
                              }}
                              onBlur={() => {
                                const min = field.value;

                                if (!min) return;

                                if (min < 18 || min > 100) {
                                  setError("recommendedSchedule.ageMin", {
                                    message:
                                      "최소 연령은 18~100 사이여야 합니다",
                                  });
                                  return;
                                }

                                if (max && min > max) {
                                  setError("recommendedSchedule.ageMin", {
                                    message:
                                      "최소 연령은 최대 연령보다 클 수 없습니다",
                                  });
                                  return;
                                }

                                clearErrors("recommendedSchedule.ageMin");
                              }}
                            />

                            {error && (
                              <p className={styles.errorText}>
                                {error.message}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <span>세</span>
                  </li>
                </ul>

                {/* ================= 최대 연령 ================= */}
                <ul className={`${styles.inputWrap} ${styles.peopleInfo}`}>
                  <li>최대 연령</li>
                  <li className={styles.peopleField}>
                    <Controller
                      name="recommendedSchedule.ageMax"
                      control={control}
                      render={({ field }) => {
                        const error = errors?.recommendedSchedule?.ageMax;
                        const min = getValues("recommendedSchedule.ageMin");

                        return (
                          <div>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={field.value ?? ""}
                              placeholder={100}
                              className={error ? styles.errorInput : ""}
                              onChange={(e) => {
                                const onlyNumber = e.target.value.replace(
                                  /[^0-9]/g,
                                  "",
                                );
                                field.onChange(
                                  onlyNumber === "" ? null : Number(onlyNumber),
                                );
                              }}
                              onBlur={() => {
                                const max = field.value;

                                if (!max) return;

                                if (max < 18 || max > 100) {
                                  setError("recommendedSchedule.ageMax", {
                                    message:
                                      "최대 연령은 18~100 사이여야 합니다",
                                  });
                                  return;
                                }

                                if (min && max < min) {
                                  setError("recommendedSchedule.ageMax", {
                                    message:
                                      "최대 연령은 최소 연령보다 작을 수 없습니다",
                                  });
                                  return;
                                }

                                clearErrors("recommendedSchedule.ageMax");
                              }}
                            />

                            {error && (
                              <p className={styles.errorText}>
                                {error.message}
                              </p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <span>세</span>
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.genderInfo}`}>
                  <li>성별 제한</li>
                  <li>
                    <Button
                      type="button"
                      variant={genderLimit === "all" ? "primary" : "outline"}
                      onClick={() =>
                        setValue("recommendedSchedule.genderLimit", "all", {
                          shouldValidate: true,
                        })
                      }
                    >
                      성별 무관
                    </Button>

                    <Button
                      type="button"
                      variant={genderLimit === "male" ? "primary" : "outline"}
                      onClick={() =>
                        setValue("recommendedSchedule.genderLimit", "male", {
                          shouldValidate: true,
                        })
                      }
                    >
                      남성
                    </Button>

                    <Button
                      type="button"
                      variant={genderLimit === "female" ? "primary" : "outline"}
                      onClick={() =>
                        setValue("recommendedSchedule.genderLimit", "female", {
                          shouldValidate: true,
                        })
                      }
                    >
                      여성
                    </Button>
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>상세 일정</h2>
              <RecommendedScheduleTable
                fields={fields}
                append={append}
                remove={remove}
                replace={replace}
                setValue={setValue}
                watch={watch}
              />
            </div>

            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>정산 방식</h2>
              <div>
                <ul className={`${styles.inputWrap} ${styles.costWrap}`}>
                  <li>총액</li>
                  <li className={styles.cost}>
                    <input
                      type="text"
                      className={styles.costInput}
                      value={formatNumber(totalPrice ?? "")}
                      disabled={costType === "free"}
                      onChange={(e) => {
                        // 숫자만 추출
                        let value = e.target.value.replace(/[^0-9]/g, "");

                        // 1000만원까지만 허용
                        value = value.slice(0, 8);

                        if (Number(value) > 10000000) {
                          value = "10000000";
                        }

                        setValue(
                          "recommendedSchedule.totalPrice",
                          value === "" ? null : Number(value),
                        );
                      }}
                    />
                    <span className={styles.won}>원</span>
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.costSharingWrap}`}>
                  <li>정산 방식</li>
                  <li className={styles.costSharingContent}>
                    <div className={styles.costSharing}>
                      <Button
                        type="button"
                        variant={
                          costType === "per_person" ? "primary" : "outline"
                        }
                        onClick={() => handleCostTypeChange("per_person")}
                      >
                        총액 1 / N<div className={styles.desc}>나누어 지불</div>
                      </Button>

                      <Button
                        type="button"
                        variant={
                          costType === "host_covered" ? "primary" : "outline"
                        }
                        onClick={() => handleCostTypeChange("host_covered")}
                      >
                        호스트 지불
                        <div className={styles.desc}>호스트 전액 부담</div>
                      </Button>

                      <Button
                        type="button"
                        variant={costType === "free" ? "primary" : "outline"}
                        onClick={() => handleCostTypeChange("free")}
                      >
                        무료
                        <div className={styles.desc}>비용 없음</div>
                      </Button>

                      <Button
                        type="button"
                        variant={costType === "custom" ? "primary" : "outline"}
                        onClick={() => handleCostTypeChange("custom")}
                      >
                        인당 고정
                        <div className={styles.desc}>정해진 금액 지불</div>
                      </Button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>첨부 이미지</h2>
              <AddThumbnail
                images={images}
                setImages={setImages}
                files={files}
                setFiles={setFiles}
                setValue={setValue}
              />
            </div>

            <div className={styles.registButtonWrap}>
              <Button type="submit" disabled={isPending}>
                {isPending ? "등록 중" : "등록"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                취소
              </Button>
            </div>
          </form>
        </div>
      </main>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setOpenSnackbar(false)}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      >
        <Alert
          severity="warning"
          variant="filled"
          sx={{ whiteSpace: "pre-line" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
    </>
  );
};

const RecommendedScheduleTable = ({
  fields,
  append,
  remove,
  replace,
  setValue,
  watch,
}) => {
  useEffect(() => {
    if (fields.length > 0) return;

    replace([
      {
        dayNumber: 1,
        sortOrder: 1,
        title: "",
        description: "",
      },
    ]);
  }, [fields.length, replace]);

  const handleChange = (index, key, value) => {
    setValue(`detailSchedule.${index}.${key}`, value, {
      shouldValidate: true,
    });
  };

  const handleAddDetail = () => {
    append({
      dayNumber: fields.length + 1,
      sortOrder: fields.length + 1,
      title: "",
      description: "",
    });
  };

  const handleRemoveDetail = (index) => {
    if (fields.length <= 1) {
      alert("상세 일정은 최소 1개 이상 필요합니다.");
      return;
    }

    remove(index);
  };

  return (
    <div className={styles.scheduleSection}>
      <div className={styles.scheduleAddRow}>
        <Button type="button" variant="outline" onClick={handleAddDetail}>
          <AddRoundedIcon fontSize="small" />
          상세 일정 추가
        </Button>
      </div>

      <div className={styles.scheduleTimeline}>
        {fields.map((row, i) => (
          <div key={row.id} className={styles.scheduleCard}>
            {/* 왼쪽 일차 */}
            <div className={styles.dayBadge}>
              <span>{watch(`detailSchedule.${i}.dayNumber`) || i + 1}</span>
              <p>일차</p>
            </div>

            {/* 오른쪽 */}
            <div className={styles.scheduleContent}>
              <div className={styles.scheduleHeader}>
                <strong>상세 일정 {i + 1}</strong>

                <button
                  type="button"
                  className={styles.scheduleDeleteButton}
                  onClick={() => handleRemoveDetail(i)}
                >
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </button>
              </div>

              <div className={styles.scheduleField}>
                <label>일차</label>

                <input
                  className={styles.scheduleInput}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="1"
                  value={watch(`detailSchedule.${i}.dayNumber`) || ""}
                  onChange={(e) => {
                    const onlyNumber = e.target.value.replace(/[^0-9]/g, "");
                    handleChange(i, "dayNumber", onlyNumber);
                  }}
                  onBlur={(e) => {
                    let value = e.target.value;
                    if (value === "") return;

                    value = Number(value);

                    if (value < 1) value = 1;
                    if (value > 30) value = 30;

                    handleChange(i, "dayNumber", value);
                  }}
                />
              </div>

              <div className={styles.scheduleField}>
                <label>제목</label>

                <input
                  className={styles.scheduleInput}
                  placeholder="일정 제목을 입력해주세요"
                  value={watch(`detailSchedule.${i}.title`) || ""}
                  onChange={(e) => handleChange(i, "title", e.target.value)}
                />
              </div>

              <div className={styles.scheduleField}>
                <label>소개</label>

                <div className={styles.textareaWrap}>
                  <textarea
                    className={styles.scheduleTextarea}
                    placeholder="일정 소개를 입력해주세요"
                    maxLength={300}
                    value={watch(`detailSchedule.${i}.description`) || ""}
                    onChange={(e) =>
                      handleChange(i, "description", e.target.value)
                    }
                  />

                  <div className={styles.textCount}>
                    {(watch(`detailSchedule.${i}.description`) || "").length}
                    /300
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AddThumbnail = ({ images, setImages, files, setFiles, setValue }) => {
  const fileInputRef = useRef(null);
  const imageUrlsRef = useRef([]);

  useEffect(() => {
    imageUrlsRef.current = images;
  }, [images]);

  // 이미지 추가
  const addImage = (file) => {
    if (!file) return;

    if (images.length >= 3) {
      alert("최대 3장까지 가능합니다.");
      return;
    }

    const url = URL.createObjectURL(file);

    const nextImages = [...images, url];
    const nextFiles = [...files, file];

    setImages(nextImages); // 미리보기용
    setFiles(nextFiles); // 업로드용
    setValue("files", nextFiles, { shouldValidate: true });
  };

  // 드롭
  const handleDrop = (e) => {
    e.preventDefault();

    const filesArr = Array.from(e.dataTransfer.files);
    const availableSlots = 3 - images.length;

    if (availableSlots <= 0) {
      alert("최대 3장까지 업로드 가능합니다.");
      return;
    }

    filesArr.slice(0, availableSlots).forEach(addImage);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // 클릭 업로드
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const filesArr = Array.from(e.target.files ?? []);
    const availableSlots = 3 - images.length;

    if (availableSlots <= 0) {
      alert("최대 3장까지 업로드 가능합니다.");
      return;
    }

    const selectedFiles = filesArr.slice(0, availableSlots);

    if (filesArr.length > availableSlots) {
      alert(`최대 3장까지 가능합니다. ${availableSlots}장만 추가됩니다.`);
    }

    selectedFiles.forEach(addImage);

    e.target.value = "";
  };

  // 삭제 시 revoke
  const handleDelete = (index) => {
    const targetUrl = images[index];

    if (targetUrl) {
      URL.revokeObjectURL(targetUrl);
    }

    const nextImages = images.filter((_, i) => i !== index);
    const nextFiles = files.filter((_, i) => i !== index);

    setImages(nextImages);
    setFiles(nextFiles);
    setValue("files", nextFiles, { shouldValidate: true });
  };

  // 컴포넌트 사라질 때만 전체 revoke
  useEffect(() => {
    return () => {
      imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className={styles.imageZone}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        className={styles.dropZone}
      >
        이미지를 드롭하거나 클릭하세요 (최대 3장)
      </div>

      <input
        type="file"
        multiple
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div className={styles.previewGrid}>
        {images.map((img, i) => (
          <div key={i} className={styles.imageWrap}>
            <img src={img} alt={`preview-${i}`} className={styles.image} />

            <button
              type="button"
              onClick={() => handleDelete(i)}
              className={styles.deleteBtn}
            >
              X
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedScheduleWrite;
