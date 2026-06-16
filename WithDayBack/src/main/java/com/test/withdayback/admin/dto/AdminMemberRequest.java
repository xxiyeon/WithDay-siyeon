package com.test.withdayback.admin.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AdminMemberRequest {
    private String keyword;
    private String gender;
    private String provider;
    private String status;
    private int page;
    private int size;
    public int getOffset() {
        return page * size;
    }
}