package com.test.withdayback.participation.vo;

import com.test.withdayback.participation.enums.ParticipationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("Participation")
public class Participation {
    /*
     * participation 테이블과 매핑되는 VO다.
     * 한 row는 "특정 사용자(userId)가 특정 일정(scheduleId)에 어떤 상태(status)로 연결되어 있는지"를 의미한다.
     */

    // participation PK다. 취소/삭제/상태 변경 API의 대상 식별자로 사용한다.
    private Long id;

    // 신청한 사용자 PK다. user.email은 조회/권한 확인에 쓰이고, 실제 저장은 user_id로 한다.
    private Long userId;

    // 신청 대상 일정 PK다.
    private Long scheduleId;

    // 현재 참여 상태다. MyBatis 조회 시 normalizedStatus 결과가 enum으로 매핑된다.
    private ParticipationStatus status;

    // 신청 생성 시각이다. 신청자 목록 정렬과 표시용으로 사용한다.
    private String createdAt;
}
