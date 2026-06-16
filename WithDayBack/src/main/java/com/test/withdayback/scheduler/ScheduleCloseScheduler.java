package com.test.withdayback.scheduler;

import com.test.withdayback.admin.dao.AdminDao;
import com.test.withdayback.schedule.dao.ScheduleDao;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class ScheduleCloseScheduler {

    @Autowired
    private ScheduleDao scheduleDao;

    @Autowired
    private AdminDao adminDao;

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void closeExpiredSchedules(){
        scheduleDao.closeExpiredSchedules();
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public void saveDashboard() {

        LocalDate statDate = LocalDate.now().minusDays(1); // 어제까지 전체 회원 수

        int userCount = adminDao.selectUserCount();
        int scheduleCount = adminDao.selectScheduleCount();

        adminDao.insertDashboard(
                statDate,
                userCount,
                scheduleCount
        );
    }
}
