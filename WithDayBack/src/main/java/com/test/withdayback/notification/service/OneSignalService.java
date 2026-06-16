package com.test.withdayback.notification.service;

import com.test.withdayback.common.config.OneSignalProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OneSignalService {

    private final OneSignalProperties properties;

    // 서버 실행 시 확인
    @PostConstruct
    public void init() {

//        System.out.println("apiKey = " + properties.getApiKey());
//        System.out.println("appId = " + properties.getAppId());
    }

    // 알림 실행 시 확인
    public void sendToUser(String email, String title, String message) {
//        System.out.println("apiKey = " + properties.getApiKey());
//        System.out.println("appId = " + properties.getAppId());

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        headers.set(
                "Authorization",
                "Basic " + properties.getApiKey()
        );

        Map<String, Object> body = new HashMap<>();

        body.put("app_id", properties.getAppId());

        body.put(
                "include_aliases",
                Map.of(
                        "external_id",
                        List.of(email)
                )
        );

        body.put(
                "target_channel",
                "push"
        );

        body.put(
                "headings",
                Map.of("en", title)
        );

        body.put(
                "contents",
                Map.of("en", message)
        );

        HttpEntity<Map<String, Object>> request =
                new HttpEntity<>(body, headers);

        restTemplate.postForEntity(
                "https://api.onesignal.com/notifications",
                request,
                String.class
        );
    }
}