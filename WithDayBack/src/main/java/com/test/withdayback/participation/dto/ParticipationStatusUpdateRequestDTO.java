package com.test.withdayback.participation.dto;

import com.test.withdayback.participation.enums.ParticipationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ParticipationStatusUpdateRequest")
public class ParticipationStatusUpdateRequestDTO {
    /*
     * 호스트가 신청자 상태를 변경할 때 보내는 요청 body다.
     * email은 액션을 수행하는 호스트를 식별하기 위한 값이고,
     * status는 APPROVED/REJECTED/KICKED 같은 목표 상태다.
     * reason은 현재 UI에서는 빈 값으로 넘어오지만, 추후 거절 사유나 강퇴 사유를 저장할 수 있도록 열어 둔 필드다.
     */
    private String email;
    private ParticipationStatus status;
    private String reason;
}
