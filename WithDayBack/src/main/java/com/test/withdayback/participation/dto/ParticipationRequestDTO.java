package com.test.withdayback.participation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ParticipationRequest")
public class ParticipationRequestDTO {
    /*
     * 참여 신청 요청 body다.
     * scheduleId는 신청 대상 일정, email은 현재 로그인 사용자를 식별하기 위해 사용한다.
     * 서버는 email을 그대로 신뢰하지 않고 UserDao로 사용자를 다시 조회해 user_id를 확정한다.
     */
    private Long scheduleId;
    private String email;
}
