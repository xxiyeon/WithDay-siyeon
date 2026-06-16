package com.test.withdayback.admin.dao;

import com.test.withdayback.admin.dto.AdminInterestRequest;
import com.test.withdayback.admin.dto.AdminMemberRequest;
import com.test.withdayback.admin.dto.AdminTermsRequest;
import com.test.withdayback.admin.dto.AdminScheduleRequest;
import com.test.withdayback.admin.vo.AdminSchedule;
import com.test.withdayback.admin.vo.Dashboard;
import com.test.withdayback.user.vo.Interest;
import com.test.withdayback.user.vo.Terms;
import com.test.withdayback.user.vo.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface AdminDao {

    List<User> selectAllMember(AdminMemberRequest dto);

    int selectMemberCount(AdminMemberRequest dto);

    void changeRole(String email);

    void suspendUser(String email);

    void releaseUser(String email);

    int selectUserCount();

    int selectScheduleCount();

    void insertDashboard(LocalDate statDate, int userCount, int scheduleCount);

    int selectTotalUserCount();

    int selectTotalScheduleCount();

    int selectRecommendedScheduleCount();

    int selectCompletedScheduleCount();

    int selectClosedScheduleCount();

    List<Dashboard> selectDashboardList();

    List<Dashboard> selectDailyDashboard();

    List<Dashboard> selectWeeklyDashboard();

    List<Dashboard> selectMonthlyDashboard();

    // 약관 목록 조회
    List<Terms> selectAllTerms();

    // 약관 존재 여부 확인
    int selectTermsCountById(Long id);

    // 약관 수정
    void updateTerms(
            @Param("id") Long id,
            @Param("request") AdminTermsRequest request
    );

    // 관심사 목록 조회
    List<Interest> selectAllInterests();

    // 관심사 존재 여부 확인
    int selectInterestCountById(Long id);

    // 관심사 이름 중복 확인
    int selectInterestCountByName(String interestName);

    // 관심사 수정 시 자기 자신을 제외한 이름 중복 확인
    int selectInterestCountByNameExceptId(
            @Param("interestName") String interestName,
            @Param("id") Long id
    );

    // 관심사 추가
    void insertInterest(AdminInterestRequest request);

    // 관심사 수정
    void updateInterest(
            @Param("id") Long id,
            @Param("request") AdminInterestRequest request
    );

    // 관심사 삭제
    void deleteInterest(Long id);
    List<AdminSchedule> selectAllSchedule(AdminScheduleRequest request);

    int selectAllScheduleCount(AdminScheduleRequest request);

    int updateSchedulePublic(Long scheduleId);

    int deleteSchedule(Long scheduleId);

}