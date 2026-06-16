package com.test.withdayback.admin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminTermsRequest {
    private String version; // 약관 버전. 예: v1.0, v1.1
    private String content; // 약관 상세 내용
}