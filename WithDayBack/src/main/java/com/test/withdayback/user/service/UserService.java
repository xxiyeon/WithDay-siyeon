package com.test.withdayback.user.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.test.withdayback.common.util.EmailSender;
import com.test.withdayback.common.util.JwtUtil;
import com.test.withdayback.user.dao.UserDao;
import com.test.withdayback.user.dto.MypageEditRequestDTO;
import com.test.withdayback.user.dto.MypageEditResponseDTO;
import com.test.withdayback.user.dto.MypageResponseDTO;
import com.test.withdayback.user.dto.SignupRequestDTO;
import com.test.withdayback.user.dto.FindAccountDTO;
import com.test.withdayback.user.vo.Interest;
import com.test.withdayback.user.vo.Terms;
import com.test.withdayback.user.vo.User;
import com.test.withdayback.user.vo.UserInterest;
import com.test.withdayback.user.vo.UserTerms;
import com.test.withdayback.schedule.dao.ScheduleDao;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

// @Service: 데이터 가공, 검증 등을 처리하는 클래스라 명시, 스프링 컨테이너에 Bean으로 자동 등록되어 @Autowired로 주입받을 수 있게 함. (Controller에서 주입받음.)
@Service
public class UserService {

    // @Autowired: new로 객체를 만들지 않아도, 스프링이 UserService 객체를 찾아 자동으로 연결해줌.
    @Autowired
    private UserDao userDao;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder; // 비밀번호 암호화용

    @Autowired
    private JwtUtil jwtUtil; // 토큰 발급용

    @Autowired
    private Cloudinary cloudinary; // 이미지 호스팅 서버 (프로필 사진 저장용)

    @Autowired
    private EmailSender emailSender; // 이메일 발송용

    @Autowired
    private ScheduleDao scheduleDao;

    private static final int MIN_AGE = 18; // 최소 가입 연령 제한

    // 회원가입 이메일 인증은 프론트에서 인증번호를 비교했지만,
    // 비밀번호 재설정은 보안상 백엔드가 인증번호와 인증 완료 여부를 직접 검사함. (두가지 다 해보고 싶었던 것)

    // 비밀번호 찾기 인증번호
    // key: 이메일, value: 인증번호
    private final Map<String, String> passwordResetCodeStore = new ConcurrentHashMap<>();

    // 비밀번호 찾기 인증 완료 여부
    // key: 이메일, value: 인증번호 확인 성공 여부
    private final Map<String, Boolean> passwordResetVerifiedStore = new ConcurrentHashMap<>();

