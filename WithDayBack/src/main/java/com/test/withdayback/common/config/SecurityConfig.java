package com.test.withdayback.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll() // 추가하래서 일단 해놨어요
                        // 💡 일정 상세 조회(schedules/...) 주소를 허용 목록에 추가!
                        .requestMatchers(

                                "/users/signup",
                                "/users/login",
                                "/users/terms",
                                "/users/interests",
                                "/users/google-login",
                                "/users/social-signup",
                                "/users/email-verification",
                                "/users/me",
                                // 공개 프로필 read API 를 permitAll 에 포함하지 않으면 스프링 시큐리티가 먼저 막아 프런트에서 generic 에러로만 보이게 된다.
                                "/users/profile/**",
                                "/users/mypage/**",
                                "/users/find-id",
                                "/users/find-password/email-verification",
                                "/users/find-password/verify-code",
                                "/users/reset-password",
                                "/recommended-schedules/**",
                                "/schedules/**",
                                "/bookmarks/**",
                                "/participations/**",
                                "/region/**",
                                "/notifications/**",
                                "/admins/**",
                                "/notifications/**"

                        ).permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // 💡 만약 리액트가 3000번이라면 "http://localhost:3000"도 추가해주는 게 안전합니다.
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173",
                "https://d3q55wlejmib0v.cloudfront.net"
                ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
