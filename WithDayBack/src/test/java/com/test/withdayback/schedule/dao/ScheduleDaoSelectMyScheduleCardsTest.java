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
class ScheduleDaoSelectMyScheduleCardsTest {

    @Autowired
    private ScheduleDao scheduleDao;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        // selectMyScheduleCards 가 의존하는 최소 테이블만 구성해 host/participant/status 조합을 명시적으로 검증한다.
        jdbcTemplate.execute("DROP TABLE IF EXISTS participation");
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule");
        jdbcTemplate.execute("DROP TABLE IF EXISTS `user`");

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
                    region VARCHAR(100) NULL,
                    detail_region VARCHAR(100) NULL,
                    start_date DATE NULL,
                    end_date DATE NULL,
                    thumbnail_image VARCHAR(255) NULL,
                    current_participants INT NULL,
                    max_participants INT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP NULL,
                    deleted_at TIMESTAMP NULL
                )
                """);

        jdbcTemplate.execute("""
                CREATE TABLE participation (
                    id BIGINT PRIMARY KEY,
                    schedule_id BIGINT NOT NULL,
                    user_id BIGINT NOT NULL,
                    status VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP NULL,
                    updated_at TIMESTAMP NULL,
                    deleted_at TIMESTAMP NULL
                )
                """);

        jdbcTemplate.update(
                "INSERT INTO `user` (id, email, status) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?)",
                10L, "viewer@withday.test", "active",
                20L, "other-host@withday.test", "active",
                30L, "third@withday.test", "active"
        );

        // 1: host completed, participation 없음 -> 반드시 포함돼야 하는 핵심 회귀 케이스
        insertSchedule(1L, 10L, "내가 만든 완료 일정", LocalDate.of(2026, 6, 10), "completed", null);
        // 2: approved participation completed -> 기존 쿼리도 포함했지만 계속 유지되어야 한다.
        insertSchedule(2L, 20L, "내가 참여한 완료 일정", LocalDate.of(2026, 6, 12), "completed", null);
        // 3: completed 여도 pending 참여자는 로그에 보이면 안 된다.
        insertSchedule(3L, 20L, "대기중이라 제외될 완료 일정", LocalDate.of(2026, 6, 14), "completed", null);
        // 4: host 여도 completed 가 아니면 로그 대상이 아니다.
        insertSchedule(4L, 10L, "모집중 생성 일정", LocalDate.of(2026, 6, 16), "recruiting", null);
        // 5: approved 참여 이력이 있어도 soft delete 일정은 제외되어야 한다.
        insertSchedule(5L, 20L, "삭제된 완료 일정", LocalDate.of(2026, 6, 18), "completed", Timestamp.valueOf("2026-06-18 00:00:00"));
        // 6: host + approved participation 이 둘 다 걸리는 중복 케이스 -> 결과는 1건이어야 한다.
        insertSchedule(6L, 10L, "호스트+참여 중복 완료 일정", LocalDate.of(2026, 6, 20), "completed", null);
        // 7: 상태 자체가 canceled 면 로그 대상이 아니다.
        insertSchedule(7L, 20L, "취소된 일정", LocalDate.of(2026, 6, 22), "canceled", null);

        insertParticipation(101L, 2L, 10L, "approved");
        insertParticipation(102L, 3L, 10L, "pending");
        insertParticipation(103L, 5L, 10L, "approved");
        insertParticipation(104L, 6L, 10L, "approved");
    }

    @Test
    void selectMyScheduleCardsIncludesHostedAndApprovedCompletedSchedulesWithoutDuplicates() {
        List<Schedule> schedules = scheduleDao.selectMyScheduleCards(10L);

        // 종료일 최신순 정렬 + host/participant 합집합 + 중복 제거까지 한 번에 검증한다.
        assertIterableEquals(
                List.of(6L, 2L, 1L),
                schedules.stream().map(Schedule::getId).toList()
        );
        assertEquals("completed", schedules.get(0).getStatus().name());
        assertEquals("호스트+참여 중복 완료 일정", schedules.get(0).getTitle());
        assertEquals("내가 참여한 완료 일정", schedules.get(1).getTitle());
        assertEquals("내가 만든 완료 일정", schedules.get(2).getTitle());
    }

    @Test
    void selectMyScheduleCardsExcludesNonApprovedOrNonCompletedSchedules() {
        List<Schedule> schedules = scheduleDao.selectMyScheduleCards(10L);

        List<Long> ids = schedules.stream().map(Schedule::getId).toList();

        // 각각 pending / non-completed / deleted / canceled 제외 조건이 독립적으로 유지되는지 본다.
        assertEquals(false, ids.contains(3L));
        assertEquals(false, ids.contains(4L));
        assertEquals(false, ids.contains(5L));
        assertEquals(false, ids.contains(7L));
    }

    private void insertSchedule(
            Long id,
            Long userId,
            String title,
            LocalDate endDate,
            String status,
            Timestamp deletedAt
    ) {
        jdbcTemplate.update(
                """
                INSERT INTO schedule (
                    id, user_id, title, region, detail_region,
                    start_date, end_date, thumbnail_image, current_participants,
                    max_participants, status, created_at, deleted_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(), ?)
                """,
                id,
                userId,
                title,
                "SEOUL",
                "GANGNAM",
                Date.valueOf(endDate.minusDays(1)),
                Date.valueOf(endDate),
                null,
                2,
                4,
                status,
                deletedAt
        );
    }

    private void insertParticipation(Long id, Long scheduleId, Long userId, String status) {
        jdbcTemplate.update(
                """
                INSERT INTO participation (
                    id, schedule_id, user_id, status, created_at, updated_at, deleted_at
                ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), NULL)
                """,
                id,
                scheduleId,
                userId,
                status
        );
    }
}
