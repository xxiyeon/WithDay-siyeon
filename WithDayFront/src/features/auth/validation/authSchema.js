import * as yup from "yup";

// 가입할때 최소 나이 설정
const MIN_AGE = 18;

// 비밀번호 정규식: 최소 8자 이상, 영문 대소문자, 숫자, 특수문자 중 3가지 이상 조합
const PASSWORD_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]).{8,}$/;

// 비밀번호 입력 형식 안내 메시지
const PASSWORD_MESSAGE = "영문, 숫자, 특수문자를 포함한 8자 이상 입력해주세요.";

// 회원가입용 검사 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
export const signupSchema = yup.object().shape({
  // .string(): 문자열 타입이어야 함.
  // .required(): 값이 비어있으면 안됨. (필수값)
  // .email('~~'): 문자열 안에 '@'와 '.'이 규칙에 맞게 들어있는지 자동으로 정규식 검사를 해줌(yup이 제공하는 편리한 메서드), '~~'는 검사 실패 시 보여줄 에러 메시지
  email: yup
    .string()
    .required("이메일은 필수 입력입니다.")
    .email("올바른 이메일 형식이 아닙니다."),

  // .min(a, '~~'): 최소 a자리 이상이어야 함. (yup이 제공하는 편리한 메서드), '~~'는 검사 실패 시 보여줄 에러 메시지
  password: yup
    .string()
    .required("비밀번호는 필수 입력입니다.")
    .matches(PASSWORD_REGEX, PASSWORD_MESSAGE),

  // yup.ref('password'): 바로 위에 있는 password 필드의 값을 실시간으로 참조(yup이 제공하는 편리한 메서드), 즉 password에 들어간 값.
  // oneOf([A, B], '~~'): 입력한 값이 A or B 중 하나와 같아야 함. '~~'는 검사 실패 시 보여줄 에러 메시지
  // null은 빈칸일 때 엉뚱한 에러("일치하지 않습니다")가 먼저 뜨는 걸 막아주기 위해, null 덕분에 빈칸으로 넘어가면 뒤에 있는 required의 "입력해주세요" 에러가 먼저 나옴.
  passwordConfirm: yup
    .string()
    .oneOf([yup.ref("password"), null], "비밀번호가 일치하지 않습니다.")
    .required("비밀번호 확인을 입력해주세요."),

  nickname: yup
    .string()
    .required("닉네임을 입력해주세요.")
    .min(2, "닉네임은 최소 2자 이상이어야 합니다.")
    .max(20, "닉네임은 최대 20자까지 입력할 수 있습니다."),

  // 기본 제공 함수가 없을 때는 .test() 함수를 써서 직접 검사 규칙을 만듬.
  // 형태: .test('규칙이름', '실패시 에러메시지', (현재입력값) => { 검사로직(참/거짓 반환) })
  birthday: yup
    .string()
    .required("생년월일을 선택해주세요.")

    // 검사 규칙 1: 미래 날짜 선택 방지
    .test("is-past", "미래의 날짜는 선택할 수 없습니다.", (value) => {
      // 위에 required가 있긴 하지만 yup 라이브러리는 가끔 값이 없을 때(undefined/null)에도 test 함수를 실행함.
      // 때문에 값이 아예 없는 경우를 먼저 걸러주는 로직을 추가(null일때 함수 실행되면 undefined <= "2026-05-17"과 같이 기괴한 비교를 하려하다가 에러남)
      if (!value) {
        return false; // 값이 아예 없으면 에러(false) 반환
      }

      // 달력에서 미래 날짜를 선택하지 못하게 하기 위해 현재 날짜를 "YYYY-MM-DD" 형태로 뽑아냄. (HTML의 달력(date)은 반드시 "YYYY-MM-DD" 모양을 사용)
      // 순서(값은 예시) -> new Date(): Wed May 13 2026 17:35:00 GMT+0900 (한국 표준시), .toISOString(): "2026-05-13T08:35:00.000Z", .split("T"): ["2026-05-13", "08:35:00.000Z"], [0]: "2026-05-13"
      const today = new Date().toISOString().split("T")[0];

      // 문자열끼리 비교 (예: "2026-05-13" <= "2026-05-17" -> true, "2026-05-18" <= "2026-05-17" -> false)
      // 입력값이 오늘이거나 과거여야만 통과(true)
      return value <= today;
    })

    // 검사 규칙 2: 만 나이 계산법 적용
    .test(
      "is-old-enough",
      `만 ${MIN_AGE}세 이상만 가입 가능합니다.`,
      (value) => {
        // 위에 required가 있긴 하지만 yup 라이브러리는 가끔 값이 없을 때(undefined/null)에도 test 함수를 실행함.
        // 때문에 값이 아예 없는 경우를 먼저 걸러주는 로직을 추가(null일때 함수 실행되면 undefined <= "2026-05-17"과 같이 기괴한 비교를 하려하다가 에러남)
        if (!value) {
          return false; // 값이 아예 없으면 에러(false) 반환
        }

        const today = new Date(); // 현재 날짜를 Date 객체로 생성 (시간까지 포함된 형태, "2026-05-17")
        const birthDate = new Date(value); // 유저가 선택한 "YYYY-MM-DD"를 Date 객체로 변환 (예: "2003-04-28" -> Mon Apr 28 2003 00:00:00 GMT+0900 (한국 표준시))

        let age = today.getFullYear() - birthDate.getFullYear(); // 올해 연도 - 태어난 연도 = 단순 나이 (예: 2026 - 2003 = 23, .getFullYear()는 Date 객체에서 연도만 뽑아내는 메서드)

        const monthDifference = today.getMonth() - birthDate.getMonth(); // 올해 월 - 태어난 월 (예: 4 - 3 = 1, .getMonth()는 Date 객체에서 월을 뽑아내는 메서드로 0부터 시작하기 때문에 1월=0, 2월=1, ..., 12월=11)

        // 생일 달이 아직 안 왔거나(monthDifference < 0 즉 음수), 달은 같은데 날짜가 아직 안 지났다면 생일이 안 지남
        // today.getDate()는 현재 날짜에서 일만 뽑아내는 메서드, birthDate.getDate()는 태어난 날짜에서 일만 뽑아내는 메서드
        if (
          monthDifference < 0 ||
          (monthDifference === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--; // 생일이 아직 안 지났으므로 나이에서 1을 빼줌
        }

        // 계산된 만 나이가 기준(MIN_AGE, 예: 18)보다 크거나 같아야만 true 반환
        return age >= MIN_AGE;
      },
    ),

  gender: yup.string().required("성별을 선택해주세요."),

  // matches(정규식, '~~'): 입력한 값이 정규식 패턴과 일치해야 함. '~~'는 검사 실패 시 보여줄 에러 메시지. (yup이 제공하는 편리한 메서드)
  phone: yup
    .string()
    .required("전화번호를 입력해주세요.")
    .matches(
      /^010-\d{4}-\d{4}$/,
      "전화번호는 010-1234-5678 형식으로 입력해주세요.",
    ),

  postcode: yup.string().required("우편번호를 검색해주세요."),

  address: yup.string().required("주소를 입력해주세요."),

  detailAddress: yup.string().required("상세 주소를 입력해주세요."),

  // 체크박스(boolean)는 true(체크됨) 아니면 false(체크안됨) 값만 가짐.
  // .string()이 아니라 .boolean()으로 검사 규칙을 만들어야 체크 여부를 검사 가능
  agreeTos: yup
    .boolean()
    // 필수로 동의해야 하므로, 값이 무조건 true이어야 규칙 통과.
    .oneOf([true], "[필수] 이용약관 동의는 필수입니다.")
    .required(),

  // 개인정보 수집 및 이용 동의도 필수이므로, 값이 무조건 true이어야 규칙 통과.
  agreePrivacy: yup
    .boolean()
    .oneOf([true], "[필수] 개인정보 수집 및 이용 동의는 필수입니다.")
    .required(),

  // 선택 항목(마케팅 동의)은 필수(required)가 아니므로, 체크를 안 했을 때의 기본값(default)만 false로 설정(체크 안 하면 false, 체크하면 true)
  agreeMarketing: yup.boolean().default(false),

  // 선택 항목(알림 동의)은 필수(required)가 아니므로, 체크를 안 했을 때의 기본값(default)만 false로 설정(체크 안 하면 false, 체크하면 true)
  agreeNotification: yup.boolean().default(false),
});

// 로그인용 검사 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .required("이메일을 입력해주세요.")
    .email("올바른 이메일 형식이 아닙니다."),

  password: yup.string().required("비밀번호를 입력해주세요."),
});

