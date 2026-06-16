package com.test.withdayback.user.service;

import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.user.dao.UserDao;
import com.test.withdayback.user.vo.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceWithdrawTest {

    @Mock
    private UserDao userDao;

    @Mock
    private ScheduleDao scheduleDao;

    @InjectMocks
    private UserService userService;

    @Test
    void withdrawMeSuspendsUserAndReplacesEmailWithTombstoneValue() {
        User user = new User(
                7L,
                "withdraw@withday.test",
                "encoded-password",
                "local",
                "",
                "tester",
                null,
                null,
                null,
                "010-0000-0000",
                "active",
                null,
                null,
                null,
                null
        );

        when(userDao.findByEmail("withdraw@withday.test")).thenReturn(user);
        when(userDao.softDeleteUser(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.anyString()))
                .thenReturn(1);

        String result = userService.withdrawMe("withdraw@withday.test");

        ArgumentCaptor<String> tombstoneEmailCaptor = ArgumentCaptor.forClass(String.class);
        verify(userDao).closeSchedulesByHostUserId(7L);
        verify(userDao).deleteNonApprovedParticipationsByUserId(7L);
        verify(userDao).deleteBookmarksByUserId(7L);
        verify(userDao).deleteUserInterests(7L);
        verify(userDao).deleteUserTermsByUserId(7L);
        verify(userDao).deleteNotificationsByUserId(7L);
        verify(userDao).softDeleteUser(org.mockito.ArgumentMatchers.eq(7L), tombstoneEmailCaptor.capture());

        assertEquals("success", result);
        assertNotNull(tombstoneEmailCaptor.getValue());
        org.junit.jupiter.api.Assertions.assertTrue(
                tombstoneEmailCaptor.getValue().startsWith("deleted+7+")
        );
        org.junit.jupiter.api.Assertions.assertTrue(
                tombstoneEmailCaptor.getValue().endsWith("@withdrawn.withday.local")
        );
    }

    @Test
    void withdrawMeThrowsNotFoundWhenActiveUserDoesNotExist() {
        when(userDao.findByEmail("missing@withday.test")).thenReturn(null);

        ResponseStatusException exception = assertThrows(
                ResponseStatusException.class,
                () -> userService.withdrawMe("missing@withday.test")
        );

        assertEquals("404 NOT_FOUND \"존재하지 않는 사용자입니다.\"", exception.getMessage());
    }
}
