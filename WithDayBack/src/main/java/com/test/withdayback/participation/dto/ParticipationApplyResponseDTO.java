package com.test.withdayback.participation.dto;

import com.test.withdayback.participation.enums.ParticipationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ParticipationApplyResponse")
public class ParticipationApplyResponseDTO {
    /*
     * 참여 신청 성공 응답이다.
     * 프론트는 성공 토스트를 보여준 뒤 schedule-detail 캐시를 다시 불러와 버튼 상태를 "신청 완료"로 갱신한다.
     */

    // 새로 생성된 participation row의 PK다.
    private Long participationId;

    // 신청한 일정의 PK다. 프론트 캐시 무효화 기준으로도 사용된다.
    private Long scheduleId;

    // 신청한 사용자 email이다. 요청 사용자와 응답 사용자를 확인하기 위한 값이다.
    private String email;

    // 신청 직후 상태는 호스트 승인을 기다리는 PENDING이다.
    private ParticipationStatus status;

    // 사용자에게 보여줄 신청 완료 메시지다.
    private String message;
}
