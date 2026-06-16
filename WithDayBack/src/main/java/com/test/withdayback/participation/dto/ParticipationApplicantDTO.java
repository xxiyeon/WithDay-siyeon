package com.test.withdayback.participation.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.test.withdayback.participation.enums.ParticipationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ParticipationApplicant")
public class ParticipationApplicantDTO {
    /*
     * 호스트가 일정 상세 페이지에서 신청자 목록을 볼 때 사용하는 응답 DTO다.
     * 참여 상태 변경 API는 participationId를 기준으로 호출하므로, 사용자 정보와 함께 participationId를 반드시 내려준다.
     */

    // 상태 변경 대상이 되는 participation row의 PK다.
    private Long participationId;

    // 어느 일정에 대한 신청인지 식별한다. 캐시 무효화와 화면 갱신 기준으로 쓰인다.
    private Long scheduleId;

    // 신청한 사용자의 기본 식별 정보다. 호스트 화면에는 email/nickname과 프로필 이미지를 표시한다.
    private Long userId;
    private String email;
    private String nickname;
    private String profileImage;

    // 호스트가 신청자와 실제 모임 조율을 할 때 필요한 연락/조건 정보다.
    private String phone;
    private Integer gender;
    private Integer fullAge;

    /*
     * 만 나이 계산용 원본 값이다.
     * 호스트 화면에는 fullAge만 필요하므로 생년월일 원본은 JSON 응답에서 제외한다.
     */
    @JsonIgnore
    private String birthday;

    // PENDING, APPROVED, REJECTED, CANCELED, KICKED 등 현재 신청 상태다.
    private ParticipationStatus status;

    // 신청 생성 시각이다. 정렬과 호스트 판단 보조 정보로 사용한다.
    private String createdAt;
}
