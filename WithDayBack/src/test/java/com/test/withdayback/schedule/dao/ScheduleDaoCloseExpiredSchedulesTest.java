package com.test.withdayback.schedule.dao;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;

@MybatisTest
@ActiveProfiles("test")
class ScheduleDaoCloseExpiredSchedulesTest {

    @Autowired
    private ScheduleDao scheduleDao;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule");
        jdbcTemplate.execute("""
                CREATE TABLE schedule (
                    id BIGINT PRIMARY KEY,
                    status VARCHAR(20) NOT NULL,
                    recruit_end_date TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NULL,
                    deleted_at TIMESTAMP NULL
                )
                """);

        insertSchedule(1L, "recruiting", Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)), null);
        insertSchedule(2L, "recruiting", Timestamp.from(Instant.now().plus(1, ChronoUnit.DAYS)), null);
        insertSchedule(3L, "closed", Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)), null);
        insertSchedule(4L, "recruiting", Timestamp.from(Instant.now().minus(1, ChronoUnit.DAYS)), Timestamp.from(Instant.now()));
    }

    @Test
    void closeExpiredSchedulesClosesOnlyExpiredRecruitingSchedules() {
        int updatedCount = scheduleDao.closeExpiredSchedules();

        assertEquals(1, updatedCount);
        assertEquals("closed", findStatus(1L));
        assertEquals("recruiting", findStatus(2L));
        assertEquals("closed", findStatus(3L));
        assertEquals("recruiting", findStatus(4L));
    }

    private void insertSchedule(Long id, String status, Timestamp recruitEndDate, Timestamp deletedAt) {
        jdbcTemplate.update(
                "INSERT INTO schedule (id, status, recruit_end_date, updated_at, deleted_at) VALUES (?, ?, ?, NULL, ?)",
                id,
                status,
                recruitEndDate,
                deletedAt
        );
    }

    private String findStatus(Long id) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM schedule WHERE id = ?",
                String.class,
                id
        );
    }
}
