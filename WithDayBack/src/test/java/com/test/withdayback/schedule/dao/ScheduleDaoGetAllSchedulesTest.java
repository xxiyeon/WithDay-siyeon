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
import static org.junit.jupiter.api.Assertions.assertIterableEquals;

@MybatisTest
@ActiveProfiles("test")
class ScheduleDaoGetAllSchedulesTest {

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
                    email VARCHAR(255) NOT NULL,
                    status VARCHAR(20) NULL
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

        jdbcTemplate.update(
                "INSERT INTO `user` (id, email, status) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)",
                1L, "host@withday.test", "active",
                100L, "viewer@withday.test", "active",
                200L, "admin@withday.test", "admin"
        );

        LocalDate today = LocalDate.now();

        insertSchedule(1L, 1L, "Open Travel", "Seoul mountain trip", "travel", "SEOUL",
                "recruiting", 1, 5, 1, today.plusDays(2), null);
        insertSchedule(2L, 1L, "Full Travel", "Busan beach trip", "travel", "BUSAN",
                "closed", 5, 5, 1, today.plusDays(2), null);
        insertSchedule(3L, 1L, "Expired Travel", "Daegu night walk", "travel", "DAEGU",
                "closed", 2, 5, 1, today.minusDays(1), null);
        insertSchedule(4L, 1L, "Expired Full Travel", "Jeju full group", "travel", "JEJU",
                "closed", 4, 4, 1, today.minusDays(1), null);
        insertSchedule(5L, 1L, "Cancelled Travel", "No longer active", "travel", "SEOUL",
                "canceled", 1, 5, 1, today.plusDays(2), null);
        insertSchedule(6L, 1L, "Completed Travel", "Already done", "travel", "SEOUL",
                "completed", 1, 5, 1, today.plusDays(2), null);
        insertSchedule(7L, 1L, "Deleted Travel", "Soft deleted", "travel", "SEOUL",
                "recruiting", 1, 5, 1, today.plusDays(2), Timestamp.valueOf(today.atStartOfDay()));
        insertSchedule(8L, 1L, "Food Gathering", "Seoul dinner plan", "food", "SEOUL",
                "recruiting", 2, 6, 1, today.plusDays(3), null);
        insertSchedule(9L, 100L, "Viewer Hidden Travel", "Private host schedule", "travel", "SEOUL",
                "recruiting", 1, 4, 0, today.plusDays(4), null);
        insertSchedule(10L, 1L, "Host Hidden Travel", "Private schedule for host only", "travel", "SEOUL",
                "recruiting", 1, 4, 0, today.plusDays(4), null);
    }

    @Test
    void getAllSchedulesShowsRecruitingAndFullClosedButHidesExpiredClosed() {
        List<Schedule> schedules = scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "latest", null, false, null);

        assertEquals(3, schedules.size());
        assertIterableEquals(List.of(8L, 2L, 1L), schedules.stream().map(Schedule::getId).toList());
        assertEquals(Boolean.FALSE, schedules.get(0).getIsBookmarked());
    }

    @Test
    void getAllSchedulesAppliesCategoryKeywordAndRegionFiltersOnTopOfVisibilityRule() {
        List<Schedule> schedules = scheduleDao.getAllSchedules("travel", "beach", " busan ", null, null, null, null, "latest", null, false, null);

        assertEquals(1, schedules.size());
        assertEquals(2L, schedules.get(0).getId());
    }

    @Test
    void getAllSchedulesKeepsFullClosedVisibleWhenRecruitEndDateIsToday() {
        insertSchedule(11L, 1L, "Today Full Travel", "Still visible today", "travel", "SEOUL",
                "closed", 3, 3, 1, LocalDate.now(), null);

        List<Schedule> schedules = scheduleDao.getAllSchedules("travel", null, "seoul", null, null, null, null, "latest", null, false, null);

        assertIterableEquals(List.of(11L, 1L), schedules.stream().map(Schedule::getId).toList());
    }

    @Test
    void getAllSchedulesMarksBookmarkedSchedulesForLoggedInViewer() {
        jdbcTemplate.update(
                "INSERT INTO bookmark (user_id, schedule_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP())",
                100L,
                2L
        );

        List<Schedule> schedules =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "latest", 100L, false, "viewer@withday.test");

        Schedule bookmarkedSchedule = schedules.stream()
                .filter(schedule -> schedule.getId().equals(2L))
                .findFirst()
                .orElseThrow();
        Schedule unbookmarkedSchedule = schedules.stream()
                .filter(schedule -> schedule.getId().equals(1L))
                .findFirst()
                .orElseThrow();

        assertEquals(Boolean.TRUE, bookmarkedSchedule.getIsBookmarked());
        assertEquals(Boolean.FALSE, unbookmarkedSchedule.getIsBookmarked());
    }

    @Test
    void getAllSchedulesSearchesKeywordOnlyAcrossTitleAndDescription() {
        jdbcTemplate.update(
                "UPDATE schedule SET region = ?, detail_region = ?, category = ? WHERE id = ?",
                "INCHEON",
                "GANGNAM",
                "culture",
                1L
        );

        List<Schedule> titleMatches =
                scheduleDao.getAllSchedules(null, "open", null, null, null, null, null, "latest", null, false, null);
        List<Schedule> descriptionMatches =
                scheduleDao.getAllSchedules(null, "dinner", null, null, null, null, null, "latest", null, false, null);
        List<Schedule> regionMatches =
                scheduleDao.getAllSchedules(null, "incheon", null, null, null, null, null, "latest", null, false, null);
        List<Schedule> detailRegionMatches =
                scheduleDao.getAllSchedules(null, "gangnam", null, null, null, null, null, "latest", null, false, null);
        List<Schedule> categoryMatches =
                scheduleDao.getAllSchedules(null, "culture", null, null, null, null, null, "latest", null, false, null);

        assertIterableEquals(List.of(1L), titleMatches.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(8L), descriptionMatches.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(), regionMatches.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(), detailRegionMatches.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(), categoryMatches.stream().map(Schedule::getId).toList());
    }

    @Test
    void getAllSchedulesAppliesDistrictGenderAndDateRangeFilters() {
        jdbcTemplate.update(
                "UPDATE schedule SET detail_region = ?, gender_limit = ?, start_date = ?, end_date = ? WHERE id = ?",
                "GANGNAM",
                "male",
                Date.valueOf(LocalDate.now().plusDays(10)),
                Date.valueOf(LocalDate.now().plusDays(12)),
                1L
        );
        jdbcTemplate.update(
                "UPDATE schedule SET detail_region = ?, gender_limit = ?, start_date = ?, end_date = ? WHERE id = ?",
                "MAPO",
                "female",
                Date.valueOf(LocalDate.now().plusDays(30)),
                Date.valueOf(LocalDate.now().plusDays(31)),
                8L
        );

        List<Schedule> schedules = scheduleDao.getAllSchedules(
                null,
                null,
                "seoul",
                "gangnam",
                "male",
                String.valueOf(LocalDate.now().plusDays(11)),
                String.valueOf(LocalDate.now().plusDays(11)),
                "latest",
                null,
                false,
                null
        );

        assertIterableEquals(List.of(1L), schedules.stream().map(Schedule::getId).toList());
    }

    @Test
    void getAllSchedulesSupportsExploreSortOptions() {
        jdbcTemplate.update(
                "UPDATE schedule SET recruit_end_date = ?, start_date = ? WHERE id = ?",
                Date.valueOf(LocalDate.now().plusDays(5)),
                Date.valueOf(LocalDate.now().plusDays(20)),
                1L
        );
        jdbcTemplate.update(
                "UPDATE schedule SET recruit_end_date = ?, start_date = ? WHERE id = ?",
                Date.valueOf(LocalDate.now().plusDays(1)),
                Date.valueOf(LocalDate.now().plusDays(15)),
                2L
        );
        jdbcTemplate.update(
                "UPDATE schedule SET recruit_end_date = ?, start_date = ? WHERE id = ?",
                Date.valueOf(LocalDate.now().plusDays(10)),
                Date.valueOf(LocalDate.now().plusDays(25)),
                8L
        );

        List<Schedule> latest = scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "latest", null, false, null);
        List<Schedule> deadlineSoon =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "deadlineSoon", null, false, null);
        List<Schedule> deadlineRelaxed =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "deadlineRelaxed", null, false, null);
        List<Schedule> startSoon =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "startSoon", null, false, null);
        List<Schedule> startLate =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "startLate", null, false, null);

        assertIterableEquals(List.of(8L, 2L, 1L), latest.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(2L, 1L, 8L), deadlineSoon.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(8L, 1L, 2L), deadlineRelaxed.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(2L, 1L, 8L), startSoon.stream().map(Schedule::getId).toList());
        assertIterableEquals(List.of(8L, 1L, 2L), startLate.stream().map(Schedule::getId).toList());
    }

    @Test
    void getAllSchedulesShowsOwnHiddenSchedulesForLoggedInViewer() {
        List<Schedule> schedules =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "latest", 100L, false, "viewer@withday.test");

        assertIterableEquals(List.of(9L, 8L, 2L, 1L), schedules.stream().map(Schedule::getId).toList());
    }

    @Test
    void getAllSchedulesShowsHiddenSchedulesForAdminViewer() {
        List<Schedule> schedules =
                scheduleDao.getAllSchedules(null, null, null, null, null, null, null, "latest", 200L, true, "admin@withday.test");

        assertIterableEquals(List.of(10L, 9L, 8L, 2L, 1L), schedules.stream().map(Schedule::getId).toList());
    }

    private void insertSchedule(
            Long id,
            Long userId,
            String title,
            String description,
            String category,
            String region,
            String status,
            int currentParticipants,
            int maxParticipants,
            int isPublic,
            LocalDate recruitEndDate,
            Timestamp deletedAt
    ) {
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
                userId,
                title,
                description,
                category,
                region,
                null,
                null,
                Date.valueOf(LocalDate.now().plusDays(10)),
                Date.valueOf(LocalDate.now().plusDays(12)),
                Date.valueOf(LocalDate.now().minusDays(1)),
                recruitEndDate == null ? null : Date.valueOf(recruitEndDate),
                1,
                maxParticipants,
                currentParticipants,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                status,
                isPublic,
                null,
                Timestamp.valueOf(LocalDate.now().atStartOfDay()),
                Timestamp.valueOf(LocalDate.now().atStartOfDay()),
                deletedAt
        );
    }
}
