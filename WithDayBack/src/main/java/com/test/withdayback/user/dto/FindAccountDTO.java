package com.test.withdayback.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FindAccountDTO {
    private String nickname;
    private String phone;

    private String email;
    private String authCode;
    private String newPassword;
}