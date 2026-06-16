package com.test.withdayback.schedule.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ScheduleDetail")
public class ScheduleDetail {
    private Long id;
    private Long scheduleId;
    private Integer dayNumber;
    private String title;
    private String description;
    private String createdAt;
    private String updatedAt;
}
