package com.test.withdayback.user.dto;

import com.test.withdayback.user.vo.Interest;
import com.test.withdayback.schedule.vo.Schedule;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MypageEditResponseDTO {
    // 유저 기본 정보
    private Long userId;
    private String email;
    private String provider; // local이면 비밀번호 변경 폼 노출, google이면 숨김

    private String nickname;
    private String phone;
    private Integer gender; // 1: 남자, 2: 여자
    private String intro;
    private String profileImage;
    private String status;
    // 유저가 선택한 관심사 id 목록
    private List<Long> selectedInterestIds;
    // 전체 관심사 목록
    private List<Interest> allInterests;
    // 알림 설정 여부
    private List<Schedule> mySchedules;

    private Boolean notificationAgreed;

    private String postcode;
    private String address;
    private String detailAddress;

    // 마이페이지 상단
    private Integer togetherScheduleCount; // 함께한 일정 수
    private Integer metWitCount; // 함께 만난 위트 수
    private String createdAt; // 가입일
}
