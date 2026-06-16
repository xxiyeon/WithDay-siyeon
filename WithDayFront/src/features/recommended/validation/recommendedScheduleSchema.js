// 추천 일정 생성할 때 데이터 검증

import * as yup from "yup";

export const recommendedScheduleSchema = yup.object({
  recommendedSchedule: yup.object({
    title: yup
      .string()
      .required("추천 일정 제목을 입력해주세요.")
      .max(50, "추천 일정 제목은 50자 이하로 입력해주세요."),

    description: yup
      .string()
      .required("추천 일정 설명을 입력해주세요.")
      .max(1000, "추천 일정 설명은 1000자 이하로 입력해주세요."),

    category: yup.string().required("카테고리를 선택해주세요."),

    region: yup.string().required("지역을 선택해주세요."),

    detailRegion: yup.string().required("상세 지역을 선택해주세요."),

    durationDays: yup
      .number()
      .typeError("추천 기간은 숫자로 입력해주세요.")
      .min(1, "추천 기간은 최소 1일 이상이어야 합니다.")
      .max(30, "추천 기간은 30일 이하로 입력해주세요.")
      .required("추천 기간을 입력해주세요."),

    minParticipants: yup
      .number()
      .typeError("최소 인원은 숫자로 입력해주세요.")
      .min(2, "최소 인원은 2명 이상이어야 합니다.")
      .max(100, "최소 인원은 100명 이하여야 합니다.")
      .required("최소 인원을 입력해주세요."),

    maxParticipants: yup
      .number()
      .typeError("최대 인원은 숫자로 입력해주세요.")
      .min(2, "최대 인원은 2명 이상이어야 합니다.")
      .max(100, "최대 인원은 100명 이하여야 합니다.")
      .test(
        "max-greater-than-min",
        "최대 인원은 최소 인원보다 커야 합니다.",
        function (value) {
          return value >= this.parent.minParticipants;
        },
      )
      .required("최대 인원을 입력해주세요."),

    ageMin: yup
      .number()
      .typeError("최소 나이는 숫자로 입력해주세요.")
      .min(18, "최소 나이는 18세 이상이어야 합니다.")
      .max(100, "최소 나이는 100세 이하여야 합니다.")
      .required("최소 나이를 입력해주세요."),

    ageMax: yup
      .number()
      .typeError("최대 나이는 숫자로 입력해주세요.")
      .min(18, "최대 나이는 18세 이상이어야 합니다.")
      .max(100, "최대 나이는 100세 이하여야 합니다.")
      .test(
        "age-max-check",
        "최대 나이는 최소 나이보다 커야 합니다.",
        function (value) {
          return value >= this.parent.ageMin;
        },
      )
      .required("최대 나이를 입력해주세요."),

    genderLimit: yup
      .string()
      .oneOf(["all", "male", "female"], "성별 제한 값을 올바르게 선택해주세요.")
      .required("성별 제한을 선택해주세요."),

    totalPrice: yup
      .number()
      .typeError("숫자를 입력해주세요.")
      .min(0, "금액은 0 이상이어야 합니다.")
      .max(10000000, "금액은 10,000,000 이하이어야 합니다.")
      .nullable(),

    costType: yup
      .string()
      .oneOf(
        ["per_person", "host_covered", "free", "custom"],
        "정산 방식을 올바르게 선택해주세요.",
      )
      .required("정산 방식을 선택해주세요."),
  }),

  files: yup
    .array()
    .of(yup.mixed())
    .max(3, "이미지는 최대 3개까지 업로드 가능합니다."),

  detailSchedule: yup
    .array()
    .of(
      yup.object({
        dayNumber: yup
          .number()
          .typeError("일차 값이 올바르지 않습니다.")
          .required("일차는 필수입니다."),

        sortOrder: yup
          .number()
          .typeError("상세 일정 순서 값이 올바르지 않습니다.")
          .nullable(),

        title: yup
          .string()
          .required("세부 일정 제목을 입력해주세요.")
          .max(50, "세부 일정 제목은 50자 이하로 입력해주세요."),

        description: yup
          .string()
          .required("세부 일정 설명을 입력해주세요.")
          .max(500, "세부 일정 설명은 500자 이하로 입력해주세요."),
      }),
    )
    .min(1, "최소 하나 이상의 상세 일정이 필요합니다."),
});
