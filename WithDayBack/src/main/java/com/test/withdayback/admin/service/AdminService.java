package com.test.withdayback.admin.service;

import com.test.withdayback.admin.dao.AdminDao;
import com.test.withdayback.admin.dto.AdminDashboardResponse;
import com.test.withdayback.admin.dto.AdminInterestRequest;
import com.test.withdayback.admin.dto.AdminMemberRequest;
import com.test.withdayback.admin.dto.AdminMemberResponse;
import com.test.withdayback.admin.dto.AdminTermsRequest;
import com.test.withdayback.admin.dto.*;
import com.test.withdayback.admin.vo.AdminSchedule;
import com.test.withdayback.admin.vo.Dashboard;
import com.test.withdayback.user.vo.Interest;
import com.test.withdayback.user.vo.Terms;
import com.test.withdayback.user.vo.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

// @Service: 관리자 기능의 비즈니스 로직을 처리하는 클래스
@Service
public class AdminService {

    @Autowired
    private AdminDao adminDao;

    public AdminMemberResponse selectAllMember(AdminMemberRequest dto) {

        List<User> memberList = adminDao.selectAllMember(dto);

        int totalCount = adminDao.selectMemberCount(dto);

        int totalPage = (int) Math.ceil(
                (double) totalCount / dto.getSize()
        );

        AdminMemberResponse response = new AdminMemberResponse();

        response.setMemberList(memberList);
        response.setTotalCount(totalCount);
        response.setTotalPage(totalPage);
        response.setPage(dto.getPage());
        response.setSize(dto.getSize());

        return response;
    }

    public void changeRole(String email) {
        adminDao.changeRole(email);
    }

    public void suspendUser(String email) {
        adminDao.suspendUser(email);
    }

    public void releaseUser(String email) {
        adminDao.releaseUser(email);
    }

    public AdminDashboardResponse getDashboardData(String period) {
        AdminDashboardResponse response = new AdminDashboardResponse();

        Integer totalUserCount = adminDao.selectTotalUserCount();
        response.setTotalUserCount(
                totalUserCount == null ? 0 : totalUserCount);
        response.setNowTotalUserCount(adminDao.selectUserCount());

        Integer totalScheduleCount = adminDao.selectTotalScheduleCount();
        response.setTotalScheduleCount(
                totalScheduleCount == null ? 0 : totalScheduleCount);
        response.setNowTotalScheduleCount(adminDao.selectScheduleCount());

        response.setRecommendedScheduleCount(
                adminDao.selectRecommendedScheduleCount());

        response.setCompletedScheduleCount(
                adminDao.selectCompletedScheduleCount());

        response.setClosedScheduleCount(
                adminDao.selectClosedScheduleCount());

        List<Dashboard> dashboardList;

        switch (period) {
            case "weekly":
                dashboardList = adminDao.selectWeeklyDashboard();
                break;

            case "monthly":
                dashboardList = adminDao.selectMonthlyDashboard();
                break;

            default:
                dashboardList = adminDao.selectDailyDashboard();
                break;
        }

        response.setDashboardList(dashboardList);

        return response;
    }

    // 약관 목록 조회
    // 관리자 수정 화면에서는 terms.id가 필요하므로 관리자 전용 조회를 사용함.
    public List<Terms> selectAllTerms() {
        return adminDao.selectAllTerms();
    }

    // 약관 수정
    // 약관 추가/삭제는 하지 않고, 기존 약관의 version/content만 수정함.
    @Transactional
    public String updateTerms(Long id, AdminTermsRequest request) {
        if (id == null || id <= 0) {
            throw new RuntimeException("유효하지 않은 약관입니다.");
        }

        if (request.getVersion() == null || request.getVersion().trim().isEmpty()) {
            throw new RuntimeException("약관 버전을 입력해주세요.");
        }

        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new RuntimeException("약관 내용을 입력해주세요.");
        }

