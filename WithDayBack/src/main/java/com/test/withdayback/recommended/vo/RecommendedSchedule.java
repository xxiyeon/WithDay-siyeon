package com.test.withdayback.recommended.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("RecommendedSchedule")
public class RecommendedSchedule {
    private Long id;
    private Long adminId;
    private String title;
    private String description;
    private String category;
    private String region;
    private String detailRegion;
    private Integer durationDays;
    private Integer minParticipants;
    private Integer maxParticipants;
    private String genderLimit;
    private Integer ageMin;
    private Integer ageMax;
    private BigDecimal totalPrice;
    private String costType;
    private String thumbnailImage;
    private Boolean isActive;
    private String createdAt;
    private String updatedAt;
    private String deletedAt;
}