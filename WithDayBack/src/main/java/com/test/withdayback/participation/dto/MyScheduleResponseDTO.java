package com.test.withdayback.participation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

import java.time.LocalDate;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("MyScheduleResponse")
public class MyScheduleResponseDTO {
    /*
     * 내 일정 화면 카드에 필요한 데이터를 한 번에 내려주는 응답 DTO다.
     * 참여한 일정과 내가 만든 일정을 같은 카드 컴포넌트로 그리기 위해 schedule 정보, participation 정보, host 여부를 함께 담는다.
     */

    // 일정 PK다. 프론트는 이 값으로 상세 페이지(/schedule/:id)로 이동한다.
    private Long scheduleId;

    // 참여 정보 PK다. 신청 취소/삭제 API는 scheduleId가 아니라 participationId를 기준으로 동작한다.
    private Long participationId;

    // 카드에 표시할 일정 기본 정보다.
    private String category;
    private String title;
    private String location;
    private String thumbnail;

    // D-Day, 일정 기간, 모집 마감일 계산에 쓰이는 날짜 정보다.
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate recruitEndDate;

    // 현재 확정 인원과 최대 정원이다. 승인 처리 후 카드 인원 표시와 정원 마감 판단에 사용된다.
    private Integer currentPeople;
    private Integer maxPeople;

    // 참여 상태다. Mapper에서 대문자 canonical 값(PENDING, APPROVED 등)으로 보정해서 내려준다.
    private String dbStatus;

    // 일정 자체의 상태다. 참여 상태와 별개로 모집중/마감/취소/종료 여부를 표시할 때 쓴다.
    private String scheduleStatus;

    // 이 카드가 내가 만든 일정인지 구분한다. host=true이면 취소/삭제 대신 상세 관리 화면으로 이동한다.
    private Boolean host;

    // 화면과 필터링에서 내 역할을 더 명확히 구분하기 위한 값이다. host / participant 로 내려준다.
    private String myRole;
}
