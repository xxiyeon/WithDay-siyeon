package com.test.withdayback.schedule.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ScheduleImage")
public class ScheduleImage {
    private Long id;
    private Long scheduleId;
    private String imageUrl;
    private Integer isThumbnail;
    private String createdAt;
}