    // 회원가입
    // @Transactional: 로직이 에러없이 작동하면 자동으로 DB에 commit시키고 하나라도 에러가 있다면 rollback 시킴
    @Transactional
    public String signup(SignupRequestDTO signupRequest, MultipartFile profileFile) {
        try {
            // 프론트에서 받은 가입 데이터중 유저 정보만 getter로 추출
            User user = signupRequest.getUser();

            // 최소 (만)나이 가입 제한 (프론트에서 막지만 이중 보안), 유저 생일이 null이 아니고 유저 생일이 비어있지 않으면
            if (user.getBirthday() != null && !user.getBirthday().isEmpty()) {
                // 텍스트("yyyy-MM-dd")로 온 생일을 자바가 계산할 수 있는 날짜 객체(LocalDate)로 번역
                LocalDate birthDate = LocalDate.parse(user.getBirthday(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                // 현재 날짜
                LocalDate currentDate = LocalDate.now();
                // Period.between(과거, 현재): 두 날짜 사이에 시간이 얼마나 흘렀는지 계산
                int age = Period.between(birthDate, currentDate).getYears();

                if (age < MIN_AGE) {
                    // catch로 가서 에러메시지 400 Bad Request 반환
                    throw new RuntimeException("만 " + MIN_AGE + "세 이상만 가입할 수 있습니다.");
                }
            }

            user.setProvider("local"); // 로컬 가입자라고 명시
            user.setProviderId(""); // 소셜 로그인유저 고유 ID인데 로컬이니 비어있음.

            // 프로필 사진이 null 아니고 비어있지도 않으면 Cloudinary 서버에 업로드 후, 받아온 이미지 링크(URL)를 DB에 저장
            if (profileFile != null && !profileFile.isEmpty()) {
                // .asMap(키1, 값1, 키2, 값2, 키3, 값3): 홀수 번째는 Key(이름표)로, 짝수 번째는 Value(내용물)로 묶어서 하나의 Map 만듦
                // "folder", "withday/profiles": withday/profiles 라는 폴더를 만들어서 올림. 기존에 있었으면 올림.
                // "use_filename", true: 원본 파일 이름을 최대한 유지
                // "unique_filename", true: 이름 뒤에 무작위 난수를 붙여서 안 겹치게(unique) 만들기
                Map uploadParams = ObjectUtils.asMap(
                        "folder", "withday/profiles",
                        "use_filename", true,
                        "unique_filename", true
                );

                // profileFile.getBytes(): 파일 객체를 타 서버에 잘 보내기 위해 바이트 단위로 변환
                // upload(...): 바이트 단위의 데이터와 uploadParams를 Cloudinary 서버에 보냄, Cloudinary에 사진 저장 성공하면 성공했다고 값을 보내주는데 그걸 Map으로 받음.
                Map uploadResult = cloudinary.uploader().upload(profileFile.getBytes(), uploadParams);

                // Cloudinary가 성공하고 보내준 값중 이미지 링크를 가져옴
                user.setProfileImage((String) uploadResult.get("secure_url"));
            }

            // 이메일 중복 검사
            User existingUser = userDao.findByEmail(user.getEmail());
            // existingUser가 null이 아니라면 (이미 이메일이 있다면)
            if (existingUser != null) {
                // catch로 가서 에러메시지 400 Bad Request 반환
                throw new RuntimeException("이미 해당 이메일로 가입된 계정이 존재합니다.");
            }

            // 비밀번호 암호화
            // 관리자도 유저의 실제 비밀번호를 알 수 없도록 무작위 문자열로 치환하여 DB에 저장
            user.setPassword(passwordEncoder.encode(user.getPassword()));

            // 유저 정보를 DB에 삽입 (MyBatis가 insert를 실행, 이때 다음 약관 저장 로직에서 쓰기 위해 유저의 고유 번호(id)를 채워옴.)
            userDao.insertUser(user);

            // 약관 동의 내역 분리 저장 (정규화 원리)
            // 프론트엔드는 { "TOS": true, "PRIVACY": true...} 같은 JSON 형태로 값을 보냄. 이걸 String(약관 이름)과 Boolean(동의 여부)을 담는 Map으로 저장
            Map<String, Boolean> terms = signupRequest.getTerms();

            // terms가 null이 아니고 유저가 고유번호(PK)를 가졌다면
            if (terms != null && user.getId() != null) {
                // .entrySet()라는 함수를 써서, Map 안에 있는 Key-Value 쌍들을 하나하나의 Entry(항목) 객체로 리스트처럼 나열
                for (Map.Entry<String, Boolean> entry : terms.entrySet()) {

                    UserTerms userTerms = new UserTerms();
                    userTerms.setUserId(((Number) user.getId()).longValue());

                    // 이용약관 4개중 뭔지 찾기
                    Long termsId = 0L;
                    switch (entry.getKey()) {
                        case "TOS":
                            termsId = 1L;
                            break;
                        case "PRIVACY":
                            termsId = 2L;
                            break;
                        case "MARKETING":
                            termsId = 3L;
                            break;
                        case "NOTIFICATION":
                            termsId = 4L;
                            break;
                    }

                    userTerms.setTermsId(termsId);
                    userTerms.setAgreed(entry.getValue()); // 동의 여부(true/false) 세팅
                    // 반복문이 돌면서 약관 개수만큼 DB에 INSERT 실행 (이때 @Transactional이 하나라도 에러 시 전체 Rollback을 보장)
                    userDao.insertUserTerms(userTerms); // 약관별로 DB insert
                }
            }

            // 관심사 선택 내역 분리 저장
            List<Long> interests = signupRequest.getInterests();
            // interests 리스트가 null이 아니고 비어있지 않으며 유저가 고유번호(PK)를 가졌다면
            if (interests != null && !interests.isEmpty() && user.getId() != null) {
                for (Long interestId : interests) {
                    UserInterest userInterest = new UserInterest();
                    userInterest.setUserId(((Number) user.getId()).longValue());
                    userInterest.setInterestId(interestId);

                    // 반복문이 돌면서 프론트엔드에서 골라온 관심사 개수만큼 DB에 INSERT 실행
                    userDao.insertUserInterest(userInterest); // 관심사별로 DB insert
                }
            }

            return "success";

        } catch (Exception e) {
            // 서버 콘솔에서 정확한 에러 위치를 추적용 로그 출력
            e.printStackTrace();
            // Controller의 catch 블록으로 에러 메시지를 주고 프론트에 400 에러로 응답하게 만듦.
            throw new RuntimeException(e.getMessage());
        }
    }

    // 일반 로그인
    public Map<String, Object> login(String email, String password, boolean autoLogin) {
        // DB에서 이메일로 유저 정보를 가져옴
        User dbUser = userDao.findByEmail(email);

        // 암호화 비교 원리: password(유저가 입력한 비번)를 암호화해서 DB의 암호화된 값과 같은지 비교함.
        // dbUser가 없거나(email이 틀려서 db에서 가져온게 없음) 비번이 틀렸거나
        if (dbUser == null || !passwordEncoder.matches(password, dbUser.getPassword())) {
            return null; // null 반환. Controller에서 401 에러로 처리
        }

        // 위 if에 안걸렸으니 로그인 성공. 토큰 발급.
        String token = jwtUtil.createToken(dbUser.getEmail(), dbUser.getNickname(), autoLogin);

        // 프론트엔드 전역 Store(Zustand)에 들어갈 데이터 Map에 저장
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("token", token);

        // 전역 Store에 들어갈 유저정보 Map
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("email", dbUser.getEmail());
        userInfo.put("nickname", dbUser.getNickname());
        userInfo.put("birthday", dbUser.getBirthday());
        userInfo.put("gender", dbUser.getGender());
        userInfo.put("postcode", dbUser.getPostcode());
        userInfo.put("status", dbUser.getStatus());

        responseData.put("user", userInfo);
        return responseData;
    }

    // 구글 로그인
    @Transactional
    public Map<String, Object> googleLogin(Map<String, String> googleData) {
        // 구글이 인증한 이메일로 기존 가입 여부 확인
        String email = googleData.get("email");

        User dbUser = userDao.findByEmail(email);

        // 프론트엔드로 보낼 최종 응답 데이터 Map 생성
        Map<String, Object> responseData = new HashMap<>();

        // DB에 유저가 없다면(null)
        if (dbUser == null) {
            // 프론트(Login.jsx)에 정보 받아오라고 신호(isRegistered: false)줌.
            responseData.put("isRegistered", false);
            return responseData;
        }

        // 위 if에 안걸렸으니 DB에 유저가 있음 (이미 가입된 구글 유저) (로그인 성공 처리)
        // 비밀번호 검증 없이 바로 JWT 토큰 발급, 구글 로그인은 autoLogin을 true로 고정하여 발급(자동 로그인)
        String token = jwtUtil.createToken(dbUser.getEmail(), dbUser.getNickname(), true);
        responseData.put("isRegistered", true);
        responseData.put("token", token);

        // 전역 Store에 들어갈 유저정보 Map
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("email", dbUser.getEmail());
        userInfo.put("nickname", dbUser.getNickname());
        userInfo.put("birthday", dbUser.getBirthday());
        userInfo.put("gender", dbUser.getGender());
        userInfo.put("postcode", dbUser.getPostcode());
        userInfo.put("profileImage", dbUser.getProfileImage());
        userInfo.put("status", dbUser.getStatus());

        responseData.put("user", userInfo);
        return responseData;
    }

    // 이메일 인증번호 발송
    public String sendVerificationEmail(String receiverEmail) {
        if (receiverEmail == null || receiverEmail.trim().isEmpty()) {
            throw new RuntimeException("이메일을 입력해주세요.");
        }

        // 사용자가 실수로 이메일 앞뒤에 공백을 넣어도 같은 이메일로 처리하기 위해 trim 처리
        String normalizedEmail = receiverEmail.trim();

        // 이미 가입된 active/admin 계정이면 회원가입 이메일 인증 자체를 막음
        User existingUser = userDao.findByEmail(normalizedEmail);

        if (existingUser != null) {
            throw new RuntimeException("이미 해당 이메일로 가입된 계정이 존재합니다.");
        }

        Random r = new Random();
        StringBuilder sb = new StringBuilder(); // 문자열을 효율적으로 이어 붙이기 위한 객체

        // 영문자 + 숫자 혼합된 6자리 랜덤 난수(인증번호) 생성 알고리즘
        for (int i = 0; i < 6; i++) {
            int flag = r.nextInt(3); // 0(숫자), 1(대문자), 2(소문자) 결정

            if (flag == 0) {
                sb.append(r.nextInt(10)); // 0~9 랜덤 숫자 추가
            } else if (flag == 1) {
                sb.append((char) (r.nextInt(26) + 65)); // 아스키코드 65('A')를 기준으로 랜덤 대문자 변환 후 추가
            } else {
                sb.append((char) (r.nextInt(26) + 97)); // 아스키코드 97('a')를 기준으로 랜덤 소문자 변환 후 추가
            }
        }

        // 조립된 6자리 인증번호 추출 (예: 3Bf8a1)
        String authCode = sb.toString();

        // 개발 단계 확인용 로그.
        // System.out.println("[이메일 인증번호] " + normalizedEmail + " : " + authCode);

        // 메일 수신 시 적용될 HTML 양식 작성
        String emailTitle = "[WithDay] 회원가입 이메일 인증번호입니다.";
        String emailContent = "<h1>안녕하세요. WithDay 입니다.</h1>"
                + "<h3>인증번호는 [ <b style='color:#007BFF;'>" + authCode + "</b> ] 입니다.</h3>"
                + "<h3>화면으로 돌아가 인증번호를 입력해 주세요.</h3>";

        // 실제 메일 발송(EmailSender: 외부 메일 전송 함수)
        // receiverEmail 원본값 대신 앞뒤 공백이 제거된 normalizedEmail로 발송
        emailSender.sendMail(emailTitle, normalizedEmail, emailContent);

        // 프론트에서의 입력값과 비교할 수 있게 인증번호 반환
        return authCode;
    }

    // 약관 정보 불러오기
    public List<Terms> getAllTerms() {
        // DB에서 모든 약관 데이터를 가져와 List에 저장
        List<Terms> result = userDao.getAllTerms();

        return result;
    }

    // 관심사 정보 전체 불러오기
    public List<Interest> getAllInterests() {
        // DB에서 모든 관심사 데이터를 가져와 List에 저장
        List<Interest> result = userDao.getAllInterests();

        return result;
    }

    // 소셜 로그인 회원가입
    @Transactional
    public String socialSignup(SignupRequestDTO signupRequest) {
        try {
            // 프론트에서 받은 소셜 가입 데이터 중 유저 정보 추출
            User user = signupRequest.getUser();

            // 최소 (만)나이 가입 제한 (프론트에서 막지만 이중 보안), 유저 생일이 null이 아니고 유저 생일이 비어있지 않으면
            if (user.getBirthday() != null && !user.getBirthday().isEmpty()) {
                // 텍스트("yyyy-MM-dd")로 온 생일을 자바가 계산할 수 있는 날짜 객체(LocalDate)로 번역
                LocalDate birthDate = LocalDate.parse(user.getBirthday(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                // 현재 날짜
                LocalDate currentDate = LocalDate.now();
                // Period.between(과거, 현재): 두 날짜 사이에 시간이 얼마나 흘렀는지 계산
                int age = Period.between(birthDate, currentDate).getYears();

                if (age < MIN_AGE) {
                    // catch로 가서 에러메시지 400 Bad Request 반환
                    throw new RuntimeException("만 " + MIN_AGE + "세 이상만 가입할 수 있습니다.");
                }
            }

            // 구글이 인증한 이메일로 기존 가입 여부 확인 (구글 소셜 로그인에서 한번 확인했지만 한번 더 확인)
            User existingUser = userDao.findByEmail(user.getEmail());
            if (existingUser != null) {
                throw new RuntimeException("이미 해당 이메일로 가입된 계정이 존재합니다.");
            }

            user.setProvider("google"); // 구글 가입자라고 명시

            // DB의 password 컬럼이 NOT NULL(필수)이므로, 규칙을 맞추기 위해 추측 불가능한 무작위 고유 문자열(UUID)을 생성하여 암호화 후 넣음
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));

            // 유저 정보를 DB에 삽입 (MyBatis가 insert를 실행, 이때 다음 약관 저장 로직에서 쓰기 위해 유저의 고유 번호(id)를 채워옴.)
            userDao.insertUser(user);

            // 약관 동의 내역 분리 저장 (정규화 원리)
            // 프론트엔드는 { "TOS": true, "PRIVACY": true...} 같은 JSON 형태로 값을 보냄. 이걸 String(약관 이름)과 Boolean(동의 여부)을 담는 Map으로 저장
            Map<String, Boolean> terms = signupRequest.getTerms();

            // terms가 null이 아니고 유저가 고유번호(PK)를 가졌다면
            if (terms != null && user.getId() != null) {
                // .entrySet()라는 함수를 써서, Map 안에 있는 Key-Value 쌍들을 하나하나의 Entry(항목) 객체로 리스트처럼 나열
                for (Map.Entry<String, Boolean> entry : terms.entrySet()) {

                    UserTerms userTerms = new UserTerms();
                    userTerms.setUserId(((Number) user.getId()).longValue());

                    // 이용약관 4개중 뭔지 찾기
                    Long termsId = 0L;
                    switch (entry.getKey()) {
                        case "TOS":
                            termsId = 1L;
                            break;
                        case "PRIVACY":
                            termsId = 2L;
                            break;
                        case "MARKETING":
                            termsId = 3L;
                            break;
                        case "NOTIFICATION":
                            termsId = 4L;
                            break;
                    }
                    userTerms.setTermsId(termsId);
                    userTerms.setAgreed(entry.getValue()); // 동의 여부(true/false) 세팅
                    // 반복문이 돌면서 약관 개수만큼 DB에 INSERT 실행 (이때 @Transactional이 하나라도 에러 시 전체 Rollback을 보장)
                    userDao.insertUserTerms(userTerms); // 약관별로 DB insert
                }
            }

            // 관심사 선택 내역 분리 저장 (소셜 회원가입용)
            List<Long> interests = signupRequest.getInterests();
            // interests 리스트가 null이 아니고 비어있지 않으며 유저가 고유번호(PK)를 가졌다면
            if (interests != null && !interests.isEmpty() && user.getId() != null) {
                for (Long interestId : interests) {
                    UserInterest userInterest = new UserInterest();
                    userInterest.setUserId(((Number) user.getId()).longValue());
                    userInterest.setInterestId(interestId);

                    // 반복문이 돌면서 프론트엔드에서 골라온 관심사 개수만큼 DB에 INSERT 실행
                    userDao.insertUserInterest(userInterest); // 관심사별로 DB insert
                }
            }

            return "success";
        } catch (Exception e) {
            // 서버 콘솔에서 정확한 에러 위치를 추적용 로그 출력
            e.printStackTrace();
            // Controller의 catch 블록으로 에러 메시지를 주고 프론트에 400 에러로 응답하게 만듦.
            throw new RuntimeException(e.getMessage());
        }
    }

    // 아이디 찾기
    public Map<String, String> findId(FindAccountDTO findAccountDTO) {
        // 프론트에서 받은 닉네임, 전화번호로 유저를 찾음
        User user = userDao.findByNicknameAndPhone(findAccountDTO);

        // 일치하는 유저가 없다면
        if (user == null) {
            // Controller에서 catch하여 400 Bad Request로 프론트에 메시지 전달
            throw new RuntimeException("일치하는 회원 정보를 찾을 수 없습니다.");
        }

        String email = user.getEmail();

        // 이메일 개인정보 보호를 위해 앞 2글자만 보여주고 나머지는 마스킹 처리 (예: withday@gmail.com -> wi*****@gmail.com)
        String maskedEmail = email;

        // 이메일 형식이면 @ 기준으로 아이디 부분과 도메인 부분을 나눠서 마스킹 처리
        if (email != null && email.contains("@")) {
            String[] emailParts = email.split("@"); // @기준으로 나눔
            String emailId = emailParts[0]; // @ 앞부분
            String emailDomain = emailParts[1]; // @ 뒷부분

            // 아이디가 2글자 이상이면 앞 2글자만 보여주고, 1글자면 1글자만 보여줌
            if (emailId.length() >= 2) {
                maskedEmail = emailId.substring(0, 2) + "*****@" + emailDomain;
            } else {
                maskedEmail = emailId + "*****@" + emailDomain;
            }
        }

        // 프론트에서 data.email로 꺼내 쓸 수 있도록 Map 형태로 반환
        Map<String, String> result = new HashMap<>();
        result.put("email", maskedEmail);

        return result;
    }

    // 비밀번호 찾기 인증번호 발송
    public String sendPasswordResetCode(FindAccountDTO findAccountDTO) {
        String email = findAccountDTO.getEmail();

        // 입력한 이메일로 가입된 유저가 있는지 확인
        User user = userDao.findByEmail(email);

        // 가입된 이메일이 없다면 에러 발생
        if (user == null) {
            // Controller에서 catch하여 400 Bad Request로 프론트에 메시지 전달
            throw new RuntimeException("가입된 이메일이 없습니다.");
        }

        // 소셜 로그인 계정은 사용자가 직접 아는 비밀번호가 없는 구조라서 비밀번호 재설정을 막음
        // 현재 소셜 가입자는 provider가 google로 저장됨.
        if (!"local".equals(user.getProvider())) {
            throw new RuntimeException("소셜 로그인 계정은 비밀번호 재설정을 사용할 수 없습니다.");
        }

        Random r = new Random();
        StringBuilder sb = new StringBuilder(); // 문자열을 효율적으로 이어 붙이기 위한 객체

        // 영문자 + 숫자 혼합된 6자리 랜덤 난수(인증번호) 생성 알고리즘
        for (int i = 0; i < 6; i++) {
            int flag = r.nextInt(3); // 0(숫자), 1(대문자), 2(소문자) 결정

            if (flag == 0) {
                sb.append(r.nextInt(10)); // 0~9 랜덤 숫자 추가
            } else if (flag == 1) {
                sb.append((char) (r.nextInt(26) + 65)); // 아스키코드 65('A')를 기준으로 랜덤 대문자 변환 후 추가
            } else {
                sb.append((char) (r.nextInt(26) + 97)); // 아스키코드 97('a')를 기준으로 랜덤 소문자 변환 후 추가
            }
        }

        // 조립된 6자리 인증번호 추출 (예: 3Bf8a1)
        String authCode = sb.toString();

        // 개발 단계 확인용 로그.
        // System.out.println("[비밀번호 찾기 인증번호] " + email + " : " + authCode);

        // 메일 수신 시 적용될 HTML 양식 작성
        String emailTitle = "[WithDay] 비밀번호 재설정 인증번호입니다.";
        String emailContent = "<h1>안녕하세요. WithDay 입니다.</h1>"
                + "<h3>비밀번호 재설정 인증번호는 [ <b style='color:#007BFF;'>" + authCode + "</b> ] 입니다.</h3>"
                + "<h3>화면으로 돌아가 인증번호를 입력해 주세요.</h3>";

        // 실제 메일 발송
        emailSender.sendMail(emailTitle, email, emailContent);

        // 인증번호와 인증 완료 여부를 서버 메모리에 저장
        passwordResetCodeStore.put(email, authCode);
        passwordResetVerifiedStore.put(email, false);

        return "success";
    }

    // 비밀번호 찾기 인증번호 확인
    public String verifyPasswordResetCode(FindAccountDTO findAccountDTO) {
        String email = findAccountDTO.getEmail();
        String authCode = findAccountDTO.getAuthCode();

        // 해당 이메일로 발급된 인증번호를 꺼냄
        String savedCode = passwordResetCodeStore.get(email);

        // 인증번호를 발송한 적이 없다면 에러 발생
        if (savedCode == null) {
            throw new RuntimeException("인증번호를 먼저 발송해주세요.");
        }

        // 프론트에서 입력한 인증번호와 서버에 저장된 인증번호가 다르면 에러 발생
        if (!savedCode.equals(authCode)) {
            throw new RuntimeException("인증번호가 일치하지 않습니다.");
        }

        // 인증번호가 일치하면 해당 이메일은 비밀번호 재설정 가능 상태로 변경
        passwordResetVerifiedStore.put(email, true);

        return "success";
    }

    // 비밀번호 재설정
    @Transactional
    public String resetPassword(FindAccountDTO findAccountDTO) {
        String email = findAccountDTO.getEmail();
        String newPassword = findAccountDTO.getNewPassword();

        // 이메일로 유저 조회
        User user = userDao.findByEmail(email);

        // 가입된 이메일이 없다면 에러 발생
        if (user == null) {
            throw new RuntimeException("가입된 이메일이 없습니다.");
        }

        // 소셜 로그인 계정은 비밀번호 재설정을 막음
        if (!"local".equals(user.getProvider())) {
            throw new RuntimeException("소셜 로그인 계정은 비밀번호 재설정을 사용할 수 없습니다.");
        }

        // 인증번호 확인을 완료한 이메일인지 검사
        Boolean isVerified = passwordResetVerifiedStore.get(email);

        if (isVerified == null || !isVerified) {
            throw new RuntimeException("이메일 인증을 먼저 완료해주세요.");
        }

        // 유저가 입력한 새 비밀번호를 암호화
        String encodedPassword = passwordEncoder.encode(newPassword);

        // 암호화된 비밀번호로 DB 업데이트
        // email, encodedPassword 두 값을 따로 넘기므로 DAO에서 @Param을 사용함.
        userDao.updatePassword(email, encodedPassword);

        // 인증번호 재사용 방지를 위해 인증번호와 인증 성공 상태를 삭제
        passwordResetCodeStore.remove(email);
        passwordResetVerifiedStore.remove(email);

        return "success";
    }

    public User findByEmail(String email) {
        return userDao.findByEmail(email);
    }

    public User findAnyByEmail(String email) {
        return userDao.findAnyByEmail(email);
    }

    @Transactional
    public String withdrawMe(String email) {
        User user = userDao.findByEmail(email);

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 사용자입니다.");
        }

        /*
         * 탈퇴 시에도 schedule과 approved participation 기록은 보존해야 하므로 핵심 이력 row는 남긴다.
         * 대신 호스트가 아직 모집 중이던 일정은 더 이상 운영될 수 없으므로 closed로 닫고,
         * 탈퇴 사용자 본인의 pending/rejected/canceled/kicked participation만 정리한다.
         * 사용자의 개인 설정성 데이터(bookmark, interests, terms, notification)만 지운다.
         * 마지막에 user row만 suspended+tombstone 상태로 남겨 재가입 가능성과 로그인 차단을 동시에 만족시킨다.
         */
        String tombstoneEmail = buildWithdrawnEmail(user.getId());

        userDao.closeSchedulesByHostUserId(user.getId());
        userDao.deleteNonApprovedParticipationsByUserId(user.getId());
        userDao.deleteBookmarksByUserId(user.getId());
        userDao.deleteUserInterests(user.getId());
        userDao.deleteUserTermsByUserId(user.getId());
        userDao.deleteNotificationsByUserId(user.getId());

        int updatedRows = userDao.softDeleteUser(user.getId(), tombstoneEmail);
        if (updatedRows <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "회원 탈퇴 처리에 실패했습니다.");
        }

        return "success";
    }

