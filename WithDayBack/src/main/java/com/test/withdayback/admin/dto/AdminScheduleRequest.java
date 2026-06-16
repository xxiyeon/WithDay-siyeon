package com.test.withdayback.admin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminScheduleRequest {

    private String keyword;

    private String region;

    private String detailRegion;

    private String status;

    private int page;

    private int size;

    public int getOffset() {
        return page * size;
    }
}