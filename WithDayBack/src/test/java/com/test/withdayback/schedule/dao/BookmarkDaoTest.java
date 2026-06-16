package com.test.withdayback.schedule.dao;

import com.test.withdayback.schedule.vo.Schedule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@MybatisTest
@ActiveProfiles("test")
class BookmarkDaoTest {

    @Autowired
    private BookmarkDao bookmarkDao;

    @Autowired
    private ScheduleDao scheduleDao;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS bookmark");
        jdbcTemplate.execute("DROP TABLE IF EXISTS `user`");
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule");

        jdbcTemplate.execute("""
                CREATE TABLE `user` (
                    id BIGINT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE schedule (
                    id BIGINT PRIMARY KEY,
                    user_id BIGINT NULL,
                    title VARCHAR(255) NULL,
                    description VARCHAR(255) NULL,
                    category VARCHAR(50) NULL,
                    region VARCHAR(100) NULL,
                    detail_region VARCHAR(100) NULL,
                    chat_link VARCHAR(255) NULL,
                    start_date DATE NULL,
                    end_date DATE NULL,
                    recruit_start_date DATE NULL,
                    recruit_end_date DATE NULL,
                    min_participants INT NULL,
                    max_participants INT NULL,
                    current_participants INT NULL,
                    age_min INT NULL,
                    age_max INT NULL,
                    gender_limit VARCHAR(20) NULL,
                    total_price INT NULL,
                    cost_type VARCHAR(50) NULL,
                    thumbnail_image VARCHAR(255) NULL,
                    view_count INT NULL,
                    status VARCHAR(20) NOT NULL,
                    is_public INT NULL,
                    cancel_deadline DATE NULL,
                    created_at TIMESTAMP NULL,
                    updated_at TIMESTAMP NULL,
                    deleted_at TIMESTAMP NULL
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE bookmark (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    schedule_id BIGINT NOT NULL,
                    created_at TIMESTAMP NULL,
                    CONSTRAINT uk_bookmark_user_schedule UNIQUE (user_id, schedule_id)
                )
                """);

        jdbcTemplate.update("INSERT INTO `user` (id, email) VALUES (?, ?)", 10L, "viewer@withday.test");
        insertSchedule(1L, "First Schedule");
        insertSchedule(2L, "Second Schedule");
    }

    @Test
    void existsBookmarkReturnsTrueAfterInsert() {
        bookmarkDao.insertBookmark(10L, 1L);

        assertTrue(bookmarkDao.existsBookmark(10L, 1L));
        assertFalse(bookmarkDao.existsBookmark(10L, 2L));
    }

    @Test
    void selectBookmarkedSchedulesReturnsLatestBookmarkFirst() {
        jdbcTemplate.update(
                "INSERT INTO bookmark (user_id, schedule_id, created_at) VALUES (?, ?, ?)",
                10L,
                1L,
                Timestamp.valueOf("2026-05-25 10:00:00")
        );
        jdbcTemplate.update(
                "INSERT INTO bookmark (user_id, schedule_id, created_at) VALUES (?, ?, ?)",
                10L,
                2L,
                Timestamp.valueOf("2026-05-26 10:00:00")
        );

        List<Schedule> bookmarkedSchedules = bookmarkDao.selectBookmarkedSchedules(10L);

        assertEquals(List.of(2L, 1L), bookmarkedSchedules.stream().map(Schedule::getId).toList());
        assertTrue(bookmarkedSchedules.stream().allMatch(schedule -> Boolean.TRUE.equals(schedule.getIsBookmarked())));
    }

    private void insertSchedule(Long id, String title) {
        jdbcTemplate.update("""
                        INSERT INTO schedule (
                            id, user_id, title, description, category, region, detail_region, chat_link,
                            start_date, end_date, recruit_start_date, recruit_end_date,
                            min_participants, max_participants, current_participants,
                            age_min, age_max, gender_limit, total_price, cost_type,
                            thumbnail_image, view_count, status, is_public, cancel_deadline,
                            created_at, updated_at, deleted_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                id,
                1L,
                title,
                "description",
                "travel",
                "SEOUL",
                null,
                null,
                Date.valueOf(LocalDate.now().plusDays(1)),
                Date.valueOf(LocalDate.now().plusDays(2)),
                Date.valueOf(LocalDate.now().minusDays(1)),
                Date.valueOf(LocalDate.now().plusDays(1)),
                1,
                4,
                1,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                "recruiting",
                1,
                null,
                Timestamp.valueOf(LocalDate.now().atStartOfDay()),
                Timestamp.valueOf(LocalDate.now().atStartOfDay()),
                null
        );
    }
}
