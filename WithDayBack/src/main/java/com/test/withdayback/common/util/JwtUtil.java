package com.test.withdayback.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    // 256비트 이상의 비밀키 자동 생성 (실무에선 보안을 위해 별도 설정값 사용)
    private final SecretKey key =
            Keys.hmacShaKeyFor("we8f41xz6v8e416554ef9s85d4w63e54f8e4178d"
            .getBytes(StandardCharsets.UTF_8)); // 임의의 지정된 값을 SecretKey로 사용할 수 있도록 변경함

    // 토큰 유효 시간 (1시간) - 일반 로그인용
    private final long SHORT_EXPIRATION_TIME = 60 * 60 * 1000L;

    // 토큰 유효 시간 (7일) - 자동 로그인용
    private final long LONG_EXPIRATION_TIME = 7 * 24 * 60 * 60 * 1000L;

    // 토큰 생성 함수
    public String createToken(String email, String nickname, boolean autoLogin) {
        Date now = new Date();

        // autoLogin: 자동로그인 여부 (true면 7일 / false면 1시간)
        long expirationTime = autoLogin ? LONG_EXPIRATION_TIME : SHORT_EXPIRATION_TIME;
        Date expiryDate = new Date(now.getTime() + expirationTime);

        return Jwts.builder()
                .setSubject(email) // 토큰의 주인 (이메일)
                .claim("nickname", nickname) // 추가 정보 (닉네임)
                .setIssuedAt(now) // 발급 시간
                .setExpiration(expiryDate) // 만료 시간
                .signWith(key) // 비밀키 세팅
                .compact();
    }

    // 토큰 파싱
    public Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // 이메일 추출
    public String getEmail(String token) {
        return parseClaims(token).getSubject();
    }

    // 닉네임 추출
    public String getNickname(String token) {
        return parseClaims(token).get("nickname", String.class);
    }
}