    package com.test.withdayback.user.controller;

    import com.cloudinary.utils.ObjectUtils;
    import com.test.withdayback.common.util.JwtUtil;
    import com.test.withdayback.user.dto.MypageEditRequestDTO;
    import com.test.withdayback.user.dto.MypageEditResponseDTO;
    import com.test.withdayback.user.dto.MypageResponseDTO;
    import com.test.withdayback.user.dto.FindAccountDTO;
    import com.test.withdayback.user.dto.SignupRequestDTO;
    import com.test.withdayback.user.service.UserService;
    import com.test.withdayback.user.vo.Interest;
    import com.test.withdayback.user.vo.Terms;
    import org.springframework.beans.factory.annotation.Autowired;
    import org.springframework.http.HttpStatus;
    import org.springframework.http.ResponseEntity;
    import org.springframework.web.bind.annotation.*;
    import org.springframework.web.multipart.MultipartFile;
    import org.springframework.web.bind.annotation.RequestHeader;

    import java.util.HashMap;
    import java.util.List;
    import java.util.Map;

    // @RestController: 프론트엔드(React)와 통신할 때 사용하는 어노테이션, Json 형태로 객체 데이터를 반환함. (REST API 응답을 위한 Controller)
    // Controller는 HTML 화면을 반환하지만, RestController는 프론트엔드에 JSON 데이터를 반환
    // @RequestMapping: 기본 주소를 설정. 아래의 모든 함수는 "/users" 로 주소 시작
    @RestController
    @RequestMapping("/users")
    public class UserController {

        // @Autowired: new로 객체를 만들지 않아도, 스프링이 UserService 객체를 찾아 자동으로 연결해줌.
        @Autowired
        private UserService userService;

        // @GetMapping: Select용
        // @PostMapping: Insert용
        // @PutMapping: 전체 수정(Update)용
        // @PatchMapping: 부분 수정(Update)용
        // @DeleteMapping: Delete용

        // 회원가입 (/users/signup)
        // ResponseEntity<?>: 다른 타입(String, int등)대신 프론트엔드에게 HTTP 상태(200 OK, 400 Bad Request 등)를 같이 주는 타입
        // @RequestPart: 프론트엔드에서 파일과 글자를 함께 보내기 위해 multipart/form-data를 썼으므로, 통째로 받는 @RequestBody 대신 특정 칸(Part)만 꺼내는 @RequestPart를 사용함.
        // MultipartFile: 스프링에서 파일을 받을 때 사용하는 전용 타입. (required = false: 사진을 안 올려도 에러가 나지 않게 방어)
        @PostMapping("/signup")
        public ResponseEntity<?> signup(
                @RequestPart("signupData") SignupRequestDTO signupRequest,
                @RequestPart(value = "profileImage", required = false) MultipartFile profileImage) {
            try {
                String result = userService.signup(signupRequest, profileImage);

                // 200 OK 상태와 "success" 문자열 반환
                return ResponseEntity.ok(result);
            } catch (RuntimeException e) {
                // Service에서 에러가 나면 프론트엔드에 400 Bad Request 상태코드와 에러 메시지를 보냄.
                // 400 Bad Request: 데이터 양식이 틀림 (예: 이메일 칸에 @가 없음)
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        // 일반 로그인 (/users/login)
        // @RequestBody: 프론트엔드가 보낸 JSON 텍스트를 자바에서 쓸수있는 객체로 변환해 주는 어노테이션.
        // Map<String, String>: DTO 클래스대신 JSON의 Key-Value 구조로 받음.
        @PostMapping("/login")
        public ResponseEntity<?> login(@RequestBody Map<String, String> loginData) {
            String email = loginData.get("email");
            String password = loginData.get("password");

            // 프론트에서 보낸 autoLogin 값을 꺼내서 boolean으로 변환 (안 보냈으면 기본값 false)
            boolean autoLogin = Boolean.parseBoolean(loginData.getOrDefault("autoLogin", "false"));

            Map<String, Object> result = userService.login(email, password, autoLogin);

            // 결과가 null이면 (비번이 틀리거나 없는 이메일이면)
            if (result == null) {
                // 401 Unauthorized: 인증 실패. (예: 비밀번호 틀림.)
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("이메일 또는 비밀번호가 일치하지 않습니다.");
            }
            // 로그인 성공 시 토큰과 유저 정보 Map(result)을 200 OK와 함께 반환
            return ResponseEntity.ok(result);
        }

        // 구글 로그인 (/users/google-login, 신호만 보냄.)
        @PostMapping("/google-login")
        public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> googleData) {
            try {
                Map<String, Object> result = userService.googleLogin(googleData);

                // 로그인 성공 또는 가입 안됨(isRegistered: false) 정보 반환
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                // 500 Internal Server Error: 서버 내부 에러. (예: DB연결 끊김)
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("구글 로그인 처리 중 오류가 발생했습니다.");
            }
        }

        // 이메일 인증 발송 (/users/email-verification)
        @PostMapping("/email-verification")
        public ResponseEntity<?> sendEmailVerification(@RequestBody Map<String, String> request) {
            try {
                String email = request.get("email");

                // service에서 이메일 중복 검사, 인증번호 생성 및 메일 발송
                String authCode = userService.sendVerificationEmail(email);

                return ResponseEntity.ok(authCode);
            } catch (RuntimeException e) {
                // 중복 이메일, 빈 이메일 등 사용자가 수정할 수 있는 요청 오류
                return ResponseEntity.badRequest().body(e.getMessage());
            } catch (Exception e) {
                // 실제 메일 서버 오류 등 서버 내부 오류
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("이메일 발송에 실패했습니다.");
            }
        }

        // 약관 정보 전체 불러오기 (/users/terms)
        @GetMapping("/terms")
        public ResponseEntity<List<Terms>> getTerms() {
            List<Terms> result = userService.getAllTerms();

            return ResponseEntity.ok(result);
        }

        // 관심사 정보 전체 불러오기 (/users/interests)
        @GetMapping("/interests")
        public ResponseEntity<List<Interest>> getInterests() {
            List<Interest> result = userService.getAllInterests();

            return ResponseEntity.ok(result);
        }

        // 소셜 로그인 회원가입(/users/social-signup)
        @PostMapping("/social-signup")
        public ResponseEntity<?> socialSignup(@RequestBody SignupRequestDTO signupRequest) {
            try {
                String result = userService.socialSignup(signupRequest);

                return ResponseEntity.ok(result);
            } catch (RuntimeException e) {
                // Service에서 에러가 나면 프론트엔드에 400 Bad Request 상태코드와 에러 메시지를 보냄.
                // 400 Bad Request: 데이터 양식이 틀림 (예: 필수 약관 동의 누락)
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        // 마이페이지 수정 페이지 정보 불러오기
        @GetMapping("/mypage/edit")
        public ResponseEntity<?> getMypageEdit(
                @RequestHeader(value = "Authorization", required = false) String authorization
        ) {
            try {
                String email = getEmailFromAuthorizationHeader(authorization);

                MypageEditResponseDTO result = userService.getMypageEdit(email);

                return ResponseEntity.ok(result);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(401).body(e.getMessage());

            }
        }

        @DeleteMapping("/me")
        public ResponseEntity<?> withdrawMe(
                @RequestHeader(value = "Authorization", required = false) String authorization
        ) {
            try {
                String email = getEmailFromAuthorizationHeader(authorization);
                String result = userService.withdrawMe(email);

                return ResponseEntity.ok(result);
            } catch (org.springframework.web.server.ResponseStatusException e) {
                return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(401).body(e.getMessage());
            }
        }

        // 다른 사용자 프로필 조회
        // 수정용 /users/mypage/edit 와 분리해서, 읽기 전용 공개 정보만 내려주는 전용 엔드포인트다.
        @GetMapping("/profile/{email}")
        public ResponseEntity<?> getUserProfile(@PathVariable("email") String email) {
            try {
                MypageResponseDTO result = userService.getUserProfile(email);

                return ResponseEntity.ok(result);
            } catch (org.springframework.web.server.ResponseStatusException e) {
                // 존재하지 않는 사용자처럼 의도된 HTTP 상태는 200으로 뭉개지지 않게 원래 상태코드 그대로 전달한다.
                return ResponseEntity.status(e.getStatusCode()).body(e.getReason());
            }
        }

        // 마이페이지 수정
        @PostMapping("/mypage/edit")
        public ResponseEntity<?> updateMypage(
                @RequestBody MypageEditRequestDTO mypageEditRequest,
                @RequestHeader(value = "Authorization", required = false) String authorization
        ) {
            try {
                String email = getEmailFromAuthorizationHeader(authorization);

                // 프론트에서 보낸 email은 믿지 않고, 토큰 email로 강제 세팅
                mypageEditRequest.setEmail(email);

                String result = userService.updateMypage(mypageEditRequest);
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(401).body(e.getMessage());
            }
        }
        // Authorization 헤더에서 JWT 토큰을 꺼내 이메일 추출
        private String getEmailFromAuthorizationHeader(String authorization) {
            if (authorization == null || !authorization.startsWith("Bearer ")) {
                throw new RuntimeException("인증 토큰이 없습니다.");
            }

            String token = authorization.substring(7);

            return jwtUtil.getEmail(token);
        }
        @Autowired
        private JwtUtil jwtUtil;
        // 아이디 찾기 (/users/find-id)
        @PostMapping("/find-id")
        public ResponseEntity<?> findId(@RequestBody FindAccountDTO findAccountDTO) {
            try {
                Map<String, String> result = userService.findId(findAccountDTO);

                return ResponseEntity.ok(result);
            } catch (RuntimeException e) {
                // Service에서 일치하는 회원이 없으면 에러 메시지를 400 Bad Request로 프론트에 전달
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        // 비밀번호 찾기 - 인증번호 발송 (/users/find-password/email-verification)
        @PostMapping("/find-password/email-verification")
        public ResponseEntity<?> sendPasswordResetCode(@RequestBody FindAccountDTO findAccountDTO) {
            try {
                String result = userService.sendPasswordResetCode(findAccountDTO);

                return ResponseEntity.ok(result);
            } catch (RuntimeException e) {
                // 가입된 이메일이 없거나 소셜 계정이면 에러 메시지를 프론트에 전달
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        // 비밀번호 찾기 - 인증번호 확인 (/users/find-password/verify-code)
        @PostMapping("/find-password/verify-code")
        public ResponseEntity<?> verifyPasswordResetCode(@RequestBody FindAccountDTO findAccountDTO) {
            try {
                String result = userService.verifyPasswordResetCode(findAccountDTO);

                return ResponseEntity.ok(result);
            } catch (RuntimeException e) {
                // 인증번호가 없거나 일치하지 않으면 에러 메시지를 프론트에 전달
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }

        // 비밀번호 재설정 (/users/reset-password)
        @PostMapping("/reset-password")
        public ResponseEntity<?> resetPassword(@RequestBody FindAccountDTO findAccountDTO) {
            try {
                String result = userService.resetPassword(findAccountDTO);

                return ResponseEntity.ok(result);
            } catch (RuntimeException e) {
                // 인증을 완료하지 않았거나 비밀번호 변경에 실패하면 에러 메시지를 프론트에 전달
                return ResponseEntity.badRequest().body(e.getMessage());
            }
        }
        @PostMapping("/mypage/profile-image")
        public ResponseEntity<?> updateProfileImage(
                @RequestParam("profileFile") MultipartFile profileFile,
                @RequestHeader(value = "Authorization", required = false) String authorization
        ) {
            try {
                String email = getEmailFromAuthorizationHeader(authorization);

                String profileImage = userService.updateProfileImage(email, profileFile);

                Map<String, Object> result = new HashMap<>();
                result.put("profileImage", profileImage);

                return ResponseEntity.ok(result);
            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(401).body(e.getMessage());
            }
        }
    }
