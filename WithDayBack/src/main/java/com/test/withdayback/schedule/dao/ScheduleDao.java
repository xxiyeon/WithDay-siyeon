package com.test.withdayback.schedule.dao;

import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.schedule.vo.ScheduleDetail;
import com.test.withdayback.schedule.vo.ScheduleImage;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ScheduleDao {
    /*
     * schedule-mapper.xml과 연결되는 일정 DB 접근 인터페이스다.
     * 홈/탐색 리스트, 상세 조회, 조회수 증가, 참여 승인 시 인원 수 변경 같은 schedule 관련 SQL을 담당한다.
     */

    // 상세 페이지의 기본 일정 정보를 조회한다. 삭제된 일정은 mapper에서 제외한다.
    Schedule selectScheduleById(Long id);

    /*
     * 상세 페이지는 게스트/로그인 사용자에 따라 북마크 상태가 달라질 수 있다.
     * 그래서 상세 read path는 "일정 자체"와 "현재 viewer의 저장 여부"를 한 번에 읽는 전용 메서드를 분리한다.
     */
    Schedule selectScheduleByIdForViewer(
            @Param("id") Long id,
            @Param("email") String email
    );

    // 상세 페이지의 Day-by-Day 계획을 조회한다.
    List<ScheduleDetail> selectDetailsByScheduleId(Long id);

    // 상세 페이지 이미지 슬라이더에 사용할 이미지 목록을 조회한다.
    List<ScheduleImage> selectImageByScheduleId(Long id);

    /**
     * 조회수는 읽기-수정-쓰기 방식으로 처리하면 동시 요청에서 값이 유실될 수 있다.
     * 그래서 DB가 직접 원자적으로 +1 하도록 update 쿼리 한 번으로 처리한다.
     *
     * @param scheduleId 조회수를 증가시킬 일정 ID
     * @return 실제로 갱신된 행 수. 0이면 존재하지 않거나 삭제된 일정이다.
     */
    int increaseViewCount(@Param("scheduleId") Long scheduleId);

    int increaseCurrentParticipants(@Param("scheduleId") Long scheduleId);

    int decreaseCurrentParticipants(@Param("scheduleId") Long scheduleId);

    int closeScheduleWhenFull(@Param("scheduleId") Long scheduleId);

    int reopenScheduleWhenSlotAvailable(@Param("scheduleId") Long scheduleId);

    int completeSchedule(
            @Param("scheduleId") Long scheduleId,
            @Param("currentStatus") String currentStatus
    );

    int rollbackCompletedSchedule(
            @Param("scheduleId") Long scheduleId,
            @Param("targetStatus") String targetStatus
    );

    int cancelSchedule(@Param("scheduleId") Long scheduleId);

    /*
     * 홈/탐색 탭의 일정 리스트 조회다.
     * 탐색 필터는 모두 선택 조건이라 null/빈 문자열일 때는 mapper에서 조건을 붙이지 않는다.
     * sort는 Service에서 허용 값으로 normalize된 값만 들어온다.
     */
    List<Schedule> getAllSchedules(
            @Param("category") String category,
            @Param("keyword") String keyword,
            @Param("region") String region,
            @Param("district") String district,
            @Param("genderLimit") String genderLimit,
            @Param("startDate") String startDate,
            @Param("endDate") String endDate,
            @Param("sort") String sort,
            @Param("viewerUserId") Long viewerUserId,
            @Param("viewerIsAdmin") boolean viewerIsAdmin,
            @Param("email") String email);
            
    void insertSchedule(Schedule schedule);

    void insertScheduleDetail(ScheduleDetail detail);

    void insertScheduleImage(
            @Param("scheduleId") Long scheduleId,
            @Param("imageUrls") List<String> imageUrls
    );

    // 상세 응답에서 현재 사용자가 호스트인지 판단하기 위해 일정 작성자의 email을 찾는다.
    String getEmailByScheduleId(Long id);

    void updateSchedule(Schedule schedule);

    void deleteScheduleDetail(Long scheduleId);

    void deleteScheduleImages(@Param("deletedImageIds") List<Long> deletedImageIds);

    int deleteSchedule(Long scheduleId);

    void updateThumbnail(Long scheduleId, String url);

    int getScheduleImageCount(Long scheduleId);

    String getThumbnailImageUrl(Long scheduleId);

    void updateScheduleImage(Long scheduleId, List<String> imageUrls);

    int closeExpiredSchedules();

    List<Schedule> selectMyScheduleCards(@Param("userId") Long userId);
}
