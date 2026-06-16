package com.test.withdayback.common.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;


@Configuration
@ConfigurationProperties(prefix = "onesignal")
@Getter
@Setter
public class OneSignalProperties {
    private String appId;
    private String apiKey;
}
