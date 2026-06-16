package com.test.withdayback.admin.controller;

import com.test.withdayback.admin.dto.AdminInterestRequest;
import com.test.withdayback.admin.dto.AdminMemberRequest;
import com.test.withdayback.admin.dto.AdminTermsRequest;
import com.test.withdayback.admin.service.AdminService;
import com.test.withdayback.schedule.service.ScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// @RestController: 프론트엔드와 JSON 데이터를 주고받기 위한 Controller
// @RequestMapping: 관리자 관련 API는 /admins 주소로 시작
@RestController
@RequestMapping("/admins")
public class AdminController {

    @Autowired
    private AdminService adminService;

    // 회원 조회
    @GetMapping(value = "/members")
    public ResponseEntity<?> selectAllMember(AdminMemberRequest dto) {
        return ResponseEntity.ok(
                adminService.selectAllMember(dto)
        );
    }

    // 관리자 권한 부여
    @PatchMapping("/members/admin/{email}")
    public ResponseEntity<String> changeRole(@PathVariable String email) {
        adminService.changeRole(email);
        return ResponseEntity.ok("관리자로 변경되었습니다.");
    }

    // 회원 정지
    @PatchMapping("/members/suspend/{email}")
    public ResponseEntity<String> suspendUser(@PathVariable String email) {
        adminService.suspendUser(email);
        return ResponseEntity.ok("회원이 정지되었습니다.");
    }

    // 회원 정지 해제
    @PatchMapping("/members/release/{email}")
    public ResponseEntity<String> releaseUser(@PathVariable String email) {
        adminService.releaseUser(email);
        return ResponseEntity.ok("회원 정지가 해제되었습니다.");
    }

    // 대시보드 데이터 조회
    @GetMapping(value = "/dashboards")
    public ResponseEntity<?> getDashboardData(@RequestParam(defaultValue = "daily") String period) {
        return ResponseEntity.ok(adminService.getDashboardData(period));
    }

    // 약관 목록 조회
    // 회원가입에서 사용하는 /users/terms는 그대로 두고,
    // 관리자 화면에서는 id까지 포함된 관리자용 목록을 따로 조회함.
    @GetMapping("/terms")
    public ResponseEntity<?> selectAllTerms() {
        return ResponseEntity.ok(adminService.selectAllTerms());
    }

    // 약관 수정
    // 약관은 회원 동의 이력과 연결되어 있으므로 추가/삭제는 하지 않고,
    // 기존 약관의 version/content만 수정함.
    @PutMapping("/terms/{id}")
    public ResponseEntity<?> updateTerms(
            @PathVariable Long id,
            @RequestBody AdminTermsRequest request
    ) {
        try {
            return ResponseEntity.ok(adminService.updateTerms(id, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 관심사 목록 조회
    @GetMapping("/interests")
    public ResponseEntity<?> selectAllInterests() {
        return ResponseEntity.ok(adminService.selectAllInterests());
    }

    // 관심사 추가
    @PostMapping("/interests")
    public ResponseEntity<?> insertInterest(@RequestBody AdminInterestRequest request) {
        try {
            return ResponseEntity.ok(adminService.insertInterest(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 관심사 수정
    @PutMapping("/interests/{id}")
    public ResponseEntity<?> updateInterest(
            @PathVariable Long id,
            @RequestBody AdminInterestRequest request
    ) {
        try {
            return ResponseEntity.ok(adminService.updateInterest(id, request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 관심사 삭제
    // user_interests 테이블에 ON DELETE CASCADE가 걸려 있으므로,
    // interests row 삭제 시 연결된 user_interests row도 DB가 자동으로 삭제함.
    @DeleteMapping("/interests/{id}")
    public ResponseEntity<?> deleteInterest(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(adminService.deleteInterest(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 일정 조회
    @GetMapping("/schedules")
    public ResponseEntity<?> selectAllSchedule(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String detailRegion,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {

        Map<String, Object> result = adminService.selectAllSchedule(
                keyword,
                region,
                detailRegion,
                status,
                page,
                size
        );

        return ResponseEntity.ok(result);
    }

    // 일정 공개 여부 변경
    @PatchMapping("/schedules/public/{scheduleId}")
    public ResponseEntity<?> updateSchedulePublic(
            @PathVariable Long scheduleId
    ) {
        int result = adminService.updateSchedulePublic(scheduleId);
        return ResponseEntity.ok(result);
    }

    // 일정 삭제
    @DeleteMapping("/schedules/delete/{scheduleId}")
    public ResponseEntity<?> deleteSchedule(
            @PathVariable Long scheduleId
    ) {
        int result = adminService.deleteSchedule(scheduleId);
        return ResponseEntity.ok(result);
    }
}