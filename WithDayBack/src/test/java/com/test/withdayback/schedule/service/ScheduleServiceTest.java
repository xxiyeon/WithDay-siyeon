package com.test.withdayback.schedule.service;

import com.test.withdayback.participation.dao.ParticipationDao;
import com.test.withdayback.participation.enums.ParticipationStatus;
import com.test.withdayback.participation.vo.Participation;
import com.test.withdayback.schedule.dto.ScheduleExecutionResponseDTO;
import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.schedule.dto.ScheduleRequestDTO;
import com.test.withdayback.schedule.dto.ScheduleResponseDTO;
import com.test.withdayback.schedule.enums.CostType;
import com.test.withdayback.schedule.enums.GenderLimit;
import com.test.withdayback.schedule.enums.ScheduleStatus;
import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.user.vo.User;
import com.test.withdayback.user.dao.UserDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private ScheduleDao scheduleDao;

    @Mock
    private ParticipationDao participationDao;

    @Mock
    private UserDao userDao;

    @InjectMocks
    private ScheduleService scheduleService;

    @Test
    void insertScheduleCreatesApprovedHostParticipationWithoutIncreasingCurrentParticipants() {
        Long userId = 15L;
        Long scheduleId = 87L;
        Schedule schedule = new Schedule();
        ScheduleRequestDTO dto = new ScheduleRequestDTO();
        dto.setEmail("host@withday.test");
        dto.setSchedule(schedule);

        when(userDao.findUserIdByEmail("host@withday.test")).thenReturn(userId);
        doAnswer(invocation -> {
            Schedule insertedSchedule = invocation.getArgument(0);
            insertedSchedule.setId(scheduleId);
            return null;
        }).when(scheduleDao).insertSchedule(schedule);
        when(participationDao.findByEmailAndScheduleId("host@withday.test", scheduleId))
                .thenReturn(null);
        doAnswer(invocation -> {
            Participation participation = invocation.getArgument(0);
            participation.setId(301L);
            return 1;
        }).when(participationDao).insertParticipation(any(Participation.class));

        scheduleService.insertSchedule(dto, List.of());

        ArgumentCaptor<Participation> participationCaptor = ArgumentCaptor.forClass(Participation.class);
        verify(participationDao).insertParticipation(participationCaptor.capture());
        Participation hostParticipation = participationCaptor.getValue();
        assertEquals(userId, hostParticipation.getUserId());
        assertEquals(scheduleId, hostParticipation.getScheduleId());
        assertEquals(ParticipationStatus.APPROVED, hostParticipation.getStatus());
        verify(scheduleDao, never()).increaseCurrentParticipants(scheduleId);
    }

    @Test
    void insertScheduleThrowsWhenHostParticipationInsertFails() {
        Long scheduleId = 87L;
        Schedule schedule = new Schedule();
        ScheduleRequestDTO dto = new ScheduleRequestDTO();
        dto.setEmail("host@withday.test");
        dto.setSchedule(schedule);

        when(userDao.findUserIdByEmail("host@withday.test")).thenReturn(15L);
        doAnswer(invocation -> {
            Schedule insertedSchedule = invocation.getArgument(0);
            insertedSchedule.setId(scheduleId);
            return null;
        }).when(scheduleDao).insertSchedule(schedule);
        when(participationDao.findByEmailAndScheduleId("host@withday.test", scheduleId))
                .thenReturn(null);
        when(participationDao.insertParticipation(any(Participation.class))).thenReturn(0);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> scheduleService.insertSchedule(dto, List.of())
        );

        assertEquals("500 INTERNAL_SERVER_ERROR \"호스트 참여 정보 생성에 실패했습니다.\"", exception.getMessage());
    }

    @Test
    void increaseViewCountReturnsTrueWhenRowWasUpdated() {
        Long scheduleId = 1L;

        // update 대상이 1건이면 실제로 조회수가 증가한 것이다.
        when(scheduleDao.increaseViewCount(scheduleId)).thenReturn(1);

        boolean result = scheduleService.increaseViewCount(scheduleId);

        assertTrue(result);
        verify(scheduleDao).increaseViewCount(scheduleId);
    }

    @Test
    void increaseViewCountReturnsFalseWhenScheduleDoesNotExist() {
        Long scheduleId = 999L;

        // update 결과가 0이면 존재하지 않거나 삭제된 일정이라고 본다.
        when(scheduleDao.increaseViewCount(scheduleId)).thenReturn(0);

        boolean result = scheduleService.increaseViewCount(scheduleId);

        assertFalse(result);
        verify(scheduleDao).increaseViewCount(scheduleId);
    }

    @Test
    void getScheduleFullDetailsIncludesFieldsNeededByCard() {
        Long scheduleId = 7L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);
        schedule.setStartDate("2026-05-20");
        schedule.setEndDate("2026-05-22");
        schedule.setRecruitEndDate("2026-05-18");
        schedule.setGenderLimit(GenderLimit.female);
        schedule.setCostType(CostType.host_covered);

        schedule.setIsBookmarked(Boolean.TRUE);
        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "")).thenReturn(schedule);
        when(scheduleDao.selectDetailsByScheduleId(scheduleId)).thenReturn(List.of());
        when(scheduleDao.selectImageByScheduleId(scheduleId)).thenReturn(List.of());
        when(userDao.findById(1L)).thenReturn(new User(1L, "host@withday.test", null, null, null, "host", null, null, null, null, "active", null, null, null, null));

        ScheduleResponseDTO result = scheduleService.getScheduleFullDetails(scheduleId, "");

        assertNotNull(result);
        assertEquals("2026-05-20", result.getStartDate());
        assertEquals("2026-05-22", result.getEndDate());
        assertEquals("2026-05-18", result.getRecruitEndDate());
        assertEquals("female", result.getGenderLimit());
        assertEquals("host_covered", result.getCostType());
        assertTrue(result.getIsBookmarked());
        assertFalse(result.getHiddenFromPublic());
        assertFalse(result.getViewerIsAdmin());
    }

    @Test
    void getScheduleFullDetailsReturnsNullWhenScheduleDoesNotExist() {
        Long scheduleId = 99L;

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn(null);
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "")).thenReturn(null);

        ScheduleResponseDTO result = scheduleService.getScheduleFullDetails(scheduleId, "");

        assertNull(result);
    }

    @Test
    void getScheduleFullDetailsDoesNotExposeSuspendedHostEmail() {
        Long scheduleId = 109L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn(null);
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "")).thenReturn(schedule);
        when(scheduleDao.selectDetailsByScheduleId(scheduleId)).thenReturn(List.of());
        when(scheduleDao.selectImageByScheduleId(scheduleId)).thenReturn(List.of());
        when(userDao.findById(1L)).thenReturn(
                new User(1L, "deleted+1+999@withdrawn.withday.local", null, null, null, "host", null, null, null, null, "suspended", null, null, null, null)
        );

        ScheduleResponseDTO result = scheduleService.getScheduleFullDetails(scheduleId, "");

        assertNotNull(result);
        assertNull(result.getEmail());
        assertEquals("host", result.getHost().getNickname());
    }

    @Test
    void getScheduleFullDetailsHidesChatLinkForPendingViewer() {
        Long scheduleId = 21L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);
        schedule.setChatLink("https://open.kakao.com/test-room");

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "guest@withday.test")).thenReturn(schedule);
        when(scheduleDao.selectDetailsByScheduleId(scheduleId)).thenReturn(List.of());
        when(scheduleDao.selectImageByScheduleId(scheduleId)).thenReturn(List.of());
        when(userDao.findByEmail("guest@withday.test"))
                .thenReturn(new User(2L, "guest@withday.test", null, null, null, "guest", null, null, null, null, "active", null, null, null, null));
        when(userDao.findById(1L)).thenReturn(new User(1L, "host@withday.test", null, null, null, "host", null, null, null, null, "active", null, null, null, null));
        Participation participation = new Participation();
        participation.setId(201L);
        participation.setStatus(ParticipationStatus.PENDING);

        when(participationDao.findByEmailAndScheduleId("guest@withday.test", scheduleId))
                .thenReturn(participation);

        ScheduleResponseDTO result =
                scheduleService.getScheduleFullDetails(scheduleId, "guest@withday.test");

        assertNotNull(result);
        assertFalse(result.getViewerIsHost());
        assertFalse(result.getViewerCanAccessChatLink());
        assertEquals(201L, result.getViewerParticipationId());
        assertEquals("PENDING", result.getViewerParticipationStatus());
        assertNull(result.getSchedule().getChatLink());
    }

    @Test
    void getScheduleFullDetailsShowsChatLinkForApprovedViewer() {
        Long scheduleId = 22L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);
        schedule.setChatLink("https://open.kakao.com/test-room");

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "approved@withday.test")).thenReturn(schedule);
        when(scheduleDao.selectDetailsByScheduleId(scheduleId)).thenReturn(List.of());
        when(scheduleDao.selectImageByScheduleId(scheduleId)).thenReturn(List.of());
        when(userDao.findByEmail("approved@withday.test"))
                .thenReturn(new User(3L, "approved@withday.test", null, null, null, "approved", null, null, null, null, "active", null, null, null, null));
        when(userDao.findById(1L)).thenReturn(new User(1L, "host@withday.test", null, null, null, "host", null, null, null, null, "active", null, null, null, null));
        Participation participation = new Participation();
        participation.setId(202L);
        participation.setStatus(ParticipationStatus.APPROVED);

        when(participationDao.findByEmailAndScheduleId("approved@withday.test", scheduleId))
                .thenReturn(participation);

        ScheduleResponseDTO result =
                scheduleService.getScheduleFullDetails(scheduleId, "approved@withday.test");

        assertNotNull(result);
        assertTrue(result.getViewerCanAccessChatLink());
        assertEquals(202L, result.getViewerParticipationId());
        assertEquals("APPROVED", result.getViewerParticipationStatus());
        assertEquals("https://open.kakao.com/test-room", result.getSchedule().getChatLink());
    }

    @Test
    void getScheduleFullDetailsReturnsHiddenScheduleForHost() {
        Long scheduleId = 23L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);
        schedule.setIsPublic(0);

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "host@withday.test")).thenReturn(schedule);
        when(scheduleDao.selectDetailsByScheduleId(scheduleId)).thenReturn(List.of());
        when(scheduleDao.selectImageByScheduleId(scheduleId)).thenReturn(List.of());
        when(userDao.findByEmail("host@withday.test"))
                .thenReturn(new User(1L, "host@withday.test", null, null, null, "host", null, null, null, null, "active", null, null, null, null));
        when(userDao.findById(1L)).thenReturn(new User(1L, "host@withday.test", null, null, null, "host", null, null, null, null, "active", null, null, null, null));

        ScheduleResponseDTO result = scheduleService.getScheduleFullDetails(scheduleId, "host@withday.test");

        assertTrue(result.getHiddenFromPublic());
        assertTrue(result.getViewerIsHost());
        assertFalse(result.getViewerIsAdmin());
    }

    @Test
    void getScheduleFullDetailsReturnsHiddenScheduleForAdmin() {
        Long scheduleId = 24L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);
        schedule.setIsPublic(0);

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "admin@withday.test")).thenReturn(schedule);
        when(scheduleDao.selectDetailsByScheduleId(scheduleId)).thenReturn(List.of());
        when(scheduleDao.selectImageByScheduleId(scheduleId)).thenReturn(List.of());
        when(userDao.findByEmail("admin@withday.test"))
                .thenReturn(new User(99L, "admin@withday.test", null, null, null, "admin", null, null, null, null, "admin", null, null, null, null));
        when(userDao.findById(1L)).thenReturn(new User(1L, "host@withday.test", null, null, null, "host", null, null, null, null, "active", null, null, null, null));

        ScheduleResponseDTO result = scheduleService.getScheduleFullDetails(scheduleId, "admin@withday.test");

        assertTrue(result.getHiddenFromPublic());
        assertFalse(result.getViewerIsHost());
        assertTrue(result.getViewerIsAdmin());
    }

    @Test
    void getScheduleFullDetailsRejectsHiddenScheduleForGuest() {
        Long scheduleId = 25L;
        Schedule schedule = new Schedule();
        schedule.setUserId(1L);
        schedule.setIsPublic(0);

        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.selectScheduleByIdForViewer(scheduleId, "")).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> scheduleService.getScheduleFullDetails(scheduleId, "")
        );

        assertEquals("404 NOT_FOUND \"일정을 찾을 수 없습니다.\"", exception.getMessage());
    }

    @Test
    void completeScheduleChangesRecruitingToCompletedForHost() {
        Long scheduleId = 30L;
        Schedule schedule = new Schedule();
        schedule.setId(scheduleId);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setCurrentParticipants(3);
        schedule.setMinParticipants(2);
        schedule.setMaxParticipants(5);

        Schedule completedSchedule = new Schedule();
        completedSchedule.setId(scheduleId);
        completedSchedule.setStatus(ScheduleStatus.completed);
        completedSchedule.setCurrentParticipants(3);
        completedSchedule.setMaxParticipants(5);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(schedule, completedSchedule);
        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.completeSchedule(scheduleId, "recruiting")).thenReturn(1);

        ScheduleExecutionResponseDTO response =
                scheduleService.completeSchedule(scheduleId, "host@withday.test");

        assertEquals(scheduleId, response.getScheduleId());
        assertEquals("COMPLETED", response.getStatus());
        verify(scheduleDao).completeSchedule(scheduleId, "recruiting");
    }

    @Test
    void cancelScheduleChangesRecruitingToCanceledForHost() {
        Long scheduleId = 35L;
        Schedule recruitingSchedule = new Schedule();
        recruitingSchedule.setId(scheduleId);
        recruitingSchedule.setStatus(ScheduleStatus.recruiting);
        recruitingSchedule.setCurrentParticipants(3);
        recruitingSchedule.setMaxParticipants(5);

        Schedule canceledSchedule = new Schedule();
        canceledSchedule.setId(scheduleId);
        canceledSchedule.setStatus(ScheduleStatus.canceled);
        canceledSchedule.setCurrentParticipants(3);
        canceledSchedule.setMaxParticipants(5);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(recruitingSchedule, canceledSchedule);
        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.cancelSchedule(scheduleId)).thenReturn(1);

        ScheduleExecutionResponseDTO response =
                scheduleService.cancelSchedule(scheduleId, "host@withday.test");

        assertEquals("CANCELED", response.getStatus());
        verify(scheduleDao).cancelSchedule(scheduleId);
    }

    @Test
    void cancelScheduleRejectsCompletedSchedule() {
        Long scheduleId = 36L;
        Schedule completedSchedule = new Schedule();
        completedSchedule.setId(scheduleId);
        completedSchedule.setStatus(ScheduleStatus.completed);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(completedSchedule);
        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> scheduleService.cancelSchedule(scheduleId, "host@withday.test")
        );

        assertEquals("409 CONFLICT \"완료된 일정은 취소할 수 없습니다.\"", exception.getMessage());
    }

    @Test
    void rollbackCompletedScheduleReturnsClosedWhenRecruitDeadlinePassed() {
        Long scheduleId = 31L;
        Schedule completedSchedule = new Schedule();
        completedSchedule.setId(scheduleId);
        completedSchedule.setStatus(ScheduleStatus.completed);
        completedSchedule.setRecruitEndDate("2000-01-01");
        completedSchedule.setCurrentParticipants(4);
        completedSchedule.setMaxParticipants(5);

        Schedule closedSchedule = new Schedule();
        closedSchedule.setId(scheduleId);
        closedSchedule.setStatus(ScheduleStatus.closed);
        closedSchedule.setRecruitEndDate("2000-01-01");
        closedSchedule.setCurrentParticipants(4);
        closedSchedule.setMaxParticipants(5);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(completedSchedule, closedSchedule);
        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");
        when(scheduleDao.rollbackCompletedSchedule(scheduleId, "closed")).thenReturn(1);

        ScheduleExecutionResponseDTO response =
                scheduleService.rollbackCompletedSchedule(scheduleId, "host@withday.test");

        assertEquals("CLOSED", response.getStatus());
        verify(scheduleDao).rollbackCompletedSchedule(scheduleId, "closed");
    }

    @Test
    void completeScheduleRejectsHostWhenMinParticipantsNotMet() {
        Long scheduleId = 32L;
        Schedule schedule = new Schedule();
        schedule.setId(scheduleId);
        schedule.setStatus(ScheduleStatus.recruiting);
        schedule.setCurrentParticipants(1);
        schedule.setMinParticipants(2);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(schedule);
        when(scheduleDao.getEmailByScheduleId(scheduleId)).thenReturn("host@withday.test");

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> scheduleService.completeSchedule(scheduleId, "host@withday.test")
        );

        assertEquals("409 CONFLICT \"최소 인원이 충족되지 않아 실행할 수 없습니다.\"", exception.getMessage());
    }

    @Test
    void updateScheduleRejectsCompletedSchedule() {
        Long scheduleId = 33L;
        Schedule schedule = new Schedule();
        schedule.setId(scheduleId);
        schedule.setStatus(ScheduleStatus.completed);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> scheduleService.updateSchedule(scheduleId, new com.test.withdayback.schedule.dto.ScheduleRequestDTO(), List.of())
        );

        assertEquals("409 CONFLICT \"일정완료 상태의 일정은 수정할 수 없습니다.\"", exception.getMessage());
    }

    @Test
    void deleteScheduleRejectsCompletedSchedule() {
        Long scheduleId = 34L;
        Schedule schedule = new Schedule();
        schedule.setId(scheduleId);
        schedule.setStatus(ScheduleStatus.completed);

        when(scheduleDao.selectScheduleById(scheduleId)).thenReturn(schedule);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> scheduleService.deleteSchedule(scheduleId)
        );

        assertEquals("409 CONFLICT \"일정완료 상태의 일정은 삭제할 수 없습니다.\"", exception.getMessage());
    }
}
