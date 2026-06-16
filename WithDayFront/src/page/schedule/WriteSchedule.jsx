import { Input, TextArea } from "../../shared/ui/Form/Form";
import styles from "./WriteSchedule.module.css";
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { ko } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import Button from "../../shared/ui/Button/Button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getDetailRegion, getRegion } from "../../features/region/api";
import { insertSchedule } from "../../features/schedule/api";
import CloseIcon from "@mui/icons-material/Close";
import IconButton from "@mui/material/IconButton";
import { insertSchema } from "../../features/schedule/validation/insertSchema";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useAuthStore } from "../../features/auth/store/authStore";
import CommonSelect from "../../shared/ui/Select/CommonSelect";

registerLocale("ko", ko);

const WriteSchedule = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 추천 일정 상세 페이지에서 "추천 일정 사용하기"를 눌렀을 때 넘어오는 데이터
  const recommendedPayload = location.state?.recommendedSchedule;
  const recommendedTemplate = recommendedPayload?.recommendedSchedule;

  // 추천 일정 기본 정보는 최초 1회만 주입하기 위한 방어용 ref
  const recommendedInitializedRef = useRef(false);

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
    resolver: yupResolver(insertSchema),
    defaultValues: {
      post: {
        email: "",
        title: "",
        description: "",
        category: "",
        region: "",
        detailRegion: "",
        chatLink: "",
        startDate: new Date(),
        endDate: new Date(),
        recruitStartDate: new Date(),
        recruitEndDate: new Date(),
        minParticipants: null,
        maxParticipants: null,
        ageMin: null,
        ageMax: null,
        genderLimit: "all",
        totalPrice: null,
        costType: "per_person",
        thumbnail: "",
      },
      detailSchedule: [],
    },
  });

  const email = useAuthStore((state) => state.user.email);

  // 추천 일정 상세에서 넘어온 데이터를 기존 글쓰기 폼 초기값으로 채움
  // 기존 글쓰기 로직을 건드리지 않기 위해 최초 1회만 setValue로 주입함.
  useEffect(() => {
    if (recommendedInitializedRef.current) return;
    if (!recommendedTemplate) return;

    recommendedInitializedRef.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const durationDays = Number(recommendedTemplate.durationDays ?? 1);

    const safeDurationDays =
      Number.isFinite(durationDays) && durationDays > 0 ? durationDays : 1;
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + safeDurationDays - 1);

    setValue("post.title", recommendedTemplate.title ?? "");
    setValue("post.description", recommendedTemplate.description ?? "");
    setValue("post.category", recommendedTemplate.category ?? "");
    setValue("post.region", recommendedTemplate.region ?? "");
    setValue("post.detailRegion", recommendedTemplate.detailRegion ?? "");

    setValue(
      "post.minParticipants",
      recommendedTemplate.minParticipants ?? null,
    );
    setValue(
      "post.maxParticipants",
      recommendedTemplate.maxParticipants ?? null,
    );
    setValue("post.ageMin", recommendedTemplate.ageMin ?? null);
    setValue("post.ageMax", recommendedTemplate.ageMax ?? null);
    setValue("post.genderLimit", recommendedTemplate.genderLimit ?? "all");
    setValue("post.totalPrice", recommendedTemplate.totalPrice ?? null);
    setValue("post.costType", recommendedTemplate.costType ?? "per_person");

    // 추천 일정은 실제 날짜가 없으므로 오늘부터 추천 기간만큼 기본 날짜를 잡아줌.
    // 사용자가 글쓰기 화면에서 직접 수정 가능함.
    setValue("post.startDate", today);
    setValue("post.endDate", endDate);
    setValue("post.recruitStartDate", today);
    setValue("post.recruitEndDate", today);

    // 오픈채팅 링크는 추천 일정에 없는 실제 모집글 전용 값이므로 비워둠.
    setValue("post.chatLink", "");
  }, [recommendedTemplate, setValue]);

  useEffect(() => {
    if (!email) return;

    setValue("post.email", email);
  }, [email, setValue]);

  const { fields, replace } = useFieldArray({
    control,
    name: "detailSchedule",
  });

  const region = watch("post.region");
  const genderLimit = watch("post.genderLimit");
  const recruitEndDate = watch("post.recruitEndDate");
  const startDate = watch("post.startDate");
  const costType = watch("post.costType");
  const totalPrice = watch("post.totalPrice");

  const flattenErrors = (obj) => {
    if (!obj) return [];

    if (obj.message) {
      return [obj.message];
    }

    if (Array.isArray(obj)) {
      return obj.flatMap(flattenErrors);
    }

    if (typeof obj === "object") {
      return Object.values(obj).flatMap(flattenErrors);
    }

    return [];
  };

  const errorList = flattenErrors(errors);

  const handleError = (err) => {
    setOpenSnackbar(false);

    setTimeout(() => {
      setOpenSnackbar(true);
    }, 0);
  };

  const errorMessage = errorList.join("\n");

  // 시/도 조회
  const { data: regions = [] } = useQuery({
    queryKey: ["region"],
    queryFn: getRegion,
  });

  // 군/구 조회(RHF)
  const { data: detailRegions = [] } = useQuery({
    queryKey: ["detailRegion", region],
    queryFn: () => getDetailRegion(region),
    enabled: !!region,
  });

  // 추천 일정에서 넘어온 지역 값은 select option이 로딩된 뒤 한 번 더 세팅
  // option이 생기기 전에 값을 먼저 넣으면 화면에 선택값이 안 보일 수 있어서 보정함.
  useEffect(() => {
    if (!recommendedTemplate) return;

    if (
      recommendedTemplate.region &&
      Array.isArray(regions) &&
      regions.some((item) => item.regionName === recommendedTemplate.region)
    ) {
      setValue("post.region", recommendedTemplate.region, {
        shouldValidate: true,
      });
    }

    if (
      recommendedTemplate.detailRegion &&
      Array.isArray(detailRegions) &&
      detailRegions.some(
        (item) => item.detailName === recommendedTemplate.detailRegion,
      )
    ) {
      setValue("post.detailRegion", recommendedTemplate.detailRegion, {
        shouldValidate: true,
      });
    }
  }, [regions, detailRegions, recommendedTemplate, setValue]);

  // 시작일보다 모집 마감일이 더 뒤일 때 시작일과 모집 마감일을 동일하게 설정
  useEffect(() => {
    if (!startDate || !recruitEndDate) return;

    const start = new Date(startDate);
    const end = new Date(recruitEndDate);

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end > start) {
      setValue("post.recruitEndDate", startDate);
    }
  }, [startDate, recruitEndDate, setValue]);

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    return Number(value).toLocaleString();
  };

  // 사진 업로드 시 시간 오래 걸릴 때 등록/수정 버튼 막음
  const { mutateAsync: submitSchedule, isPending } = useMutation({
    mutationFn: ({ postData, filesData, detailScheduleData }) => {
      return insertSchedule(postData, filesData, detailScheduleData);
    },
    onSuccess: (res) => {
      navigate("/");
    },
    onError: (err) => {},
  });

  const onSubmit = async (formValues) => {
    // 등록 2차 방어
    if (isPending) return;

    await submitSchedule({
      postData: formValues.post,
      filesData: files,
      detailScheduleData: formValues.detailSchedule,
    });
  };

  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleCostTypeChange = (type) => {
    setValue("post.costType", type, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (type === "free") {
      setValue("post.totalPrice", 0, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } else {
      setValue("post.totalPrice", null, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

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
          <form onSubmit={handleSubmit(onSubmit, handleError)}>
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
                      {...register("post.title")}
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
                      {...register("post.description")}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.category}`}>
                  <li>
                    <label htmlFor="category">일정 종류</label>
                  </li>
                  <li>
                    <Controller
                      name="post.category"
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

                <ul className={`${styles.inputWrap} ${styles.link}`}>
                  <li>
                    <label htmlFor="link">오픈 채팅 링크</label>
                  </li>
                  <li>
                    <Input
                      type="text"
                      placeholder="오픈 채팅 링크"
                      {...register("post.chatLink")}
                    />
                  </li>
                </ul>

                <ul className={`${styles.inputWrap} ${styles.region}`}>
                  <li>
                    <label htmlFor="region">지역(시/도)</label>
                  </li>
                  <li>
                    <Controller
                      name="post.region"
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
                      name="post.detailRegion"
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
                      name="post.minParticipants"
                      control={control}
                      render={({ field }) => {
                        const error = errors?.post?.minParticipants;

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
                                const max = getValues("post.maxParticipants");

                                if (!min) return;

                                if (min < 2 || min > 100) {
                                  setError("post.minParticipants", {
                                    message:
                                      "최소 인원은 2~100 사이여야 합니다",
                                  });
                                  return;
                                }

                                if (max && min > max) {
                                  setError("post.minParticipants", {
                                    message:
                                      "최소 인원은 최대 인원보다 클 수 없습니다",
                                  });
                                  return;
                                }

                                clearErrors("post.minParticipants");
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
                      name="post.maxParticipants"
                      control={control}
                      render={({ field }) => {
                        const error = errors?.post?.maxParticipants;

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
                                const min = getValues("post.minParticipants");

                                if (!max) return;

                                if (max < 2 || max > 100) {
                                  setError("post.maxParticipants", {
                                    message:
                                      "최대 인원은 2~100 사이여야 합니다",
                                  });
                                  return;
                                }

                                if (min && max < min) {
                                  setError("post.maxParticipants", {
                                    message:
                                      "최대 인원은 최소 인원보다 작을 수 없습니다",
                                  });
                                  return;
                                }

                                clearErrors("post.maxParticipants");
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
                      name="post.ageMin"
                      control={control}
                      render={({ field }) => {
                        const error = errors?.post?.ageMin;
                        const max = getValues("post.ageMax");

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
                                  setError("post.ageMin", {
                                    message:
                                      "최소 연령은 18~100 사이여야 합니다",
                                  });
                                  return;
                                }

                                if (max && min > max) {
                                  setError("post.ageMin", {
                                    message:
                                      "최소 연령은 최대 연령보다 클 수 없습니다",
                                  });
                                  return;
                                }

                                clearErrors("post.ageMin");
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
                      name="post.ageMax"
                      control={control}
                      render={({ field }) => {
                        const error = errors?.post?.ageMax;
                        const min = getValues("post.ageMin");

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
                                  setError("post.ageMax", {
                                    message:
                                      "최대 연령은 18~100 사이여야 합니다",
                                  });
                                  return;
                                }

                                if (min && max < min) {
                                  setError("post.ageMax", {
                                    message:
                                      "최대 연령은 최소 연령보다 작을 수 없습니다",
                                  });
                                  return;
                                }

                                clearErrors("post.ageMax");
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
                        setValue("post.genderLimit", "all", {
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
                        setValue("post.genderLimit", "male", {
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
                        setValue("post.genderLimit", "female", {
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
              <h2 className={styles.inputTitle}>일정 및 모집 기간</h2>
              <div>
                <CalendarRange
                  startDate={watch("post.startDate")}
                  endDate={watch("post.endDate")}
                  setValue={setValue}
                />

                <ul
                  className={`${styles.inputWrap} ${styles.recruitmentPeriod}`}
                >
                  <li>
                    <label>모집 마감일</label>
                  </li>
                  <li>
                    <DatePicker
                      locale="ko"
                      selected={recruitEndDate}
                      onChange={(date) =>
                        setValue("post.recruitEndDate", date, {
                          shouldValidate: true,
                        })
                      }
                      minDate={new Date()}
                      maxDate={startDate}
                      customInput={
                        <button type="button" className={styles.dateButton}>
                          📅{" "}
                          {recruitEndDate?.toLocaleDateString() || "날짜 선택"}
                        </button>
                      }
                    />
                  </li>
                </ul>
              </div>
            </div>
            <div className={styles.inputContentWrap}>
              <h2 className={styles.inputTitle}>상세 일정</h2>
              <ScheduleTable
                startDate={watch("post.startDate")}
                endDate={watch("post.endDate")}
                fields={fields}
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
                    <Controller
                      name="post.totalPrice"
                      control={control}
                      render={({ field }) => (
                        <input
                          type="text"
                          className={styles.costInput}
                          value={formatNumber(field.value ?? "")}
                          disabled={costType === "free"}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^0-9]/g, "");

                            value = value.slice(0, 8);

                            if (Number(value) > 10000000) {
                              value = "10000000";
                            }

                            field.onChange(value === "" ? null : Number(value));
                          }}
                        />
                      )}
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
                setFiles={setFiles}
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
        style={{
          top: "90px",
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

const CalendarRange = ({ startDate, endDate, setValue }) => {
  const [state, setState] = useState([
    {
      startDate: startDate || new Date(),
      endDate: endDate || new Date(),
      key: "selection",
    },
  ]);

  const handleChange = (item) => {
    const selection = item.selection;

    setState([selection]);

    // RHF로 값 업데이트
    setValue("post.startDate", selection.startDate);
    setValue("post.endDate", selection.endDate);
  };

  return (
    <div className={styles.calendarWrapper}>
      <DateRange
        locale={ko}
        ranges={state}
        onChange={handleChange}
        moveRangeOnFirstSelection={false}
        editableDateInputs={true}
        showMonthAndYearPickers={true}
        months={1}
        direction="horizontal"
        minDate={new Date()}
      />
      <div className={styles.dateWrap}>
        <ul className={`${styles.inputWrap} ${styles.duringDate}`}>
          <li>
            <label>일정</label>
          </li>
          <li>
            <p>시작일: {startDate?.toLocaleDateString()}</p>
            <p>종료일: {endDate?.toLocaleDateString()}</p>
          </li>
        </ul>
      </div>
    </div>
  );
};

const ScheduleTable = ({
  startDate,
  endDate,
  fields,
  replace,
  setValue,
  watch,
}) => {
  useEffect(() => {
    if (!startDate || !endDate) return;

    const diff = new Date(endDate) - new Date(startDate);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

    const arr = Array.from({ length: days }, (_, i) => ({
      dayNumber: i + 1,
      title: "",
      description: "",
    }));

    replace(arr);
  }, [startDate, endDate, replace]);

  const handleChange = (index, key, value) => {
    setValue(`detailSchedule.${index}.${key}`, value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <div className={styles.scheduleTimeline}>
      {fields.map((row, i) => (
        <div key={row.id} className={styles.scheduleCard}>
          {/* 왼쪽 일차 */}
          <div className={styles.dayBadge}>
            <span>{row.dayNumber}</span>
            <p>일차</p>
          </div>

          {/* 오른쪽 */}
          <div className={styles.scheduleContent}>
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
  );
};

const AddThumbnail = ({ images, setImages, setFiles }) => {
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

    setImages((prev) => [...prev, url]); // 미리보기용
    setFiles((prev) => [...prev, file]); // 업로드용
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
  };

  // 삭제 시 revoke
  const handleDelete = (index) => {
    const targetUrl = images[index];

    if (targetUrl) {
      URL.revokeObjectURL(targetUrl);
    }

    setImages((prev) => prev.filter((_, i) => i !== index));
    setFiles((prev) => prev.filter((_, i) => i !== index));
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

export default WriteSchedule;
