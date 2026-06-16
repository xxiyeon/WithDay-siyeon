package com.test.withdayback.admin.vo;

import lombok.*;
import org.apache.ibatis.type.Alias;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("DashBoard")
public class Dashboard {
    // 통계 날짜
    private LocalDate statDate;

    // 전체 회원 수
    private int totalUserCount;

    // 전체 일정 수
    private int totalScheduleCount;
}