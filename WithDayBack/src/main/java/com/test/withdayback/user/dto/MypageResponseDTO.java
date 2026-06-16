package com.test.withdayback.user.dto;

import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.user.vo.Interest;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MypageResponseDTO {
    // 공개 프로필 전용 DTO. MyPageMain 재사용에 필요한 읽기 필드만 유지하고 수정용/민감 필드는 담지 않는다.
    private Long userId;

    private String email;
    private String nickname;
    private String profileImage;
    private String intro;
    private String createdAt;
    private String status;
    private Integer gender;
    private Integer togetherScheduleCount;
    private Integer metWitCount;

    // 관심사 렌더러가 "선택된 id 목록 + 전체 관심사 메타"를 함께 기대하므로 공개 프로필도 같은 구조를 유지한다.
    private List<Long> selectedInterestIds;
    private List<Interest> allInterests;
    // log_container 가 바로 map 할 수 있는 completed 일정 카드 목록이다.
    private List<Schedule> mySchedules;
}
