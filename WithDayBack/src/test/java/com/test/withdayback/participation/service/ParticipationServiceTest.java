package com.test.withdayback.participation.service;

import com.test.withdayback.notification.service.NotificationService;
import com.test.withdayback.participation.dao.ParticipationDao;
import com.test.withdayback.participation.dto.ParticipationApplyResponseDTO;
import com.test.withdayback.participation.dto.ParticipationStatusUpdateRequestDTO;
import com.test.withdayback.participation.dto.ParticipationStatusUpdateResponseDTO;
import com.test.withdayback.participation.enums.ParticipationStatus;
import com.test.withdayback.participation.vo.Participation;
import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.schedule.enums.GenderLimit;
import com.test.withdayback.schedule.enums.ScheduleStatus;
import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.user.dao.UserDao;
import com.test.withdayback.user.vo.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParticipationServiceTest {

    @Mock
    private ParticipationDao participationDao;

    @Mock
    private UserDao userDao;

    @Mock
    private ScheduleDao scheduleDao;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private ParticipationService participationService;

    @Test
    void getMyParticipationsResolvesUserIdAndUsesStatusFilters() {
        when(userDao.findUserIdByEmail("user@withday.test")).thenReturn(29L);
        when(participationDao.getMyParticipations(29L, List.of("APPROVED", "KICKED")))
                .thenReturn(List.of());

        List<?> result = participationService.getMyParticipations(
                "user@withday.test",
                List.of("approved", "kicked")
        );

        assertEquals(0, result.size());
        verify(userDao).findUserIdByEmail("user@withday.test");
        verify(participationDao).getMyParticipations(29L, List.of("APPROVED", "KICKED"));
    }

    @Test
    void getMyHostingSchedulesReturnsEmptyWhenUserMissing() {
        when(userDao.findUserIdByEmail("missing@withday.test")).thenReturn(null);

        List<?> result = participationService.getMyHostingSchedules("missing@withday.test");

        assertEquals(0, result.size());
        verify(userDao).findUserIdByEmail("missing@withday.test");
        verifyNoInteractions(participationDao);
    }

    @Test
    void cancelParticipationChangesApprovedToCanceledAndReopensSchedule() {
        Long participationId = 10L;
        User actor = new User();
        actor.setId(29L);
        actor.setEmail("user@withday.test");

        Participation participation = new Participation();
        participation.setId(participationId);
        participation.setUserId(29L);
        participation.setScheduleId(7L);
        participation.setStatus(ParticipationStatus.APPROVED);

        Schedule schedule = new Schedule();
        schedule.setId(7L);
        schedule.setStatus(ScheduleStatus.closed);
        schedule.setEndDate("2099-12-31");

        when(participationDao.findById(participationId)).thenReturn(participation);
        when(userDao.findByEmail("user@withday.test")).thenReturn(actor);
        when(scheduleDao.selectScheduleById(7L)).thenReturn(schedule);
        when(participationDao.cancelParticipation(
                participationId,
                "user@withday.test",
                "APPROVED",
                "canceled"
        )).thenReturn(1);
        when(scheduleDao.decreaseCurrentParticipants(7L)).thenReturn(1);

        participationService.cancelParticipation(participationId, "user@withday.test");

        verify(participationDao).cancelParticipation(
                participationId,
                "user@withday.test",
                "APPROVED",
                "canceled"
        );
        verify(scheduleDao).decreaseCurrentParticipants(7L);
        verify(scheduleDao).reopenScheduleWhenSlotAvailable(7L);
    }

    @Test
    void cancelParticipationRejectsAlreadyCanceledStatus() {
        Long participationId = 11L;
        User actor = new User();
        actor.setId(29L);

        Participation participation = new Participation();
        participation.setId(participationId);
        participation.setUserId(29L);
        participation.setScheduleId(8L);
        participation.setStatus(ParticipationStatus.CANCELED);

        Schedule schedule = new Schedule();
        schedule.setId(8L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setEndDate("2099-12-31");

        when(participationDao.findById(participationId)).thenReturn(participation);
        when(userDao.findByEmail("user@withday.test")).thenReturn(actor);
        when(scheduleDao.selectScheduleById(8L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.cancelParticipation(participationId, "user@withday.test")
        );

        assertEquals("409 CONFLICT \"이미 취소된 참여입니다.\"", exception.getMessage());
        verify(participationDao, never()).cancelParticipation(participationId, "user@withday.test", "CANCELED", "canceled");
    }

    @Test
    void cancelParticipationRejectsCompletedSchedule() {
        Long participationId = 13L;
        User actor = new User();
        actor.setId(29L);

        Participation participation = new Participation();
        participation.setId(participationId);
        participation.setUserId(29L);
        participation.setScheduleId(8L);
        participation.setStatus(ParticipationStatus.APPROVED);

        Schedule schedule = new Schedule();
        schedule.setId(8L);
        schedule.setStatus(ScheduleStatus.completed);
        schedule.setEndDate("2099-12-31");

        when(participationDao.findById(participationId)).thenReturn(participation);
        when(userDao.findByEmail("user@withday.test")).thenReturn(actor);
        when(scheduleDao.selectScheduleById(8L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.cancelParticipation(participationId, "user@withday.test")
        );

        assertEquals("409 CONFLICT \"일정완료 상태의 일정은 참여 취소할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).cancelParticipation(participationId, "user@withday.test", "APPROVED", "canceled");
    }

    @Test
    void updateParticipationStatusKicksApprovedParticipant() {
        Long participationId = 12L;

        Participation participation = new Participation();
        participation.setId(participationId);
        participation.setUserId(41L);
        participation.setScheduleId(9L);
        participation.setStatus(ParticipationStatus.APPROVED);

        Schedule schedule = new Schedule();
        schedule.setId(9L);
        schedule.setUserId(77L);
        schedule.setTitle("주말 여행");
        schedule.setStatus(ScheduleStatus.closed);
        schedule.setCurrentParticipants(3);
        schedule.setMaxParticipants(3);
        schedule.setEndDate("2099-12-31");

        Schedule updatedSchedule = new Schedule();
        updatedSchedule.setId(9L);
        updatedSchedule.setUserId(77L);
        updatedSchedule.setTitle("주말 여행");
        updatedSchedule.setStatus(ScheduleStatus.recruiting);
        updatedSchedule.setCurrentParticipants(2);
        updatedSchedule.setMaxParticipants(3);
        updatedSchedule.setEndDate("2099-12-31");

        User host = new User();
        host.setId(77L);
        host.setEmail("host@withday.test");
        host.setNickname("호스트");

        User participantUser = new User();
        participantUser.setId(41L);
        participantUser.setEmail("guest@withday.test");

        ParticipationStatusUpdateRequestDTO dto = new ParticipationStatusUpdateRequestDTO(
                "host@withday.test",
                ParticipationStatus.KICKED,
                "운영 정책 위반"
        );

        when(participationDao.findById(participationId)).thenReturn(participation);
        when(scheduleDao.selectScheduleById(9L)).thenReturn(schedule, updatedSchedule, updatedSchedule);
        when(userDao.findByEmail("host@withday.test")).thenReturn(host);
        when(participationDao.updateStatus(participationId, "APPROVED", "kicked")).thenReturn(1);
        when(scheduleDao.decreaseCurrentParticipants(9L)).thenReturn(1);
        when(userDao.findById(41L)).thenReturn(participantUser);

        ParticipationStatusUpdateResponseDTO response =
                participationService.updateParticipationStatus(participationId, dto);

        assertEquals(ParticipationStatus.KICKED, response.getStatus());
        assertEquals(2, response.getCurrentParticipants());
        verify(notificationService).notifyKick(
                41L,
                "guest@withday.test",
                "호스트",
                "주말 여행"
        );
        verify(scheduleDao).reopenScheduleWhenSlotAvailable(9L);
    }

    @Test
    void updateParticipationStatusRejectsHostCanceledRequest() {
        ParticipationStatusUpdateRequestDTO dto = new ParticipationStatusUpdateRequestDTO(
                "host@withday.test",
                ParticipationStatus.CANCELED,
                ""
        );

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.updateParticipationStatus(99L, dto)
        );

        assertEquals("400 BAD_REQUEST \"호스트는 취소 상태로 변경할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).findById(99L);
    }

    @Test
    void updateParticipationStatusRejectsCompletedSchedule() {
        Long participationId = 14L;

        Participation participation = new Participation();
        participation.setId(participationId);
        participation.setUserId(41L);
        participation.setScheduleId(9L);
        participation.setStatus(ParticipationStatus.PENDING);

        Schedule schedule = new Schedule();
        schedule.setId(9L);
        schedule.setUserId(77L);
        schedule.setStatus(ScheduleStatus.completed);
        schedule.setEndDate("2099-12-31");

        User host = new User();
        host.setId(77L);
        host.setEmail("host@withday.test");

        ParticipationStatusUpdateRequestDTO dto = new ParticipationStatusUpdateRequestDTO(
                "host@withday.test",
                ParticipationStatus.APPROVED,
                ""
        );

        when(participationDao.findById(participationId)).thenReturn(participation);
        when(scheduleDao.selectScheduleById(9L)).thenReturn(schedule);
        when(userDao.findByEmail("host@withday.test")).thenReturn(host);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.updateParticipationStatus(participationId, dto)
        );

        assertEquals("409 CONFLICT \"일정완료 상태의 참여 상태는 변경할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).updateStatus(participationId, "PENDING", "approved");
    }

    @Test
    void applyScheduleReusesCanceledParticipationAsPending() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");
        user.setNickname("참여자");
        user.setGender(1);
        user.setBirthday("2000-05-10");

        User host = new User();
        host.setId(77L);
        host.setEmail("host@withday.test");

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setUserId(77L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setTitle("재신청 테스트");
        schedule.setCurrentParticipants(1);
        schedule.setMaxParticipants(4);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setGenderLimit(GenderLimit.all);

        Participation canceledParticipation = new Participation();
        canceledParticipation.setId(101L);
        canceledParticipation.setUserId(29L);
        canceledParticipation.setScheduleId(5L);
        canceledParticipation.setStatus(ParticipationStatus.CANCELED);

        Participation pendingParticipation = new Participation();
        pendingParticipation.setId(101L);
        pendingParticipation.setUserId(29L);
        pendingParticipation.setScheduleId(5L);
        pendingParticipation.setStatus(ParticipationStatus.PENDING);

        when(userDao.findByEmail("user@withday.test"))
                .thenReturn(user, user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);
        when(participationDao.findByEmailAndScheduleId("user@withday.test", 5L))
                .thenReturn(canceledParticipation);
        when(participationDao.updateStatus(101L, "CANCELED", "pending"))
                .thenReturn(1);
        when(participationDao.findById(101L)).thenReturn(pendingParticipation);
        when(userDao.findById(77L)).thenReturn(host);

        ParticipationApplyResponseDTO response = participationService.applySchedule(
                new com.test.withdayback.participation.dto.ParticipationRequestDTO(
                        5L,
                        "user@withday.test"
                )
        );

        assertEquals(101L, response.getParticipationId());
        assertEquals(ParticipationStatus.PENDING, response.getStatus());
        assertEquals("참여 신청이 다시 완료되었습니다.", response.getMessage());
        verify(participationDao).updateStatus(101L, "CANCELED", "pending");
        verify(notificationService).notifyApply(77L, "host@withday.test", "참여자", "재신청 테스트", 5L);
    }

    @Test
    void applyScheduleRejectsWhenMaleOnlyScheduleAndUserIsFemale() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");
        user.setGender(2);

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setGenderLimit(GenderLimit.male);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.applySchedule(
                        new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
                )
        );

        assertEquals("409 CONFLICT \"성별 조건에 맞지 않아 참여할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).findByEmailAndScheduleId("user@withday.test", 5L);
    }

    @Test
    void applyScheduleRejectsWhenFemaleOnlyScheduleAndUserIsMale() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");
        user.setGender(1);

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setGenderLimit(GenderLimit.female);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.applySchedule(
                        new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
                )
        );

        assertEquals("409 CONFLICT \"성별 조건에 맞지 않아 참여할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).findByEmailAndScheduleId("user@withday.test", 5L);
    }

    @Test
    void applyScheduleRejectsWhenGenderMissingForRestrictedSchedule() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setGenderLimit(GenderLimit.male);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.applySchedule(
                        new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
                )
        );

        assertEquals("409 CONFLICT \"성별 정보가 없어 참여할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).findByEmailAndScheduleId("user@withday.test", 5L);
    }

    @Test
    void applyScheduleRejectsWhenUserIsBelowMinimumAge() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");
        user.setBirthday(birthdayForAge(19));

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setAgeMin(20);
        schedule.setAgeMax(29);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.applySchedule(
                        new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
                )
        );

        assertEquals("409 CONFLICT \"참여 가능 연령이 아닙니다.\"", exception.getMessage());
        verify(participationDao, never()).findByEmailAndScheduleId("user@withday.test", 5L);
    }

    @Test
    void applyScheduleRejectsWhenUserIsAboveMaximumAge() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");
        user.setBirthday(birthdayForAge(30));

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setAgeMin(20);
        schedule.setAgeMax(29);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.applySchedule(
                        new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
                )
        );

        assertEquals("409 CONFLICT \"참여 가능 연령이 아닙니다.\"", exception.getMessage());
        verify(participationDao, never()).findByEmailAndScheduleId("user@withday.test", 5L);
    }

    @Test
    void applyScheduleRejectsWhenBirthdayMissingForAgeRestrictedSchedule() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setAgeMin(20);
        schedule.setAgeMax(29);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> participationService.applySchedule(
                        new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
                )
        );

        assertEquals("409 CONFLICT \"생년월일 정보가 없어 참여할 수 없습니다.\"", exception.getMessage());
        verify(participationDao, never()).findByEmailAndScheduleId("user@withday.test", 5L);
    }

    @Test
    void applyScheduleAllowsBoundaryAgeAndPartialAgeBounds() {
        User user = new User();
        user.setId(29L);
        user.setEmail("user@withday.test");
        user.setNickname("경계참여자");
        user.setBirthday(birthdayForAge(20));
        user.setGender(1);

        User host = new User();
        host.setId(77L);
        host.setEmail("host@withday.test");

        Schedule schedule = new Schedule();
        schedule.setId(5L);
        schedule.setUserId(77L);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setTitle("경계값 테스트");
        schedule.setCurrentParticipants(0);
        schedule.setMaxParticipants(4);
        schedule.setRecruitEndDate("2099-12-31");
        schedule.setEndDate("2099-12-31");
        schedule.setAgeMin(20);
        schedule.setAgeMax(20);
        schedule.setGenderLimit(GenderLimit.all);

        Participation newParticipation = new Participation();
        newParticipation.setId(300L);
        newParticipation.setUserId(29L);
        newParticipation.setScheduleId(5L);
        newParticipation.setStatus(ParticipationStatus.PENDING);

        when(userDao.findByEmail("user@withday.test")).thenReturn(user, user);
        when(scheduleDao.selectScheduleById(5L)).thenReturn(schedule);
        when(participationDao.findByEmailAndScheduleId("user@withday.test", 5L)).thenReturn(null);
        when(participationDao.insertParticipation(org.mockito.ArgumentMatchers.any(Participation.class))).thenAnswer(invocation -> {
            Participation participation = invocation.getArgument(0);
            participation.setId(300L);
            return 1;
        });
        when(userDao.findById(77L)).thenReturn(host);

        ParticipationApplyResponseDTO response = participationService.applySchedule(
                new com.test.withdayback.participation.dto.ParticipationRequestDTO(5L, "user@withday.test")
        );

        assertEquals(300L, response.getParticipationId());
        assertEquals(ParticipationStatus.PENDING, response.getStatus());
        verify(notificationService).notifyApply(77L, "host@withday.test", "경계참여자", "경계값 테스트", 5L);
    }

    private String birthdayForAge(int age) {
        return LocalDate.now(ZoneId.of("Asia/Seoul"))
                .minusYears(age)
                .toString();
    }
}
