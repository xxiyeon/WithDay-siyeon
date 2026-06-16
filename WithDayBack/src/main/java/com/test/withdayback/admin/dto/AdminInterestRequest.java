package com.test.withdayback.admin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminInterestRequest {
    private String interestName; // 관심사 이름. 예: 여행, 팝업, 식사
    private String iconName; // 프론트에서 아이콘 매칭할 때 사용할 이름
}