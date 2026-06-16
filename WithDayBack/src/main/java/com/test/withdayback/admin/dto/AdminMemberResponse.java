package com.test.withdayback.admin.dto;

import com.test.withdayback.user.vo.User;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class AdminMemberResponse {
    private List<User> memberList;
    private int totalCount;
    private int totalPage;
    private int page;
    private int size;
}