package com.test.withdayback.admin.dto;

import com.test.withdayback.admin.vo.AdminSchedule;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AdminScheduleResponse {

    private List<AdminSchedule> scheduleList;

    private int totalCount;

    private int totalPage;

    private int page;

    private int size;
}
