package com.test.withdayback.user.dao;

import com.test.withdayback.user.dto.FindAccountDTO;
import com.test.withdayback.user.vo.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mybatis.spring.boot.test.autoconfigure.MybatisTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

@MybatisTest
@ActiveProfiles("test")
class UserDaoAdminStatusTest {

    @Autowired
    private UserDao userDao;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule_image");
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule_detail");
        jdbcTemplate.execute("DROP TABLE IF EXISTS participation");
        jdbcTemplate.execute("DROP TABLE IF EXISTS notification");
        jdbcTemplate.execute("DROP TABLE IF EXISTS schedule");
        jdbcTemplate.execute("DROP TABLE IF EXISTS bookmark");
        jdbcTemplate.execute("DROP TABLE IF EXISTS user_interests");
        jdbcTemplate.execute("DROP TABLE IF EXISTS user_terms");
        jdbcTemplate.execute("DROP TABLE IF EXISTS interests");
        jdbcTemplate.execute("DROP TABLE IF EXISTS terms");
        jdbcTemplate.execute("DROP TABLE IF EXISTS `user`");
        jdbcTemplate.execute("""
                CREATE TABLE `user` (
                    id BIGINT PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    password VARCHAR(255) NULL,
                    provider VARCHAR(50) NULL,
                    provider_id VARCHAR(255) NULL,
                    nickname VARCHAR(255) NULL,
                    profile_image VARCHAR(255) NULL,
                    birthday VARCHAR(20) NULL,
                    gender INT NULL,
                    phone VARCHAR(50) NULL,
                    status VARCHAR(20) NULL,
                    postcode VARCHAR(50) NULL,
                    address VARCHAR(255) NULL,
                    detail_address VARCHAR(255) NULL,
                    created_at TIMESTAMP NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE bookmark (
                    id BIGINT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    schedule_id BIGINT NOT NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE user_interests (
                    user_id BIGINT NOT NULL,
                    interest_id BIGINT NOT NULL,
                    created_at TIMESTAMP NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE user_terms (
                    user_id BIGINT NOT NULL,
                    terms_id BIGINT NOT NULL,
                    agreed BOOLEAN NULL,
                    agreed_at TIMESTAMP NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE notification (
                    id BIGINT PRIMARY KEY,
                    receiver_id BIGINT NULL,
                    target_url VARCHAR(255) NULL,
                    type VARCHAR(50) NULL,
                    title VARCHAR(255) NULL,
                    message VARCHAR(255) NULL,
                    is_read INT NULL,
                    created_at TIMESTAMP NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE schedule (
                    id BIGINT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    title VARCHAR(255) NULL,
                    status VARCHAR(20) NULL,
                    deleted_at TIMESTAMP NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE schedule_detail (
                    id BIGINT PRIMARY KEY,
                    schedule_id BIGINT NOT NULL,
                    day_number INT NULL,
                    title VARCHAR(255) NULL,
                    description VARCHAR(255) NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE schedule_image (
                    id BIGINT PRIMARY KEY,
                    schedule_id BIGINT NOT NULL,
                    image_url VARCHAR(255) NULL,
                    is_thumbnail INT NULL
                )
                """);
        jdbcTemplate.execute("""
                CREATE TABLE participation (
                    id BIGINT PRIMARY KEY,
                    user_id BIGINT NOT NULL,
                    schedule_id BIGINT NOT NULL,
                    status VARCHAR(20) NULL,
                    created_at TIMESTAMP NULL
                )
                """);
        jdbcTemplate.update(
                """
                INSERT INTO `user` (
                    id, email, password, provider, provider_id, nickname,
                    profile_image, birthday, gender, phone, status,
                    postcode, address, detail_address, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
                """,
                1L, "admin@withday.test", "before-password", "local", "", "admin-user",
                null, null, null, "010-1111-2222", "admin", null, null, null
        );
        jdbcTemplate.update(
                """
                INSERT INTO `user` (
                    id, email, password, provider, provider_id, nickname,
                    profile_image, birthday, gender, phone, status,
                    postcode, address, detail_address, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
                """,
                2L, "suspended@withday.test", "before-password", "local", "", "suspended-user",
                null, null, null, "010-9999-9999", "suspended", null, null, null
        );
        jdbcTemplate.update(
                "INSERT INTO bookmark (id, user_id, schedule_id) VALUES (?, ?, ?), (?, ?, ?)",
                1L, 1L, 10L,
                2L, 1L, 11L
        );
        jdbcTemplate.update(
                "INSERT INTO user_interests (user_id, interest_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP())",
                1L, 99L
        );
        jdbcTemplate.update(
                "INSERT INTO user_terms (user_id, terms_id, agreed, agreed_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP())",
                1L, 4L, true
        );
        jdbcTemplate.update(
                """
                INSERT INTO notification (id, receiver_id, target_url, type, title, message, is_read, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP())
                """,
                1L, 1L, "/schedule/10", "APPLY", "title", "message", 0
        );
        jdbcTemplate.update(
                "INSERT INTO schedule (id, user_id, title, status, deleted_at) VALUES (?, ?, ?, ?, NULL)",
                10L, 1L, "hosted schedule", "recruiting"
        );
        jdbcTemplate.update(
                """
                INSERT INTO schedule_detail (id, schedule_id, day_number, title, description)
                VALUES (?, ?, ?, ?, ?)
                """,
                1L, 10L, 1, "day1", "desc"
        );
        jdbcTemplate.update(
                """
                INSERT INTO schedule_image (id, schedule_id, image_url, is_thumbnail)
                VALUES (?, ?, ?, ?)
                """,
                1L, 10L, "https://image.test/1", 1
        );
        jdbcTemplate.update(
                """
                INSERT INTO participation (id, user_id, schedule_id, status, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP()), (?, ?, ?, ?, CURRENT_TIMESTAMP()), (?, ?, ?, ?, CURRENT_TIMESTAMP())
                """,
                1L, 1L, 999L, "approved",
                2L, 2L, 10L, "pending",
                3L, 1L, 998L, "pending"
        );
        jdbcTemplate.update(
                "INSERT INTO bookmark (id, user_id, schedule_id) VALUES (?, ?, ?)",
                3L, 2L, 10L
        );
    }

    @Test
    void findByNicknameAndPhoneIncludesAdminStatusUser() {
        User result = userDao.findByNicknameAndPhone(
                new FindAccountDTO("admin-user", "010-1111-2222", null, null, null)
        );

        assertNotNull(result);
        assertEquals("admin@withday.test", result.getEmail());
    }

    @Test
    void updatePasswordUpdatesAdminStatusUser() {
        userDao.updatePassword("admin@withday.test", "after-password");

        String storedPassword = jdbcTemplate.queryForObject(
                "SELECT password FROM `user` WHERE email = ?",
                String.class,
                "admin@withday.test"
        );

        assertEquals("after-password", storedPassword);
    }

    @Test
    void findByEmailExcludesSuspendedUserButFindAnyByEmailIncludesIt() {
        User filteredUser = userDao.findByEmail("suspended@withday.test");
        User rawUser = userDao.findAnyByEmail("suspended@withday.test");

        assertNull(filteredUser);
        assertNotNull(rawUser);
        assertEquals("suspended", rawUser.getStatus());
    }

    @Test
    void softDeleteUserSuspendsAccountAndDeletesBookmarks() {
        userDao.deleteBookmarksByUserId(1L);
        int updated = userDao.softDeleteUser(1L, "deleted+1+123@withdrawn.withday.local");

        assertEquals(1, updated);
        assertEquals(
                "suspended",
                jdbcTemplate.queryForObject(
                        "SELECT status FROM `user` WHERE id = ?",
                        String.class,
                        1L
                )
        );
        assertEquals(
                "deleted+1+123@withdrawn.withday.local",
                jdbcTemplate.queryForObject(
                        "SELECT email FROM `user` WHERE id = ?",
                        String.class,
                        1L
                )
        );
        assertEquals(
                0,
                jdbcTemplate.queryForObject(
                        "SELECT COUNT(*) FROM bookmark WHERE user_id = ?",
                        Integer.class,
                        1L
                )
        );
    }

    @Test
    void withdrawCleanupDeletesRowsLinkedToDeletedUserIdAcrossTables() {
        userDao.closeSchedulesByHostUserId(1L);
        userDao.deleteNonApprovedParticipationsByUserId(1L);
        userDao.deleteBookmarksByUserId(1L);
        userDao.deleteUserInterests(1L);
        userDao.deleteUserTermsByUserId(1L);
        userDao.deleteNotificationsByUserId(1L);

        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM user_interests WHERE user_id = 1", Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM user_terms WHERE user_id = 1", Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM notification WHERE receiver_id = 1", Integer.class));
        assertEquals("closed", jdbcTemplate.queryForObject("SELECT status FROM schedule WHERE id = 10", String.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM participation WHERE user_id = 1", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM participation WHERE user_id = 1 AND status = 'approved'", Integer.class));
        assertEquals(0, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM participation WHERE user_id = 1 AND status <> 'approved'", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM participation WHERE schedule_id = 10", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bookmark WHERE schedule_id = 10", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM schedule_detail WHERE schedule_id = 10", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM schedule_image WHERE schedule_id = 10", Integer.class));
        assertEquals(1, jdbcTemplate.queryForObject("SELECT COUNT(*) FROM schedule WHERE user_id = 1", Integer.class));
    }
}
