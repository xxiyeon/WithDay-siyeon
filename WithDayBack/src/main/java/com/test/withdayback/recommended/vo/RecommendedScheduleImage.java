package com.test.withdayback.recommended.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("RecommendedScheduleImage")
public class RecommendedScheduleImage {
    private Long id;
    private Long recommendedScheduleId;
    private String imageUrl;
    private Boolean isThumbnail;
    private String createdAt;
}