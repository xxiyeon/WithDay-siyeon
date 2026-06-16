package com.test.withdayback.schedule.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("Bookmark")
public class Bookmark {
    private Long id;
    private Long userId;
    private Long scheduleId;
    private String createdAt;
}
