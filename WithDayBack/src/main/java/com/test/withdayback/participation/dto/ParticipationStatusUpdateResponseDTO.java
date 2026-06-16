package com.test.withdayback.participation.dto;

import com.test.withdayback.participation.enums.ParticipationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

import java.time.OffsetDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ParticipationStatusUpdateResponse")
public class ParticipationStatusUpdateResponseDTO {
    /*
     * 호스트의 승인/거절/승인취소 처리 결과 응답이다.
     * participation 상태뿐 아니라 변경 후 일정 인원 수를 함께 내려줘 프론트가 최신 화면을 만들 수 있게 한다.
     */

    // 상태가 변경된 participation row의 PK다.
    private Long participationId;

    // 변경 대상 일정의 PK다.
    private Long scheduleId;

    // 변경 후 참여 상태다.
    private ParticipationStatus status;

    // 승인/승인취소 후 최신 확정 인원 수다.
    private Integer currentParticipants;

    // 일정의 최대 정원이다. 프론트가 "현재/최대" 형태로 보여줄 때 사용한다.
    private Integer maxParticipants;

    // 상태 변경 완료 시각이다. KST 기준 OffsetDateTime으로 생성한다.
    private OffsetDateTime updatedAt;
}
