package com.test.withdayback.participation.service;

import com.test.withdayback.notification.service.NotificationService;
import com.test.withdayback.participation.dao.ParticipationDao;
import com.test.withdayback.participation.dto.ParticipationApplicantDTO;
import com.test.withdayback.participation.dto.ParticipationApplyResponseDTO;
import com.test.withdayback.participation.dto.ParticipationStatusUpdateRequestDTO;
import com.test.withdayback.participation.dto.ParticipationStatusUpdateResponseDTO;
import com.test.withdayback.participation.dto.ParticipationRequestDTO;
import com.test.withdayback.participation.dto.MyScheduleResponseDTO;
import com.test.withdayback.participation.enums.ParticipationStatus;
import com.test.withdayback.participation.vo.Participation;
import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.schedule.enums.GenderLimit;
import com.test.withdayback.schedule.enums.ScheduleStatus;
import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.user.dao.UserDao;
import com.test.withdayback.user.vo.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.Period;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
public class ParticipationService {
    private static final Logger log = LoggerFactory.getLogger(ParticipationService.class);

    @Autowired
    private ParticipationDao participationDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private ScheduleDao scheduleDao;

    @Autowired
    private NotificationService notificationService;

    /*
     * 내 일정 화면에서 "참여중", "신청중" 탭을 채우는 조회 흐름이다.
     * 프론트는 탭별로 필요한 상태값을 넘기고, Service는 상태값을 서버 표준 enum 이름으로 정규화한 뒤 Mapper에 전달한다.
     * 빈 email 또는 빈 상태 목록이면 DB를 조회하지 않고 빈 배열을 반환하여, 로그인 정보가 비어 있을 때 불필요한 쿼리를 막는다.
     */
    public List<MyScheduleResponseDTO> getMyParticipations(String email, List<String> statuses) {
        String normalizedEmail = normalizeEmail(email);
        List<String> normalizedStatuses = normalizeStatusFilters(statuses);

        if (normalizedEmail.isBlank() || normalizedStatuses.isEmpty()) {
            return List.of();
        }

        Long userId = userDao.findUserIdByEmail(normalizedEmail);
        if (userId == null) {
            return List.of();
        }

        return participationDao.getMyParticipations(userId, normalizedStatuses);
    }

    /*
     * 내가 호스트로 만든 일정 목록을 조회한다.
     * participation row가 없어도 schedule.user_id만으로 보여줘야 하므로 참여 조회와 별도 쿼리를 사용한다.
     */
    public List<MyScheduleResponseDTO> getMyHostingSchedules(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            return List.of();
        }

        Long userId = userDao.findUserIdByEmail(normalizedEmail);
        if (userId == null) {
            return List.of();
        }

