package com.test.withdayback.participation.dao;

import com.test.withdayback.participation.dto.MyScheduleResponseDTO;
import com.test.withdayback.participation.dto.ParticipationApplicantDTO;
import com.test.withdayback.participation.vo.Participation;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ParticipationDao {
    /*
     * MyBatis mapper XML과 연결되는 참여 도메인 DB 접근 인터페이스다.
     * Service는 이 인터페이스만 호출하고, 실제 SQL과 상태값 보정은 participation-mapper.xml에서 처리한다.
     */

    // 호스트가 신청자 상태를 변경할 때 대상 participation row와 현재 상태를 확인한다.
    Participation findById(@Param("participationId") Long participationId);

    // 참여 신청 전에 같은 사용자가 같은 일정에 이미 신청한 적이 있는지 확인한다.
    Participation findByEmailAndScheduleId(
            @Param("email") String email,
            @Param("scheduleId") Long scheduleId
    );

    // 신규 참여 신청 row를 저장한다. 저장 직후 생성된 id는 VO의 id 필드로 채워진다.
    int insertParticipation(Participation participation);

    // 호스트 승인/거절/승인취소에서 상태 전이를 DB에 반영한다.
    int updateStatus(
            @Param("participationId") Long participationId,
            @Param("currentStatus") String currentStatus,
            @Param("targetStatus") String targetStatus
    );

    // 일정 상세 페이지에서 호스트가 보는 신청자 목록을 가져온다.
    List<ParticipationApplicantDTO> getScheduleApplicants(
            @Param("scheduleId") Long scheduleId,
            @Param("status") String status
    );

    // 내 일정 페이지의 참여중/신청중 탭 목록을 가져온다.
    List<MyScheduleResponseDTO> getMyParticipations(
            @Param("userId") Long userId,
            @Param("statuses") List<String> statuses
    );

    // 내 일정 페이지의 호스팅 탭 목록을 가져온다.
    List<MyScheduleResponseDTO> getMyHostingSchedules(@Param("userId") Long userId);

    // 사용자가 본인 참여를 CANCELED 상태로 바꿀 때 사용한다.
    int cancelParticipation(
            @Param("participationId") Long participationId,
            @Param("email") String email,
            @Param("currentStatus") String currentStatus,
            @Param("targetStatus") String targetStatus
    );

    // 거절/강퇴된 내역을 내 일정 화면에서 삭제할 때 사용한다.
    int deleteParticipation(
            @Param("participationId") Long participationId,
            @Param("email") String email
    );

    // 일정 상세 조회에서 현재 사용자의 참여 상태를 버튼 라벨/권한 판단용으로 가져온다.
    String findScheduleParticipationStatus(
            @Param("scheduleId") Long scheduleId,
            @Param("email") String email
    );
}
