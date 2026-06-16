package com.test.withdayback.user.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MypageEditRequestDTO {
    private String email;
    private String nickname;
    private String phone;
    private Integer gender;
    private String intro;
    private String profileImage;
    private List<Long> interestIds;
    private Boolean notificationAgreed;
    // 비밀번호 변경용
    private String currentPassword;
    private String newPassword;
    private String newPasswordConfirm;
    // 주소
    private String postcode;
    private String address;
    private String detailAddress;
}
