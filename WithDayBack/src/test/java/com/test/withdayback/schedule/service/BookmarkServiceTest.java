package com.test.withdayback.schedule.service;

import com.test.withdayback.schedule.dao.BookmarkDao;
import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.schedule.dto.BookmarkStatusResponseDTO;
import com.test.withdayback.schedule.vo.Schedule;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookmarkServiceTest {

    @Mock
    private BookmarkDao bookmarkDao;

    @Mock
    private ScheduleDao scheduleDao;

    @InjectMocks
    private BookmarkService bookmarkService;

    @Test
    void addBookmarkReturnsSuccessWithoutInsertWhenAlreadyExists() {
        Schedule schedule = new Schedule();
        when(scheduleDao.selectScheduleById(1L)).thenReturn(schedule);
        when(bookmarkDao.existsBookmark(10L, 1L)).thenReturn(true);

        BookmarkStatusResponseDTO result = bookmarkService.addBookmark(10L, 1L);

        assertTrue(result.getIsBookmarked());
        verify(bookmarkDao, never()).insertBookmark(10L, 1L);
    }

    @Test
    void addBookmarkTreatsDuplicateKeyAsIdempotentSuccess() {
        Schedule schedule = new Schedule();
        when(scheduleDao.selectScheduleById(1L)).thenReturn(schedule);
        when(bookmarkDao.existsBookmark(10L, 1L)).thenReturn(false);
        when(bookmarkDao.insertBookmark(10L, 1L)).thenThrow(new DuplicateKeyException("duplicate"));

        BookmarkStatusResponseDTO result = bookmarkService.addBookmark(10L, 1L);

        assertTrue(result.getIsBookmarked());
    }

    @Test
    void removeBookmarkAlwaysReturnsFalseState() {
        BookmarkStatusResponseDTO result = bookmarkService.removeBookmark(10L, 1L);

        assertFalse(result.getIsBookmarked());
        verify(bookmarkDao).deleteBookmark(10L, 1L);
    }

    @Test
    void getBookmarkStatusUsesExistsQuery() {
        Schedule schedule = new Schedule();
        when(scheduleDao.selectScheduleById(1L)).thenReturn(schedule);
        when(bookmarkDao.existsBookmark(10L, 1L)).thenReturn(true);

        BookmarkStatusResponseDTO result = bookmarkService.getBookmarkStatus(10L, 1L);

        assertEquals(1L, result.getScheduleId());
        assertTrue(result.getIsBookmarked());
    }

    @Test
    void addBookmarkThrowsWhenScheduleDoesNotExist() {
        when(scheduleDao.selectScheduleById(99L)).thenReturn(null);

        assertThrows(ResponseStatusException.class, () -> bookmarkService.addBookmark(10L, 99L));
    }
}