// 소셜 로그인 추가 정보용 검사 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
// signupSchema를 재사용하지 않고 따로 만든 이유: 소셜 가입 화면에는 email, password 입력창이 없는데, signupSchema를 쓰면
// 화면에 없는 필드들을 .required()로 찾으려 하므로 폼 제출이 막히는 버그가 발생함.
export const socialExtraSchema = yup.object().shape({
  nickname: yup
    .string()
    .required("닉네임을 입력해주세요.")
    .min(2, "닉네임은 최소 2자 이상이어야 합니다.")
    .max(20, "닉네임은 최대 20자까지 입력할 수 있습니다."),

  // 기본 제공 함수가 없을 때는 .test() 함수를 써서 직접 검사 규칙을 만듬.
  // 형태: .test('규칙이름', '실패시 에러메시지', (현재입력값) => { 검사로직(참/거짓 반환) })
  birthday: yup
    .string()
    .required("생년월일을 선택해주세요.")

    // 검사 규칙 1: 미래 날짜 선택 방지
    .test("is-past", "미래의 날짜는 선택할 수 없습니다.", (value) => {
      // 위에 required가 있긴 하지만 yup 라이브러리는 가끔 값이 없을 때(undefined/null)에도 test 함수를 실행함.
      // 때문에 값이 아예 없는 경우를 먼저 걸러주는 로직을 추가(null일때 함수 실행되면 undefined <= "2026-05-17"과 같이 기괴한 비교를 하려하다가 에러남)
      if (!value) {
        return false;
      }

      // 달력에서 미래 날짜를 선택하지 못하게 하기 위해 현재 날짜를 "YYYY-MM-DD" 형태로 뽑아냄. (HTML의 달력(date)은 반드시 "YYYY-MM-DD" 모양을 사용)
      // 순서(값은 예시) -> new Date(): Wed May 13 2026 17:35:00 GMT+0900 (한국 표준시), .toISOString(): "2026-05-13T08:35:00.000Z", .split("T"): ["2026-05-13", "08:35:00.000Z"], [0]: "2026-05-13"
      const today = new Date().toISOString().split("T")[0];

      // 문자열끼리 비교 (예: "2026-05-13" <= "2026-05-17" -> true, "2026-05-18" <= "2026-05-17" -> false)
      // 입력값이 오늘이거나 과거여야만 통과(true)
      return value <= today;
    })
    // 검사 규칙 2: 만 나이 계산법 적용
    .test(
      "is-old-enough",
      `만 ${MIN_AGE}세 이상만 가입 가능합니다.`,
      (value) => {
        // 위에 required가 있긴 하지만 yup 라이브러리는 가끔 값이 없을 때(undefined/null)에도 test 함수를 실행함.
        // 때문에 값이 아예 없는 경우를 먼저 걸러주는 로직을 추가(null일때 함수 실행되면 undefined <= "2026-05-17"과 같이 기괴한 비교를 하려하다가 에러남)
        if (!value) {
          return false; // 값이 아예 없으면 에러(false) 반환
        }

        const today = new Date(); // 현재 날짜를 Date 객체로 생성 (시간까지 포함된 형태, "2026-05-17")
        const birthDate = new Date(value); // 유저가 선택한 "YYYY-MM-DD"를 Date 객체로 변환 (예: "2003-04-28" -> Mon Apr 28 2003 00:00:00 GMT+0900 (한국 표준시))

        let age = today.getFullYear() - birthDate.getFullYear(); // 올해 연도 - 태어난 연도 = 단순 나이 (예: 2026 - 2003 = 23, .getFullYear()는 Date 객체에서 연도만 뽑아내는 메서드)

        const monthDifference = today.getMonth() - birthDate.getMonth(); // 올해 월 - 태어난 월 (예: 4 - 3 = 1, .getMonth()는 Date 객체에서 월을 뽑아내는 메서드로 0부터 시작하기 때문에 1월=0, 2월=1, ..., 12월=11)

        // 생일 달이 아직 안 왔거나(monthDifference < 0 즉 음수), 달은 같은데 날짜가 아직 안 지났다면 생일이 안 지남
        // today.getDate()는 현재 날짜에서 일만 뽑아내는 메서드, birthDate.getDate()는 태어난 날짜에서 일만 뽑아내는 메서드
        if (
          monthDifference < 0 ||
          (monthDifference === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }

        // 계산된 만 나이가 기준(MIN_AGE, 예: 18)보다 크거나 같아야만 true 반환
        return age >= MIN_AGE;
      },
    ),

  gender: yup.string().required("성별을 선택해주세요."),

  // matches(정규식, '~~'): 입력한 값이 정규식 패턴과 일치해야 함. '~~'는 검사 실패 시 보여줄 에러 메시지. (yup이 제공하는 편리한 메서드)
  phone: yup
    .string()
    .required("전화번호를 입력해주세요.")
    .matches(
      /^010-\d{4}-\d{4}$/,
      "전화번호는 010-1234-5678 형식으로 입력해주세요.",
    ),

  postcode: yup.string().required("우편번호를 검색해주세요."),

  address: yup.string().required("주소를 입력해주세요."),

  detailAddress: yup.string().required("상세 주소를 입력해주세요."),

  // 체크박스(boolean)는 true(체크됨) 아니면 false(체크안됨) 값만 가짐.
  // .string()이 아니라 .boolean()으로 검사 규칙을 만들어야 체크 여부를 검사 가능
  agreeTos: yup
    .boolean()
    // 필수로 동의해야 하므로, 값이 무조건 true이어야 규칙 통과.
    .oneOf([true], "[필수] 이용약관 동의는 필수입니다.")
    .required(),

  // 개인정보 수집 및 이용 동의도 필수이므로, 값이 무조건 true이어야 규칙 통과.
  agreePrivacy: yup
    .boolean()
    .oneOf([true], "[필수] 개인정보 수집 및 이용 동의는 필수입니다.")
    .required(),

  // 선택 항목(마케팅 동의)은 필수(required)가 아니므로, 체크를 안 했을 때의 기본값(default)만 false로 설정(체크 안 하면 false, 체크하면 true)
  agreeMarketing: yup.boolean().default(false),

  // 선택 항목(알림 동의)은 필수(required)가 아니므로, 체크를 안 했을 때의 기본값(default)만 false로 설정(체크 안 하면 false, 체크하면 true)
  agreeNotification: yup.boolean().default(false),
});

// 아이디 찾기용 검사 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
export const findIdSchema = yup.object().shape({
  nickname: yup
    .string()
    .required("닉네임을 입력해주세요.")
    .min(2, "닉네임은 최소 2자 이상이어야 합니다.")
    .max(20, "닉네임은 최대 20자까지 입력할 수 있습니다."),

  // matches(정규식, '~~'): 입력한 값이 정규식 패턴과 일치해야 함. '~~'는 검사 실패 시 보여줄 에러 메시지. (yup이 제공하는 편리한 메서드)
  phone: yup
    .string()
    .required("전화번호를 입력해주세요.")
    .matches(
      /^010-\d{4}-\d{4}$/,
      "전화번호는 010-1234-5678 형식으로 입력해주세요.",
    ),
});

// 비밀번호 찾기 - 이메일 입력 단계 검증 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
export const findPwEmailSchema = yup.object().shape({
  email: yup
    .string()
    .required("이메일을 입력해주세요.")
    .email("올바른 이메일 형식이 아닙니다."),
});

// 비밀번호 찾기 - 인증번호 입력 단계 검증 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
// 회원가입의 이메일 인증번호는 mailAuthInput/mailAuthCode state로 직접 비교했지만,
// 비밀번호 찾기에서는 단계별 폼 검증 흐름을 연습하기 위해 인증번호 입력 형식도 yup schema로 분리함.
// 단, 실제 인증번호가 맞는지 여부는 백엔드 응답값 또는 컴포넌트 state와 비교해서 최종 확인해야 함.
export const findPwCodeSchema = yup.object().shape({
  // matches(정규식, '~~'): 입력한 값이 정규식 패턴과 일치해야 함. '~~'는 검사 실패 시 보여줄 에러 메시지. (yup이 제공하는 편리한 메서드)
  authCode: yup
    .string()
    .required("인증번호를 입력해주세요.")
    .matches(/^[A-Za-z0-9]{6}$/, "인증번호 6자리를 입력해주세요."),
});

// 비밀번호 찾기 - 비밀번호 재설정 단계 검증 규칙 (Schema), yup.object().shape({ ... }) 형태로 객체 안에 각 필드별 검사 규칙을 작성
// -> yup 라이브러리의 공식 문법이고 object()는 객체 타입을 의미, shape() 안에 각 필드별로 검사 규칙을 작성
export const findPwResetSchema = yup.object().shape({
  newPassword: yup
    .string()
    .required("새 비밀번호를 입력해주세요.")
    .matches(PASSWORD_REGEX, PASSWORD_MESSAGE),

  // oneOf([yup.ref('newPassword')], '~~'): 입력한 값이 newPassword 필드의 값과 일치해야 함. '~~'는 검사 실패 시 보여줄 에러 메시지. (yup이 제공하는 편리한 메서드)
  // null은 빈칸일 때 엉뚱한 에러("일치하지 않습니다")가 먼저 뜨는 걸 막아주기 위해, null 덕분에 빈칸으로 넘어가면 뒤에 있는 required의 "입력해주세요" 에러가 먼저 나옴.
  newPasswordConfirm: yup
    .string()
    .oneOf([yup.ref("newPassword"), null], "비밀번호가 일치하지 않습니다.")
    .required("새 비밀번호 확인을 입력해주세요."),
});
