package com.test.withdayback.participation.controller;

import com.test.withdayback.participation.dto.MyScheduleResponseDTO;
import com.test.withdayback.participation.dto.ParticipationApplicantDTO;
import com.test.withdayback.participation.dto.ParticipationApplyResponseDTO;
import com.test.withdayback.participation.dto.ParticipationStatusUpdateRequestDTO;
import com.test.withdayback.participation.dto.ParticipationStatusUpdateResponseDTO;
import com.test.withdayback.participation.dto.ParticipationRequestDTO;
import com.test.withdayback.participation.service.ParticipationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/participations")
public class ParticipationController {

    @Autowired
    private ParticipationService participationService;

    /**
     * 내 참여/신청 일정 조회 (내 일정 페이지의 참여중 / 신청중 탭)
     *
     * 프론트는 탭에 따라 조회해야 하는 참여 상태 목록을 쿼리 파라미터로 넘긴다.
     * 예를 들어 "참여중" 탭은 APPROVED,KICKED를, "신청중" 탭은 PENDING만 요청한다.
     * 상태 필터를 컨트롤러에서 직접 해석하지 않고 Service로 넘기는 이유는,
     * DB에 저장된 소문자 상태값과 프론트에서 쓰는 대문자 상태값 보정 규칙을 한 레이어에서 관리하기 위해서다.
     *
     * 프론트엔드 호출 예시: /participations/me?email=user@test.com&statuses=APPROVED,KICKED
     */
    @GetMapping("/me")
    public ResponseEntity<List<MyScheduleResponseDTO>> getMyParticipations(
            @RequestParam String email,
            @RequestParam List<String> statuses) {

        System.out.printf("내 참여 일정 조회 요청 - email: %s, statuses: %s\n", email, statuses);
        List<MyScheduleResponseDTO> result = participationService.getMyParticipations(email, statuses);
        return ResponseEntity.ok(result);
    }

    /**
     * 내가 만든 일정 조회 (내 일정 페이지의 호스팅 탭)
     *
     * participation 테이블이 아니라 schedule 테이블의 host(user_id)를 기준으로 조회한다.
     * 그래서 응답의 participationId는 null일 수 있고, 프론트는 host=true 값을 보고 상세 페이지로 이동만 처리한다.
     */
    @GetMapping("/me/hosting")
    public ResponseEntity<List<MyScheduleResponseDTO>> getMyHostingSchedules(
            @RequestParam String email) {

        System.out.printf("내가 만든 일정 조회 요청 - email: %s\n", email);
        List<MyScheduleResponseDTO> result = participationService.getMyHostingSchedules(email);
        return ResponseEntity.ok(result);
    }

    /**
     * 일정별 신청자 목록 (호스트 전용)
     *
     * 일정 상세 페이지에서 호스트가 신청자를 승인/거절할 때 사용하는 목록이다.
     * email은 "요청자가 정말 이 일정의 호스트인지" 확인하기 위한 값이며,
     * status는 PENDING, APPROVED 같은 탭 필터로 사용된다.
     * 권한 검증은 Service에서 일정 소유자와 요청 사용자 정보를 함께 조회해서 수행한다.
     */
    @GetMapping("/schedules/{scheduleId}/applicants")
    public ResponseEntity<List<ParticipationApplicantDTO>> getScheduleApplicants(
            @PathVariable Long scheduleId,
            @RequestParam String email,
            @RequestParam(required = false) String status) {

        List<ParticipationApplicantDTO> result =
                participationService.getScheduleApplicants(scheduleId, email, status);
        return ResponseEntity.ok(result);
    }

    /**
     * 참여 신청 취소
     *
     * 사용자가 본인 참여를 취소할 때 호출한다.
     * DB row를 삭제하지 않고 status를 CANCELED(canceled)로 바꾸는 이유는,
     * 사용자 자발 취소 이력을 KICKED와 구분해 보존하기 위해서다.
     * 실제 허용 상태(PENDING/APPROVED)와 인원 수 조정은 Service에서 검증한다.
     */
    @PatchMapping("/{participationId}/cancel")
    public ResponseEntity<?> cancelParticipation(
            @PathVariable Long participationId,
            @RequestParam String email) {
        participationService.cancelParticipation(participationId, email);

        return ResponseEntity.ok().build();
    }

    /**
     * 거절/강퇴된 참여 내역 삭제
     *
     * 이 API는 참여 자체를 취소하는 기능이 아니라 내 일정 화면에서 불필요한 내역을 숨기기 위한 삭제 기능이다.
     * Mapper에서 REJECTED, KICKED 상태만 삭제하도록 제한하여 승인 대기/승인 완료 내역이 잘못 지워지지 않게 한다.
     */
    @DeleteMapping("/{participationId}")
    public ResponseEntity<?> deleteParticipation(
            @PathVariable Long participationId,
            @RequestParam String email) {

        boolean deleted = participationService.deleteParticipation(participationId, email);
        if (!deleted) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("삭제할 참여 정보를 찾을 수 없습니다.");
        }

        return ResponseEntity.ok().build();
    }

    /**
     * 일정 참여 신청 (사용자)
     *
     * 사용자가 "참여 신청하기" 버튼을 누르면 프론트가 scheduleId와 email을 body로 보낸다.
     * Controller는 요청을 얇게 받아 Service에 위임하고, Service가 일정 상태/마감/정원/중복 신청을 모두 검증한다.
     * 생성 성공 시 REST 관점에서 새 participation row가 만들어졌으므로 201 Created를 반환한다.
     */
    @PostMapping
    public ResponseEntity<ParticipationApplyResponseDTO> applySchedule(@RequestBody ParticipationRequestDTO dto) {
        ParticipationApplyResponseDTO result = participationService.applySchedule(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * 참여 상태 변경 (호스트 전용)
     *
     * 호스트가 신청자를 승인(APPROVED)하거나 거절(REJECTED), 강퇴(KICKED)할 때 호출한다.
     * 승인 시에는 participation.status 변경뿐 아니라 schedule.current_participants 증가와
     * 정원 도달 시 schedule.status 자동 마감 처리가 이어지고,
     * 강퇴 시에는 current_participants 감소와 재오픈 판단이 이어지므로 Service에서 트랜잭션으로 묶는다.
     *
     * Body 예시: { "email": "host@test.com", "status": "KICKED", "reason": "운영 정책 위반" }
     */
    @PatchMapping("/{participationId}/status")
    public ResponseEntity<ParticipationStatusUpdateResponseDTO> updateParticipationStatus(
            @PathVariable Long participationId,
            @RequestBody ParticipationStatusUpdateRequestDTO dto) {

        ParticipationStatusUpdateResponseDTO result =
                participationService.updateParticipationStatus(participationId, dto);
        return ResponseEntity.ok(result);
    }
}
