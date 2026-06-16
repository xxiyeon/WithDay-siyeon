package com.test.withdayback.schedule.service;

import com.test.withdayback.schedule.dao.BookmarkDao;
import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.schedule.dto.BookmarkStatusResponseDTO;
import com.test.withdayback.schedule.vo.Schedule;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class BookmarkService {

    private final BookmarkDao bookmarkDao;
    private final ScheduleDao scheduleDao;

    public BookmarkService(BookmarkDao bookmarkDao, ScheduleDao scheduleDao) {
        this.bookmarkDao = bookmarkDao;
        this.scheduleDao = scheduleDao;
    }

    /*
     * 사용자 경험 측면에서는 "같은 일정 저장 버튼을 두 번 눌렀다"가 에러가 될 이유가 없다.
     * 그래서 먼저 exists를 확인해 빠르게 멱등 성공으로 돌려주고,
     * 동시에 레이스 컨디션에서는 DB unique 제약이 마지막 안전장치가 되도록 설계한다.
     */
    @Transactional
    public BookmarkStatusResponseDTO addBookmark(Long userId, Long scheduleId) {
        requireSchedule(scheduleId);

        if (bookmarkDao.existsBookmark(userId, scheduleId)) {
            return new BookmarkStatusResponseDTO(scheduleId, true);
        }

        try {
            bookmarkDao.insertBookmark(userId, scheduleId);
            return new BookmarkStatusResponseDTO(scheduleId, true);
        } catch (DuplicateKeyException duplicateKeyException) {
            /*
             * exists 확인 직후 다른 요청이 먼저 insert를 끝냈다면 duplicate key가 날 수 있다.
             * 이 경우 사용자가 기대하는 최종 상태는 이미 "저장됨"이므로 실패가 아니라 멱등 성공으로 해석한다.
             */
            return new BookmarkStatusResponseDTO(scheduleId, true);
        }
    }

    /*
     * 삭제는 존재하지 않는 row를 지워도 사용자 관점 최종 상태가 "저장 안 됨"으로 같기 때문에 멱등적이어야 한다.
     * row count는 내부 관측값일 뿐, API는 false 상태만 확정해주면 충분하다.
     */
    @Transactional
    public BookmarkStatusResponseDTO removeBookmark(Long userId, Long scheduleId) {
        bookmarkDao.deleteBookmark(userId, scheduleId);
        return new BookmarkStatusResponseDTO(scheduleId, false);
    }

    public BookmarkStatusResponseDTO getBookmarkStatus(Long userId, Long scheduleId) {
        requireSchedule(scheduleId);
        return new BookmarkStatusResponseDTO(
                scheduleId,
                bookmarkDao.existsBookmark(userId, scheduleId)
        );
    }

    public List<Schedule> getBookmarks(Long userId) {
        return bookmarkDao.selectBookmarkedSchedules(userId);
    }

    private Schedule requireSchedule(Long scheduleId) {
        Schedule schedule = scheduleDao.selectScheduleById(scheduleId);
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다.");
        }
        return schedule;
    }
}
