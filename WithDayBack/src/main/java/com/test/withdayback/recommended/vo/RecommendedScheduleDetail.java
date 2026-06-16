package com.test.withdayback.recommended.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("RecommendedScheduleDetail")
public class RecommendedScheduleDetail {
    private Long id;
    private Long recommendedScheduleId;
    private Integer dayNumber;
    private Integer sortOrder;
    private String title;
    private String description;
    private String createdAt;
    private String updatedAt;
}