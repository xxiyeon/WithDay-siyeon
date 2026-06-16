package com.test.withdayback.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("Terms")
public class Terms {
    private Long id;
    private String type;         // TOS, PRIVACY, MARKETING, NOTIFICATION
    private String version;      // 1.0 등
    private String content;      // 약관 내용
    private boolean isRequired;  // 필수 여부 (DB의 is_required)
}