    // 다른 사용자 공개 프로필 조회
    public MypageResponseDTO getUserProfile(String email) {
        User user = userDao.findByEmail(email);

        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "존재하지 않는 사용자입니다.");
        }

        MypageResponseDTO response = new MypageResponseDTO();
        /*
         * 공개 프로필은 MyPageMain 화면을 그대로 재사용할 수 있을 정도의 읽기 정보는 유지하되,
         * 수정/민감 정보(phone, address, provider, notificationAgreed 등)는 제외하는 조립 단계다.
         */
        response.setUserId(user.getId());
        response.setEmail(user.getEmail());
        response.setNickname(user.getNickname());
        response.setProfileImage(user.getProfileImage());
        response.setIntro(user.getIntro());
        response.setCreatedAt(user.getCreatedAt());
        response.setStatus(user.getStatus());
        response.setGender(user.getGender());
        response.setSelectedInterestIds(userDao.getUserInterestIds(user.getId()));
        response.setAllInterests(userDao.getAllInterests());
        response.setTogetherScheduleCount(userDao.getTogetherScheduleCount(user.getId()));
        response.setMetWitCount(userDao.getMetWitCount(user.getId()));
        // 위트 로그 영역은 내 프로필/타인 프로필 모두 같은 카드 UI를 쓰므로 completed 일정 카드 목록도 같은 contract 로 맞춘다.
        response.setMySchedules(scheduleDao.selectMyScheduleCards(user.getId()));

        return response;
    }

    //마이페이지 수정
    // 마이페이지 수정 페이지 정보 불러오기
    public MypageEditResponseDTO getMypageEdit(String email) {
        // 이메일로 유저 정보 조회
        User user = userDao.findByEmail(email);

        if (user == null) {
            throw new RuntimeException("존재하지 않는 사용자입니다.");
        }

        MypageEditResponseDTO response = new MypageEditResponseDTO();

        // 유저 기본 정보 세팅
        response.setUserId(user.getId());
        response.setEmail(user.getEmail());
        response.setProvider(user.getProvider()); // local이면 비밀번호 변경 폼 노출, google이면 숨김
        response.setNickname(user.getNickname());
        response.setPhone(user.getPhone());
        response.setGender(user.getGender());
        response.setIntro(user.getIntro());
        response.setProfileImage(user.getProfileImage());
        response.setPostcode(user.getPostcode());
        response.setAddress(user.getAddress());
        response.setDetailAddress(user.getDetailAddress());
        response.setStatus(user.getStatus());

        // 유저가 선택한 관심사 id 목록
        response.setSelectedInterestIds(userDao.getUserInterestIds(user.getId()));

        // 전체 관심사 목록
        response.setAllInterests(userDao.getAllInterests());

        // 알림 동의 여부 조회
        Boolean notificationAgreed = userDao.getNotificationAgreed(user.getId());
        // null이면 false 처리
        response.setNotificationAgreed(Boolean.TRUE.equals(notificationAgreed));


        //마이페이지 상단
        response.setTogetherScheduleCount(
                userDao.getTogetherScheduleCount(user.getId())
        );
        response.setMetWitCount(
                userDao.getMetWitCount(user.getId())
        );
        response.setCreatedAt(user.getCreatedAt());

        response.setMySchedules(
                scheduleDao.selectMyScheduleCards(user.getId())
        );

        return response;
    }

    // 마이페이지 수정
    @Transactional
    public String updateMypage(MypageEditRequestDTO mypageEditRequest) {
        try {
            // 이메일로 기존 유저 조회
            User dbUser = userDao.findByEmail(mypageEditRequest.getEmail());

            if (dbUser == null) {
                throw new RuntimeException("존재하지 않는 사용자입니다.");
            }

            // 수정할 유저 정보 객체 생성
            User updateUser = new User();
            updateUser.setId(dbUser.getId());
            updateUser.setNickname(mypageEditRequest.getNickname());
            updateUser.setPhone(mypageEditRequest.getPhone());
            updateUser.setGender(mypageEditRequest.getGender());
            updateUser.setIntro(mypageEditRequest.getIntro());
            updateUser.setProfileImage(mypageEditRequest.getProfileImage());
            updateUser.setPostcode(mypageEditRequest.getPostcode());
            updateUser.setAddress(mypageEditRequest.getAddress());
            updateUser.setDetailAddress(mypageEditRequest.getDetailAddress());

            // 비밀번호 변경 처리
            handleMypagePasswordChange(mypageEditRequest, dbUser, updateUser);

            // user 테이블 수정
            userDao.updateMypageUser(updateUser);

            // 기존 관심사 삭제 후 새 관심사 다시 저장
            userDao.deleteUserInterests(dbUser.getId());

            if (mypageEditRequest.getInterestIds() != null && !mypageEditRequest.getInterestIds().isEmpty()) {
                for (Long interestId : mypageEditRequest.getInterestIds()) {
                    UserInterest userInterest = new UserInterest();
                    userInterest.setUserId(dbUser.getId());
                    userInterest.setInterestId(interestId);

                    userDao.insertUserInterest(userInterest);
                }
            }

            // 알림 설정 수정
            // 현재 DB 기준 NOTIFICATION 약관 id가 4번이므로 4L 사용
            Long notificationTermsId = 4L;

            UserTerms userTerms = new UserTerms();
            userTerms.setUserId(dbUser.getId());
            userTerms.setTermsId(notificationTermsId);
            userTerms.setAgreed(Boolean.TRUE.equals(mypageEditRequest.getNotificationAgreed()));

            // user_terms에 알림 약관 데이터가 이미 있는지 확인
            int userTermsCount = userDao.countUserTerms(dbUser.getId(), notificationTermsId);

            if (userTermsCount > 0) {
                // 있으면 동의 여부만 수정
                userDao.updateUserTermsAgreed(userTerms);
            } else {
                // 없으면 새로 추가
                userDao.insertUserTerms(userTerms);
            }

            return "success";

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e.getMessage());
        }
    }

    // 마이페이지 비밀번호 변경 처리
    private void handleMypagePasswordChange(MypageEditRequestDTO mypageEditRequest, User dbUser, User updateUser) {
        boolean hasCurrentPassword =
                mypageEditRequest.getCurrentPassword() != null &&
                        !mypageEditRequest.getCurrentPassword().isBlank();

        boolean hasNewPassword =
                mypageEditRequest.getNewPassword() != null &&
                        !mypageEditRequest.getNewPassword().isBlank();

        boolean hasNewPasswordConfirm =
                mypageEditRequest.getNewPasswordConfirm() != null &&
                        !mypageEditRequest.getNewPasswordConfirm().isBlank();

        // 비밀번호 칸 중 하나라도 입력했는지 확인
        boolean wantsToChangePassword =
                hasCurrentPassword || hasNewPassword || hasNewPasswordConfirm;

        // 비밀번호 칸을 전부 비워두면 비밀번호 변경 안 함
        if (!wantsToChangePassword) {
            return;
        }

        // 구글 로그인 유저는 프론트에서 비밀번호 변경 폼을 숨기지만,
        // 개발자도구 등으로 요청할 수 있으므로 백엔드에서도 차단
        if (!"local".equals(dbUser.getProvider())) {
            throw new RuntimeException("소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.");
        }

        // 하나라도 입력했으면 기존 비밀번호, 새 비밀번호, 새 비밀번호 확인 모두 입력해야 함
        if (!hasCurrentPassword || !hasNewPassword || !hasNewPasswordConfirm) {
            throw new RuntimeException("비밀번호 변경 정보를 모두 입력해주세요.");
        }

        // 기존 비밀번호 검증
        if (!passwordEncoder.matches(mypageEditRequest.getCurrentPassword(), dbUser.getPassword())) {
            throw new RuntimeException("기존 비밀번호가 일치하지 않습니다.");
        }

        // 새 비밀번호와 새 비밀번호 확인 일치 여부 검증
        if (!mypageEditRequest.getNewPassword().equals(mypageEditRequest.getNewPasswordConfirm())) {
            throw new RuntimeException("새 비밀번호가 일치하지 않습니다.");
        }
        if (!"local".equals(dbUser.getProvider())) {
            throw new RuntimeException("소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.");
        }
        // 새 비밀번호 암호화 후 updateUser에 세팅
        updateUser.setPassword(passwordEncoder.encode(mypageEditRequest.getNewPassword()));
    }
    @Transactional
    public String updateProfileImage(String email, MultipartFile profileFile) {
        try {
            User user = userDao.findByEmail(email);

            if (user == null) {
                throw new RuntimeException("존재하지 않는 사용자입니다.");
            }

            if (profileFile == null || profileFile.isEmpty()) {
                throw new RuntimeException("프로필 이미지 파일이 없습니다.");
            }

            Map uploadParams = ObjectUtils.asMap(
                    "folder", "withday/profiles",
                    "use_filename", true,
                    "unique_filename", true
            );

            Map uploadResult = cloudinary.uploader().upload(profileFile.getBytes(), uploadParams);

            String profileImage = (String) uploadResult.get("secure_url");

            userDao.updateProfileImage(user.getId(), profileImage);

            return profileImage;

        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e.getMessage());
        }
    }

    private String buildWithdrawnEmail(Long userId) {
        long timestamp = System.currentTimeMillis();
        return "deleted+" + userId + "+" + timestamp + "@withdrawn.withday.local";
    }
}