        return participationDao.getMyHostingSchedules(userId);
    }

    /*
     * 참여자 본인 취소 흐름이다.
     * PENDING 신청 취소와 APPROVED 참여 취소를 모두 CANCELED로 기록해,
     * "사용자가 스스로 빠졌다"는 의미를 KICKED와 분리한다.
     */
    @Transactional
    public void cancelParticipation(Long participationId, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (participationId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참여 정보가 필요합니다.");
        }

        if (normalizedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 사용자 정보가 필요합니다.");
        }

        Participation participation = participationDao.findById(participationId);
        if (participation == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "취소할 참여 정보를 찾을 수 없습니다.");
        }

        User actor = userDao.findByEmail(normalizedEmail);
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        if (!actor.getId().equals(participation.getUserId())) {
            log.warn("참여자 취소 권한 없음 - participationId: {}, actorId: {}, ownerId: {}",
                    participationId, actor.getId(), participation.getUserId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "본인의 참여만 취소할 수 있습니다.");
        }

        Schedule schedule = scheduleDao.selectScheduleById(participation.getScheduleId());
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정 정보를 찾을 수 없습니다.");
        }

        /*
         * completed는 "일정 완료 처리되어 참여 구성이 잠긴 상태"를 뜻한다.
         * 사용자가 이 시점에 빠질 수 있게 열어 두면 실제 진행 인원과 시스템 인원이 어긋날 수 있으므로 취소를 막는다.
         */
        if (schedule.getStatus() == ScheduleStatus.completed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "일정완료 상태의 일정은 참여 취소할 수 없습니다.");
        }

        if (schedule.getStatus() == ScheduleStatus.canceled) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 일정은 참여 취소할 수 없습니다.");
        }

        if (isScheduleEnded(schedule.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "종료된 일정의 참여는 취소할 수 없습니다.");
        }

        ParticipationStatus currentStatus = participation.getStatus();
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태를 확인할 수 없습니다.");
        }

        if (currentStatus == ParticipationStatus.CANCELED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 취소된 참여입니다.");
        }

        if (currentStatus == ParticipationStatus.KICKED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "강퇴된 참여는 사용자가 취소할 수 없습니다.");
        }

        if (currentStatus == ParticipationStatus.REJECTED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "거절된 신청은 취소할 수 없습니다.");
        }

        boolean canCancelWhileClosed = currentStatus == ParticipationStatus.APPROVED
                && schedule.getStatus() == ScheduleStatus.closed;

        if (schedule.getStatus() != ScheduleStatus.recruiting && !canCancelWhileClosed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "모집 중인 일정만 취소할 수 있습니다.");
        }

        if (!currentStatus.canTransitionTo(ParticipationStatus.CANCELED)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "변경할 수 없는 상태 전이입니다.");
        }

        int updated = participationDao.cancelParticipation(
                participationId,
                normalizedEmail,
                currentStatus.name(),
                ParticipationStatus.CANCELED.getDatabaseValue()
        );
        if (updated <= 0) {
            log.warn("참여 취소 update 충돌 - participationId: {}, currentStatus: {}",
                    participationId, currentStatus);
            throw new ResponseStatusException(HttpStatus.CONFLICT, "참여 취소 처리에 실패했습니다.");
        }

        if (currentStatus == ParticipationStatus.APPROVED) {
            int decreased = scheduleDao.decreaseCurrentParticipants(schedule.getId());
            if (decreased <= 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "정원 수를 조정할 수 없습니다.");
            }

            scheduleDao.reopenScheduleWhenSlotAvailable(schedule.getId());
        }

        log.info("참여자 취소 완료 - participationId: {}, scheduleId: {}, actorId: {}, from: {}, to: {}",
                participationId, schedule.getId(), actor.getId(), currentStatus, ParticipationStatus.CANCELED);
    }

    /*
     * 거절/강퇴된 참여 내역 삭제 흐름이다.
     * 이 기능은 도메인 상태 변경이 아니라 내 일정 화면에서 더 이상 볼 필요 없는 row를 정리하는 용도다.
     * 실제 삭제 가능 상태는 Mapper의 WHERE 조건에서 REJECTED, KICKED로 한 번 더 제한한다.
     */
    public boolean deleteParticipation(Long participationId, String email) {
        if (participationId == null || email == null || email.isBlank()) {
            return false;
        }

        return participationDao.deleteParticipation(participationId, email) > 0;
    }

    @Transactional
    public ParticipationApplyResponseDTO applySchedule(ParticipationRequestDTO dto) {
        /*
         * 참여 신청은 단순 insert가 아니라 여러 도메인 조건을 통과해야 한다.
         * 검증 순서는 "요청값 -> 사용자 -> 일정 -> 일정 상태 -> 중복 신청" 순서로 배치했다.
         * 앞 단계가 실패하면 뒤 단계의 DB 조회나 상태 변경을 하지 않아, 실패 원인을 더 명확히 반환할 수 있다.
         */
        if (dto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "신청 정보가 올바르지 않습니다.");
        }

        Long scheduleId = dto.getScheduleId();
        String email = dto.getEmail() == null ? "" : dto.getEmail().trim();

        if (scheduleId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "일정 정보가 필요합니다.");
        }

        if (email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 사용자 정보가 필요합니다.");
        }

        /*
         * email은 프론트 인증 상태에서 넘어오지만, 서버는 이 값을 그대로 신뢰하지 않고 사용자 테이블에서 다시 조회한다.
         * 존재하지 않는 사용자라면 participation.user_id를 만들 수 없으므로 404로 중단한다.
         */
        User user = userDao.findByEmail(email);
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        /*
         * 참여 신청은 일정이 실제로 존재해야만 가능하다.
         * 이후 검증에서 schedule.status, recruitEndDate, currentParticipants 같은 필드를 사용하므로 먼저 schedule을 확정한다.
         */
        Schedule schedule = scheduleDao.selectScheduleById(scheduleId);
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정 정보를 찾을 수 없습니다.");
        }

        /*
         * schedule.status가 recruiting이 아니면 신청을 받지 않는다.
         * 날짜상 아직 가능해 보여도 운영자가 closed/canceled/completed로 바꾼 상태라면 서버 상태를 우선한다.
         */
        if (schedule.getStatus() != ScheduleStatus.recruiting) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "모집 중인 일정만 신청할 수 있습니다.");
        }

        /*
         * 일정 종료일이 지난 경우에는 모집 상태가 잘못 남아 있더라도 신청을 막는다.
         * 상태 문자열만 믿지 않고 실제 날짜를 함께 보는 이유는 스케줄러나 수동 변경 누락으로 생기는 상태 불일치를 방어하기 위해서다.
         */
        if (isScheduleEnded(schedule.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "종료된 일정에는 신청할 수 없습니다.");
        }

        /*
         * 모집 마감일은 KST 기준 LocalDate로 비교한다.
         * 마감일 당일은 신청 가능하고, 마감일이 오늘보다 이전일 때만 마감으로 본다.
         */
        if (isRecruitmentClosed(schedule.getRecruitEndDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "모집이 마감된 일정입니다.");
        }

        /*
         * 정원 초과는 서버에서 반드시 막아야 한다.
         * 프론트 버튼 상태는 사용성 보조일 뿐이고, 여러 사용자가 동시에 신청할 수 있으므로 최종 판단은 DB 값을 읽은 서버가 한다.
         */
        if (isScheduleFull(schedule)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "정원이 마감된 일정입니다.");
        }

        /*
         * 호스트가 자기 일정에 참여 신청하는 것을 막는다.
         * 호스트는 이미 일정의 주최자로 연결되어 있으므로 participation row를 만들면 권한/목록 해석이 꼬일 수 있다.
         */
        if (schedule.getUserId() != null && schedule.getUserId().longValue() == user.getId()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "호스트는 자신의 일정에 신청할 수 없습니다.");
        }

        validateEligibility(user, schedule);

        /*
         * 같은 사용자가 같은 일정에 과거 신청 이력이 있는지 확인한다.
         * 현재 정책은 중복 row를 계속 쌓기보다, 마지막 상태가 CANCELED일 때만 기존 row를 재사용해 PENDING으로 복구한다.
         * 이렇게 하면 재신청 후에도 같은 participationId를 유지할 수 있고, 상세 화면 취소/재신청 흐름이 단순해진다.
         */
        Participation existing = participationDao.findByEmailAndScheduleId(email, scheduleId);
        if (existing != null && existing.getStatus() != ParticipationStatus.CANCELED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 신청한 일정입니다.");
        }

        Participation participation;

        if (existing != null) {
            int updated = participationDao.updateStatus(
                    existing.getId(),
                    ParticipationStatus.CANCELED.name(),
                    ParticipationStatus.PENDING.getDatabaseValue()
            );
            if (updated <= 0) {
                log.warn("재신청 상태 복구 실패 - participationId: {}, scheduleId: {}", existing.getId(), scheduleId);
                throw new ResponseStatusException(HttpStatus.CONFLICT, "재신청 처리에 실패했습니다.");
            }

            participation = participationDao.findById(existing.getId());
            if (participation == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "재신청 정보를 다시 불러오지 못했습니다.");
            }
        } else {
            /*
             * DB 저장값:
             * - user_id: 신청한 사용자 PK
             * - schedule_id: 신청 대상 일정 PK
             * - status: enum의 databaseValue인 "pending" 저장
             * 신청 직후에는 호스트 승인이 필요하므로 APPROVED가 아니라 PENDING으로 시작한다.
             */
            participation = new Participation();
            participation.setUserId(user.getId());
            participation.setScheduleId(scheduleId);
            participation.setStatus(ParticipationStatus.PENDING);

            /*
             * @Transactional이 필요한 이유:
             * participation insert 이후 알림 전송이나 후속 처리 중 예외가 발생하면, 신청 row만 남고 사용자에게 실패가 보이는 불일치가 생길 수 있다.
             * 이 메서드를 트랜잭션으로 묶어 실패 시 DB 변경을 롤백할 수 있게 한다.
             */
            int inserted = participationDao.insertParticipation(participation);
            if (inserted <= 0 || participation.getId() == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "참여 신청에 실패했습니다.");
            }
        }

        /*
         * 신청이 만들어진 뒤 호스트에게 알림을 보낸다.
         * 알림은 참여 도메인의 부가 동작이지만, 사용자는 신청 성공 후 호스트 승인을 기다리므로 같은 흐름에서 처리한다.
         */
        String senderNickName = userDao.findByEmail(dto.getEmail()).getNickname();
        String receiverEmail = userDao.findById(schedule.getUserId()).getEmail();

        notificationService.notifyApply(
                schedule.getUserId(),   // receiverId
                receiverEmail,  // receiverEmail
                senderNickName,
                schedule.getTitle(),
                scheduleId
        );

        return new ParticipationApplyResponseDTO(
                participation.getId(),
                scheduleId,
                email,
                ParticipationStatus.PENDING,
                existing == null ? "참여 신청이 완료되었습니다." : "참여 신청이 다시 완료되었습니다."
        );
    }

    public List<ParticipationApplicantDTO> getScheduleApplicants(Long scheduleId, String email, String status) {
        /*
         * 호스트의 신청자 관리 목록 조회 흐름이다.
         * scheduleId로 대상 일정을 찾고, email로 요청자를 찾은 뒤, 요청자가 그 일정의 호스트인지 확인한다.
         * 목록 조회도 개인정보(email, nickname)를 포함하므로 권한 검증을 생략하면 안 된다.
         */
        if (scheduleId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "일정 정보가 필요합니다.");
        }

        String normalizedEmail = email == null ? "" : email.trim();
        if (normalizedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 사용자 정보가 필요합니다.");
        }

        User actor = userDao.findByEmail(normalizedEmail);
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        Schedule schedule = scheduleDao.selectScheduleById(scheduleId);
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정 정보를 찾을 수 없습니다.");
        }

        if (schedule.getUserId() == null || schedule.getUserId().longValue() != actor.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "호스트만 신청자 목록을 볼 수 있습니다.");
        }

        String normalizedStatus = normalizeStatusFilter(status);
        List<ParticipationApplicantDTO> applicants =
                participationDao.getScheduleApplicants(scheduleId, normalizedStatus);
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));

        applicants.forEach(applicant ->
                applicant.setFullAge(calculateFullAge(applicant.getBirthday(), today))
        );

        return applicants;
    }

    @Transactional
    public ParticipationStatusUpdateResponseDTO updateParticipationStatus(
            Long participationId,
            ParticipationStatusUpdateRequestDTO dto
    ) {
        /*
         * 호스트가 신청자의 참여 상태를 변경하는 흐름이다.
         * 승인(APPROVED)은 participation.status 변경과 schedule.current_participants 증가가 함께 일어나야 하고,
         * 호스트 강퇴(KICKED)는 인원 감소와 일정 재오픈이 함께 일어날 수 있다.
         * 그래서 중간에 실패하면 전체를 되돌릴 수 있도록 트랜잭션으로 묶는다.
         */
        if (participationId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "참여 정보가 필요합니다.");
        }

        if (dto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "상태 변경 정보가 필요합니다.");
        }

        String email = dto.getEmail() == null ? "" : dto.getEmail().trim();
        if (email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 사용자 정보가 필요합니다.");
        }

        ParticipationStatus targetStatus = dto.getStatus();
        if (targetStatus == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "변경할 상태가 필요합니다.");
        }

        if (targetStatus == ParticipationStatus.CANCELED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "호스트는 취소 상태로 변경할 수 없습니다.");
        }

        /*
         * participation -> schedule -> actor 순서로 조회한다.
         * participation row에서 scheduleId를 얻고, schedule.userId와 actor.id를 비교해야 호스트 권한을 판단할 수 있다.
         */
        Participation participation = participationDao.findById(participationId);
        if (participation == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "참여 정보를 찾을 수 없습니다.");
        }

        Schedule schedule = scheduleDao.selectScheduleById(participation.getScheduleId());
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정 정보를 찾을 수 없습니다.");
        }

        User actor = userDao.findByEmail(email);
        if (actor == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자 정보를 찾을 수 없습니다.");
        }

        if (schedule.getUserId() == null || schedule.getUserId().longValue() != actor.getId()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "호스트만 상태를 변경할 수 있습니다.");
        }

        /*
         * 일정이 완료 처리된 뒤에는 승인/거절/강퇴도 막는다.
         * 완료 이후 참여 상태를 바꾸면 currentParticipants, 채팅 권한, 실제 운영 결과가 뒤늦게 뒤틀릴 수 있기 때문이다.
         */
        if (schedule.getStatus() == ScheduleStatus.completed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "일정완료 상태의 참여 상태는 변경할 수 없습니다.");
        }

        if (schedule.getStatus() == ScheduleStatus.canceled) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 일정의 참여 상태는 변경할 수 없습니다.");
        }

        /*
         * 이미 종료된 일정은 참여 상태를 바꾸지 않는다.
         * 종료 후 승인/거절이 가능하면 실제 일정 운영 결과와 참여 인원 수가 뒤늦게 바뀔 수 있기 때문이다.
         */
        if (isScheduleEnded(schedule.getEndDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "종료된 일정의 참여 상태는 변경할 수 없습니다.");
        }

        ParticipationStatus currentStatus = participation.getStatus();
        if (currentStatus == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "현재 상태를 확인할 수 없습니다.");
        }

        boolean canManageWhileClosed = currentStatus == ParticipationStatus.APPROVED
                && targetStatus == ParticipationStatus.KICKED
                && schedule.getStatus() == ScheduleStatus.closed;

        /*
         * 기본적으로 모집중인 일정만 상태 변경을 허용한다.
         * 단, 정원 도달로 closed가 된 일정에서 이미 승인된 사람을 강퇴하는 경우는 예외로 허용한다.
         * 이 예외가 있어야 강퇴 후 정원 수를 줄이고 일정 재오픈을 할 수 있다.
         */
        if (schedule.getStatus() != ScheduleStatus.recruiting && !canManageWhileClosed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "모집 중인 일정만 상태를 변경할 수 있습니다.");
        }

        /*
         * 상태 전이는 enum에 정의된 규칙과 호스트 전용 정책을 함께 따른다.
         * 호스트 액션에서는 PENDING -> APPROVED/REJECTED, APPROVED -> KICKED만 가능하다.
         * 이미 끝난 상태(REJECTED, CANCELED, KICKED)는 다시 승인하는 식의 역방향 전이를 막는다.
         */
        if (!currentStatus.canTransitionTo(targetStatus)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "변경할 수 없는 상태 전이입니다.");
        }

        if (currentStatus == targetStatus) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 같은 상태입니다.");
        }

        /*
         * 승인할 때는 먼저 schedule.current_participants를 증가시킨다.
         * increaseCurrentParticipants 쿼리는 정원 초과 시 0 row update가 되도록 설계되어 있으므로,
         * 동시 승인 요청이 들어와도 DB update 결과로 정원 초과를 감지할 수 있다.
         */
        if (targetStatus == ParticipationStatus.APPROVED) {
            int increased = scheduleDao.increaseCurrentParticipants(schedule.getId());
            if (increased <= 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "정원이 초과되어 승인할 수 없습니다.");
            }
        }

        /*
         * participation.status를 실제 DB 저장값으로 변경한다.
         * currentStatus 조건을 WHERE에 포함해, 조회 이후 다른 요청이 먼저 상태를 바꾼 경우 update가 실패하도록 한다.
         */
        int updated = participationDao.updateStatus(
                participationId,
                currentStatus.name(),
                targetStatus.getDatabaseValue()
        );
        if (updated <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "상태 변경에 실패했습니다.");
        }

        /*
         * 승인된 참여자를 강퇴하면 확정 인원 수를 되돌려야 한다.
         * participation 상태만 바꾸고 schedule 인원 수를 줄이지 않으면 정원 마감 판단과 화면 인원 표시가 틀어진다.
         */
        if (currentStatus == ParticipationStatus.APPROVED && targetStatus == ParticipationStatus.KICKED) {
            int decreased = scheduleDao.decreaseCurrentParticipants(schedule.getId());
            if (decreased <= 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "정원 수를 조정할 수 없습니다.");
            }
        }

        /*
         * 인원 수 변경 후 최신 schedule을 다시 읽는다.
         * 응답에는 currentParticipants/maxParticipants가 포함되므로, 변경 전 객체를 그대로 쓰면 프론트가 오래된 인원 수를 받을 수 있다.
         */
        Schedule updatedSchedule = scheduleDao.selectScheduleById(schedule.getId());
        if (updatedSchedule == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "일정 정보를 다시 불러오지 못했습니다.");
        }

        /*
         * 승인/거절 결과는 신청자에게 알려야 하므로 상태 변경 성공 후 알림을 보낸다.
         * DB 변경 전에는 알림을 보내지 않는다. 실패한 승인/거절에 대한 알림이 나가면 사용자 경험이 어긋나기 때문이다.
         */
        String senderNickName = userDao.findByEmail(dto.getEmail()).getNickname();
        String receiverEmail = userDao.findById(participation.getUserId()).getEmail();

        if (targetStatus == ParticipationStatus.APPROVED) {
            notificationService.notifyApproved(
                    participation.getUserId(),  // receiverId
                    receiverEmail,  // receiverEmail
                    senderNickName,
                    schedule.getTitle()
            );
        }

        if (targetStatus == ParticipationStatus.REJECTED) {
            notificationService.notifyRejected(
                    participation.getUserId(),  // receiverId
                    receiverEmail,  // receiverEmail
                    senderNickName,
                    schedule.getTitle()
            );
        }

        if (targetStatus == ParticipationStatus.KICKED) {
            notificationService.notifyKick(
                    participation.getUserId(),
                    receiverEmail,
                    senderNickName,
                    schedule.getTitle()
            );
        }

        if (targetStatus == ParticipationStatus.APPROVED) {
            scheduleDao.closeScheduleWhenFull(updatedSchedule.getId());
            updatedSchedule = scheduleDao.selectScheduleById(updatedSchedule.getId());
        } else if (currentStatus == ParticipationStatus.APPROVED
                && targetStatus == ParticipationStatus.KICKED) {
            /*
             * 강퇴로 빈자리가 생긴 경우, closed 상태였던 일정은 다시 recruiting으로 열릴 수 있다.
             * 상태 재계산 후 응답도 최신 schedule 기준으로 내려준다.
             */
            scheduleDao.reopenScheduleWhenSlotAvailable(updatedSchedule.getId());
            updatedSchedule = scheduleDao.selectScheduleById(updatedSchedule.getId());
        }

        log.info("호스트 상태 변경 완료 - participationId: {}, scheduleId: {}, actorId: {}, from: {}, to: {}",
                participationId, updatedSchedule.getId(), actor.getId(), currentStatus, targetStatus);

        return new ParticipationStatusUpdateResponseDTO(
                participationId,
                updatedSchedule.getId(),
                targetStatus,
                updatedSchedule.getCurrentParticipants(),
                updatedSchedule.getMaxParticipants(),
                OffsetDateTime.now(ZoneId.of("Asia/Seoul"))
        );
    }

    private String normalizeStatusFilter(String status) {
        /*
         * 프론트와 DB의 상태 표현을 서버 enum 이름으로 맞춘다.
         * 특히 취소 상태는 DB 저장값이 "canceled"이고 코드 enum은 CANCELED라서,
         * CANCELED/CANCELLED 입력을 모두 CANCELED로 받아준다.
         */
        if (status == null || status.isBlank()) {
            return null;
        }

        try {
            return ParticipationStatus.fromValue(status).name();
        } catch (IllegalArgumentException exception) {
            String normalized = status.trim().toUpperCase(Locale.ROOT);
            if ("CANCELED".equals(normalized) || "CANCELLED".equals(normalized)) {
                return ParticipationStatus.CANCELED.name();
            }
            throw exception;
        }
    }

    private String normalizeEmail(String email) {
        /*
         * 프론트는 로그인 전/초기 렌더에서 email이 빈 값일 수 있다.
         * Service 내부에서는 null과 공백을 같은 "식별자 없음" 상태로 다뤄야 이후 userDao 조회와 권한 검증 오류가 일관된다.
         */
        return email == null ? "" : email.trim();
    }

    private List<String> normalizeStatusFilters(List<String> statuses) {
        /*
         * 여러 탭 상태 필터를 중복 없이 정리한다.
         * 잘못된 상태 문자열은 fromValue에서 예외가 나므로, API 호출자가 허용되지 않은 필터를 보냈다는 사실을 빠르게 드러낸다.
         */
        if (statuses == null || statuses.isEmpty()) {
            return List.of();
        }

        return statuses.stream()
                .map(this::normalizeStatusFilter)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private boolean isScheduleEnded(String endDate) {
        /*
         * 날짜 비교는 서비스 전반에서 KST 기준으로 통일한다.
         * 일정 종료일이 오늘보다 이전이면 이미 끝난 일정으로 보고 신청/상태 변경을 막는다.
         */
        LocalDate parsedEndDate = parseDate(endDate);
        return parsedEndDate != null && parsedEndDate.isBefore(LocalDate.now(ZoneId.of("Asia/Seoul")));
    }

    private boolean isRecruitmentClosed(String recruitEndDate) {
        /*
         * 모집 마감일은 "마감일 당일 23:59까지 가능"한 정책으로 해석한다.
         * 따라서 recruitEndDate가 오늘보다 이전인 경우에만 모집 마감으로 처리한다.
         */
        LocalDate parsedRecruitEndDate = parseDate(recruitEndDate);
        return parsedRecruitEndDate != null
                && parsedRecruitEndDate.isBefore(LocalDate.now(ZoneId.of("Asia/Seoul")));
    }

    private boolean isScheduleFull(Schedule schedule) {
        /*
         * 정원 마감 판단은 currentParticipants >= maxParticipants 기준이다.
         * null 값은 아직 정원 정보가 불완전한 상태로 보고 false를 반환해, 다른 검증에서 필요한 오류를 처리하게 둔다.
         */
        if (schedule == null) {
            return false;
        }

        Integer currentParticipants = schedule.getCurrentParticipants();
        Integer maxParticipants = schedule.getMaxParticipants();

        return currentParticipants != null
                && maxParticipants != null
                && currentParticipants >= maxParticipants;
    }

    private void validateEligibility(User user, Schedule schedule) {
        /*
         * 참여 조건 검증은 성별 -> 나이 순서로 수행한다.
         * 둘 다 사용자 프로필 기반 검증이지만, 실패 메시지가 사용자에게 직접 노출되므로 어떤 조건에서 막혔는지 명확히 구분한다.
         */
        if (!isGenderEligible(user, schedule)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "성별 조건에 맞지 않아 참여할 수 없습니다.");
        }

        if (!isAgeEligible(user, schedule)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "참여 가능 연령이 아닙니다.");
        }
    }

    private boolean isGenderEligible(User user, Schedule schedule) {
        /*
         * GenderLimit.all 또는 null은 성별 제한이 없는 일정으로 본다.
         * 제한이 있는 일정에서 user.gender가 없으면 단순 false가 아니라 프로필 정보 부족으로 신청 자체를 막는다.
         */
        GenderLimit genderLimit = schedule == null ? null : schedule.getGenderLimit();
        if (genderLimit == null || genderLimit == GenderLimit.all) {
            return true;
        }

        Integer userGender = user == null ? null : user.getGender();
        if (userGender == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "성별 정보가 없어 참여할 수 없습니다.");
        }

        if (genderLimit == GenderLimit.male) {
            return userGender == 1;
        }

        if (genderLimit == GenderLimit.female) {
            return userGender == 2;
        }

        return true;
    }

    private boolean isAgeEligible(User user, Schedule schedule) {
        /*
         * ageMin/ageMax가 둘 다 없으면 연령 제한이 없는 일정이다.
         * 제한이 하나라도 있으면 생년월일로 KST 기준 만 나이를 계산해야 하며, 생년월일이 없으면 조건 충족 여부를 판단할 수 없어서 신청을 막는다.
         */
        if (schedule == null) {
            return true;
        }

        Integer ageMin = schedule.getAgeMin();
        Integer ageMax = schedule.getAgeMax();
        if (ageMin == null && ageMax == null) {
            return true;
        }

        Integer age = calculateFullAge(user == null ? null : user.getBirthday(), LocalDate.now(ZoneId.of("Asia/Seoul")));
        if (age == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "생년월일 정보가 없어 참여할 수 없습니다.");
        }

        if (ageMin != null && age < ageMin) {
            return false;
        }

        if (ageMax != null && age > ageMax) {
            return false;
        }

        return true;
    }

    private Integer calculateFullAge(String birthday, LocalDate today) {
        /*
         * 만 나이는 서버에서만 계산하고 생년월일 원본은 응답으로 내보내지 않는다.
         * applicants API에서는 birthday를 mapper가 조회하더라도 DTO의 @JsonIgnore 필드로만 보관하고, 여기서 fullAge로 변환한다.
         */
        LocalDate birthDate = parseBirthday(birthday);
        if (birthDate == null || today == null) {
            return null;
        }

        return Period.between(birthDate, today).getYears();
    }

    private LocalDate parseBirthday(String birthday) {
        /*
         * 기존 user.birthday 저장 형식은 yyyy-MM-dd 문자열을 전제로 한다.
         * 잘못 저장된 생년월일은 개인정보 원본을 화면에 노출하거나 예외 메시지로 흘리지 않고 null로 처리해 fullAge를 "확인 불가"로 내려가게 한다.
         */
        if (birthday == null || birthday.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(birthday.trim());
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private LocalDate parseDate(String value) {
        /*
         * 날짜 문자열이 비어 있으면 날짜 기반 제한을 적용하지 않는다.
         * 실제 파싱 실패는 잘못된 저장 데이터로 보는 편이 낫기 때문에 LocalDate.parse 예외를 숨기지 않는다.
         */
        if (value == null || value.isBlank()) {
            return null;
        }

        return LocalDate.parse(value);
    }
}
