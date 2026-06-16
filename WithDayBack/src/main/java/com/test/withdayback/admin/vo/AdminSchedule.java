package com.test.withdayback.admin.vo;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminSchedule {
    private Long id;
    private String title;
    private String nickname;
    private String status;
    private String region;
    private String detailRegion;
    private int isPublic;
    private String createdAt;
}