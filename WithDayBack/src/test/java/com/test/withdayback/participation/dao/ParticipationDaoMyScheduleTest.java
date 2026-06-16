package com.test.withdayback.participation.dao;

import com.test.withdayback.participation.dto.MyScheduleResponseDTO;
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
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@MybatisTest
@ActiveProfiles("test")
class ParticipationDaoMyScheduleTest {

    @Autowired
    private ParticipationDao participationDao;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS participation");
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule_image");
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule");
        jdbcTemplate.execute("DROP TABLE IF EXISTS `user`");

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
                    category VARCHAR(50) NULL,
                    title VARCHAR(255) NULL,
                    region VARCHAR(100) NULL,
                    start_date DATE NULL,
                    end_date DATE NULL,
                    recruit_end_date DATE NULL,
                    current_participants INT NULL,
                    max_participants INT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP NULL,
                    deleted_at TIMESTAMP NULL
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE schedule_image (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    schedule_id BIGINT NOT NULL,
                    image_url VARCHAR(255) NULL,
                    is_thumbnail TINYINT NOT NULL
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE participation (
                    id BIGINT PRIMARY KEY,
                    schedule_id BIGINT NOT NULL,
                    user_id BIGINT NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP NULL
                )
                """);

        jdbcTemplate.update(
                "INSERT INTO `user` (id, email) VALUES (?, ?), (?, ?), (?, ?)",
                10L, "viewer@withday.test",
                20L, "host@withday.test",
                30L, "third@withday.test"
        );

        insertSchedule(1L, 10L, "host-self-approved", "approved", null);
        insertSchedule(2L, 20L, "other-approved", "approved", null);
        insertSchedule(3L, 30L, "other-pending", "recruiting", null);
        insertSchedule(4L, 10L, "host-recruiting", "recruiting", null);
        insertSchedule(5L, 10L, "host-canceled", "canceled", null);
        insertSchedule(6L, 20L, "deleted-hosting", "completed", Timestamp.valueOf("2099-12-31 00:00:00"));

        insertParticipation(101L, 1L, 10L, "approved");
        insertParticipation(102L, 2L, 10L, "approved");
        insertParticipation(103L, 3L, 10L, "pending");
        insertParticipation(104L, 5L, 10L, "approved");
    }

    @Test
    void getMyParticipationsExcludesHostedSchedules() {
        List<MyScheduleResponseDTO> schedules = participationDao.getMyParticipations(
                10L,
                List.of("APPROVED", "PENDING")
        );

        assertIterableEquals(
                List.of(2L, 3L),
                schedules.stream().map(MyScheduleResponseDTO::getScheduleId).toList()
        );

        assertFalse(schedules.stream().anyMatch(MyScheduleResponseDTO::getHost));
        assertTrue(schedules.stream().allMatch(item -> "participant".equals(item.getMyRole())));
    }

    @Test
    void getMyHostingSchedulesReturnsAllHostedSchedulesWithoutParticipationDuplicates() {
        List<MyScheduleResponseDTO> schedules = participationDao.getMyHostingSchedules(10L);

        assertIterableEquals(
                List.of(1L, 4L, 5L),
                schedules.stream().map(MyScheduleResponseDTO::getScheduleId).toList()
        );

        assertTrue(schedules.stream().allMatch(MyScheduleResponseDTO::getHost));
        assertTrue(schedules.stream().allMatch(item -> "host".equals(item.getMyRole())));
        assertNull(schedules.stream()
                .filter(item -> item.getScheduleId().equals(1L))
                .findFirst()
                .orElseThrow()
                .getParticipationId());
    }

    private void insertSchedule(
            Long id,
            Long userId,
            String title,
            String status,
            Timestamp deletedAt
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO schedule (
                    id, user_id, category, title, region,
                    start_date, end_date, recruit_end_date, current_participants,
                    max_participants, status, created_at, deleted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)
                """,
                id,
                userId,
                "travel",
                title,
                "SEOUL",
                Date.valueOf(LocalDate.of(2099, 12, 1).plusDays(id)),
                Date.valueOf(LocalDate.of(2099, 12, 2).plusDays(id)),
                Date.valueOf(LocalDate.of(2099, 11, 30).plusDays(id)),
                1,
                4,
                status,
                deletedAt
        );
    }

    private void insertParticipation(Long id, Long scheduleId, Long userId, String status) {
        jdbcTemplate.update(
                """
                INSERT INTO participation (
                    id, schedule_id, user_id, status, created_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP())
                """,
                id,
                scheduleId,
                userId,
                status
        );
    }
}
