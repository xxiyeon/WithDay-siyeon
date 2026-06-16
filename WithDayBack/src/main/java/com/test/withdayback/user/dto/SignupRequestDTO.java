package com.test.withdayback.user.dto;

import com.test.withdayback.user.vo.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SignupRequestDTO {
    private User user;
    private Map<String, Boolean> terms;
    private List<Long> interests;
}