        int count = adminDao.selectTermsCountById(id);

        if (count == 0) {
            throw new RuntimeException("존재하지 않는 약관입니다.");
        }

        adminDao.updateTerms(id, request);

        return "success";
    }

    // 관심사 목록 조회
    public List<Interest> selectAllInterests() {
        return adminDao.selectAllInterests();
    }

    // 관심사 추가
    @Transactional
    public String insertInterest(AdminInterestRequest request) {
        validateInterestRequest(request);

        int duplicateCount = adminDao.selectInterestCountByName(request.getInterestName());

        if (duplicateCount > 0) {
            throw new RuntimeException("이미 존재하는 관심사입니다.");
        }

        adminDao.insertInterest(request);

        return "success";
    }

    // 관심사 수정
    @Transactional
    public String updateInterest(Long id, AdminInterestRequest request) {
        if (id == null || id <= 0) {
            throw new RuntimeException("유효하지 않은 관심사입니다.");
        }

        validateInterestRequest(request);

        int count = adminDao.selectInterestCountById(id);

        if (count == 0) {
            throw new RuntimeException("존재하지 않는 관심사입니다.");
        }

        int duplicateCount = adminDao.selectInterestCountByNameExceptId(
                request.getInterestName(),
                id
        );

        if (duplicateCount > 0) {
            throw new RuntimeException("이미 존재하는 관심사입니다.");
        }

        adminDao.updateInterest(id, request);

        return "success";
    }

    // 관심사 삭제
    // interests.id를 삭제하면 user_interests의 연결 데이터는 FK ON DELETE CASCADE로 자동 삭제됨.
    @Transactional
    public String deleteInterest(Long id) {
        if (id == null || id <= 0) {
            throw new RuntimeException("유효하지 않은 관심사입니다.");
        }

        int count = adminDao.selectInterestCountById(id);

        if (count == 0) {
            throw new RuntimeException("존재하지 않는 관심사입니다.");
        }

        adminDao.deleteInterest(id);

        return "success";
    }

    // 관심사 추가/수정 공통 검증
    private void validateInterestRequest(AdminInterestRequest request) {
        if (request.getInterestName() == null || request.getInterestName().trim().isEmpty()) {
            throw new RuntimeException("관심사 이름을 입력해주세요.");
        }

        if (request.getInterestName().trim().length() > 50) {
            throw new RuntimeException("관심사 이름은 50자 이하로 입력해주세요.");
        }
    }

    public Map<String, Object> selectAllSchedule(String keyword, String region, String detailRegion, String status, int page, int size) {
        AdminScheduleRequest request = new AdminScheduleRequest();

        request.setKeyword(keyword);
        request.setRegion(region);
        request.setDetailRegion(detailRegion);
        request.setStatus(status);
        request.setPage(page);
        request.setSize(size);

        // 목록 조회
        List<AdminSchedule> scheduleList =
                adminDao.selectAllSchedule(request);

        // 전체 개수 조회
        int totalCount =
                adminDao.selectAllScheduleCount(request);

        int totalPage =
                (int) Math.ceil((double) totalCount / size);

        AdminScheduleResponse response =
                new AdminScheduleResponse();

        response.setScheduleList(scheduleList);
        response.setTotalCount(totalCount);
        response.setTotalPage(totalPage);
        response.setPage(page);
        response.setSize(size);

        Map<String, Object> result = new HashMap<>();

        result.put("scheduleList", response.getScheduleList());
        result.put("totalCount", response.getTotalCount());
        result.put("totalPage", response.getTotalPage());
        result.put("page", response.getPage());
        result.put("size", response.getSize());

        return result;
    }

    @Transactional
    public int updateSchedulePublic(Long scheduleId) {
        return adminDao.updateSchedulePublic(scheduleId);
    }

    @Transactional
    public int deleteSchedule(Long scheduleId) {
        return adminDao.deleteSchedule(scheduleId);
    }
}