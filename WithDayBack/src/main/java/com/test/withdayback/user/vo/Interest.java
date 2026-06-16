package com.test.withdayback.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Interest {
    private Long id;
    private String interestName; // 관심사 이름 (여행, 팝업등)
    private String iconName;     // 관심사 아이콘
}