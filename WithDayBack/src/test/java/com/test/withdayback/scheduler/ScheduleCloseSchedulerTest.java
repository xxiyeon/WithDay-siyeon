package com.test.withdayback.scheduler;

import com.test.withdayback.schedule.dao.ScheduleDao;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.scheduling.annotation.Scheduled;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ScheduleCloseSchedulerTest {

    @Mock
    private ScheduleDao scheduleDao;

    @InjectMocks
    private ScheduleCloseScheduler scheduleCloseScheduler;

    @Test
    void closeExpiredSchedulesIsScheduledAtMidnightInSeoul() throws NoSuchMethodException {
        Method method = ScheduleCloseScheduler.class.getDeclaredMethod("closeExpiredSchedules");
        Scheduled scheduled = method.getAnnotation(Scheduled.class);

        assertNotNull(scheduled);
        assertEquals("0 0 0 * * *", scheduled.cron());
        assertEquals("Asia/Seoul", scheduled.zone());
    }

    @Test
    void closeExpiredSchedulesDelegatesToDao() {
        scheduleCloseScheduler.closeExpiredSchedules();

        verify(scheduleDao).closeExpiredSchedules();
    }
}
