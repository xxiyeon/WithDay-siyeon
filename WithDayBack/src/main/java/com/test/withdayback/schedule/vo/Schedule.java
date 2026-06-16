package com.test.withdayback.schedule.vo;

import com.test.withdayback.schedule.enums.CostType;
import com.test.withdayback.schedule.enums.GenderLimit;
import com.test.withdayback.schedule.enums.ScheduleCategory;
import com.test.withdayback.schedule.enums.ScheduleStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("Schedule")
public class Schedule {
    private Long id;
    private Long userId;
    private String title;
    private String description;
    private ScheduleCategory category;
    private String region;
    private String detailRegion;
    private String startDate;
    private String endDate;
    private String recruitStartDate;
    private String recruitEndDate;
    private Integer minParticipants;
    private Integer maxParticipants;
    private Integer currentParticipants;
    private GenderLimit genderLimit;
    private Integer ageMin;
    private Integer ageMax;
    private Integer totalPrice;
    private CostType costType;
    private String chatLink;
    private String thumbnailImage;
    private Integer viewCount;
    private ScheduleStatus status;
    private Integer isPublic;
    private String cancelDeadline;
    private String createdAt;
    private String updatedAt;
    private String deletedAt;
    private Boolean isBookmarked;
}
