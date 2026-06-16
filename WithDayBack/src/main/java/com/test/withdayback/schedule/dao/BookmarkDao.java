package com.test.withdayback.schedule.dao;

import com.test.withdayback.schedule.vo.Schedule;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface BookmarkDao {

    /*
     * 북마크 존재 여부는 토글 멱등성과 상세 단건 상태 조회의 공통 기반이다.
     * insert 전에 한 번 확인해 사용자에게 "이미 저장됨"을 오류로 보이지 않게 하고,
     * 동시에 DB unique 제약이 최종 정합성까지 보장한다.
     */
    boolean existsBookmark(
            @Param("userId") Long userId,
            @Param("scheduleId") Long scheduleId
    );

    int insertBookmark(
            @Param("userId") Long userId,
            @Param("scheduleId") Long scheduleId
    );

    int deleteBookmark(
            @Param("userId") Long userId,
            @Param("scheduleId") Long scheduleId
    );

    /*
     * 위시리스트 화면은 bookmark.created_at 기준 최신순 정렬이 필요하다.
     * 그래서 bookmark를 driving table로 두고 schedule을 조인하는 전용 목록 쿼리를 분리한다.
     */
    List<Schedule> selectBookmarkedSchedules(@Param("userId") Long userId);
}
