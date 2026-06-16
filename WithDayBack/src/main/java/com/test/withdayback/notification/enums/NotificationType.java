package com.test.withdayback.notification.enums;

import lombok.Getter;

@Getter
public enum NotificationType {
    APPLY("참가 신청"),
    APPROVE("승인"),
    REJECT("거부"),
    KICK("추방");

    private final String title;

    NotificationType(String title) {
        this.title = title;
    }

}
