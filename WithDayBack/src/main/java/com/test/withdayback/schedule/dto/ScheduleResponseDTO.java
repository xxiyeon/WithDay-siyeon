package com.test.withdayback.schedule.dto;

import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.schedule.vo.ScheduleDetail;
import com.test.withdayback.schedule.vo.ScheduleImage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ScheduleResponse")
public class ScheduleResponseDTO {
    /*
     * 일정 상세 API 응답 DTO다.
     * 상세 화면은 schedule 기본 정보뿐 아니라 세부 일정, 이미지, 현재 사용자 기준 권한 정보를 함께 필요로 한다.
     * 여러 테이블 조회 결과를 하나로 묶어 내려주면 프론트는 상세 진입 시 여러 API를 순차 호출하지 않아도 된다.
     */

    // 일정 작성자 email이다. 프론트/서비스에서 호스트 판별 기준으로 사용한다.
    private String email;

    // 자주 쓰는 날짜/조건 값을 최상위에도 노출해 프론트가 schedule 내부 구조에 덜 의존하게 한다.
    private String startDate;
    private String endDate;
    private String recruitEndDate;
    private String genderLimit;
    private String costType;
    private Boolean isBookmarked;

    // 현재 viewer 기준 권한/참여 상태다. 참여 버튼과 오픈채팅 링크 노출 여부를 결정한다.
    private Boolean viewerIsHost;
    private Boolean viewerIsAdmin;
    private Long viewerParticipationId;
    private String viewerParticipationStatus;
    private Boolean viewerCanAccessChatLink;
    private Boolean hiddenFromPublic;

    // 상세 화면의 핵심 데이터 묶음이다.
    private HostSummary host;
    private Schedule schedule;
    private List<ScheduleDetail> details;
    private List<ScheduleImage> images;

    @NoArgsConstructor
    @AllArgsConstructor
    @Data
    public static class HostSummary {
        private Long userId;
        private String nickname;
        private String profileImage;
    }

    /*
     * Service에서 schedule/detail/image 조회 결과를 받아 상세 응답 기본형을 만든다.
     * enum 값은 프론트가 문자열로 다루기 쉬우도록 name()으로 변환하고,
     * viewer 관련 값은 이후 Service가 viewerEmail을 기준으로 다시 채운다.
     */
    public ScheduleResponseDTO(String email, Schedule schedule, List<ScheduleDetail> details, List<ScheduleImage> images) {
        this.email = email;
        this.schedule = schedule;
        this.details = details;
        this.images = images;
        this.startDate = schedule != null ? schedule.getStartDate() : null;
        this.endDate = schedule != null ? schedule.getEndDate() : null;
        this.recruitEndDate = schedule != null ? schedule.getRecruitEndDate() : null;
        this.genderLimit = schedule != null && schedule.getGenderLimit() != null
                ? schedule.getGenderLimit().name()
                : null;
        this.costType = schedule != null && schedule.getCostType() != null
                ? schedule.getCostType().name()
                : null;
        this.isBookmarked = schedule != null ? schedule.getIsBookmarked() : Boolean.FALSE;
        this.viewerIsHost = false;
        this.viewerIsAdmin = false;
        this.viewerParticipationId = null;
        this.viewerCanAccessChatLink = false;
        this.hiddenFromPublic = schedule != null && Integer.valueOf(0).equals(schedule.getIsPublic());
    }
}
