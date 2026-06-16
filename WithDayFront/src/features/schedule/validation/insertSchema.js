// 일정 등록할 때 데이터 검증

import * as yup from "yup";

// 날짜 비교용 helper
const isAfter = (start, end) => {
  if (!start || !end) return true;
  return new Date(end) >= new Date(start);
};

export const insertSchema = yup.object({
  post: yup.object({
    email: yup
      .string()
      .email("올바른 이메일 형식이 아닙니다.")
      .required("로그인이 필요합니다."),

    title: yup
      .string()
      .required("제목을 입력해주세요.")
      .max(50, "제목은 50자 이하로 입력해주세요."),

    description: yup
      .string()
      .required("설명을 입력해주세요.")
      .max(1000, "설명은 1000자 이하로 입력해주세요."),

    category: yup.string().required("카테고리를 선택해주세요."),

    region: yup.string().required("지역을 선택해주세요."),

    detailRegion: yup.string().required("상세 지역을 입력해주세요."),

    chatLink: yup
      .string()
      .transform((value) => {
        if (!value) return null;
        return value.trim();
      })
      .url("올바른 URL 형식이 아닙니다.")
      .nullable()
      .notRequired(),

    startDate: yup.date().required("시작일을 선택해주세요."),

    endDate: yup
      .date()
      .required("종료일을 선택해주세요.")
      .test(
        "is-after-start",
        "종료일은 시작일 이후여야 합니다.",
        function (value) {
          return isAfter(this.parent.startDate, value);
        },
      ),

    recruitStartDate: yup.date().required("모집 시작일을 선택해주세요."),

    recruitEndDate: yup
      .date()
      .required("모집 종료일을 선택해주세요.")
      .test(
        "is-after-recruit-start",
        "모집 종료일은 모집 시작일 이후여야 합니다.",
        function (value) {
          return isAfter(this.parent.recruitStartDate, value);
        },
      ),

    minParticipants: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .min(2, "최소 인원은 2명 이상이어야 합니다.")
      .max(100, "최소 인원은 100명 이하여야 합니다.")
      .required("최소 인원을 입력해주세요."),

    maxParticipants: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .min(2, "최대 인원은 2명 이상이어야 합니다.")
      .max(100, "최대 인원은 100명 이하여야 합니다.")
      .test(
        "max-gte-min",
        "최대 인원은 최소 인원보다 작을 수 없습니다.",
        function (value) {
          const min = this.parent.minParticipants;
          if (!value || !min) return true;
          return value >= min;
        },
      )
      .required("최대 인원을 입력해주세요."),

    ageMin: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .min(18, "최소 나이는 18세 이상이어야 합니다.")
      .max(100, "최소 나이는 100세 이하여야 합니다.")
      .required(),

    ageMax: yup
      .number()
      .transform((v, o) => (o === "" ? null : v))
      .nullable()
      .min(18, "최대 나이는 18세 이상이어야 합니다.")
      .max(100, "최대 나이는 100세 이하여야 합니다.")
      .test(
        "age-max-check",
        "최대 나이는 최소 나이보다 커야 합니다.",
        function (value) {
          const min = this.parent.ageMin;
          if (!value || !min) return true;
          return value >= min;
        },
      )
      .required(),

    genderLimit: yup
      .string()
      .oneOf(["all", "male", "female"], "성별 제한 값을 올바르게 선택해주세요.")
      .required("성별 제한을 선택해주세요."),

    totalPrice: yup
      .number()
      .nullable()
      .required("총액을 입력해주세요.")
      .typeError("숫자를 입력해주세요.")
      .min(0, "금액은 0 이상이어야 합니다.")
      .max(10000000, "금액은 10,000,000 이하이어야 합니다."),

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

        title: yup
          .string()
          .trim()
          .required("세부 일정 제목을 입력해주세요.")
          .max(50, "세부 일정 제목은 50자 이하로 입력해주세요."),

        description: yup
          .string()
          .trim()
          .required("세부 일정 설명을 입력해주세요.")
          .max(500, "세부 일정 설명은 500자 이하로 입력해주세요."),
      }),
    )
    .min(1, "최소 하루 이상의 일정이 필요합니다."),
});
