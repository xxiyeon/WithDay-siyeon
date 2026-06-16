package com.test.withdayback.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("DetailScheduleRequest")
public class DetailScheduleRequestDTO {
    private Integer dayNumber;
    private String title;
    private String description;
}
