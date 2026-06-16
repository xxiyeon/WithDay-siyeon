package com.test.withdayback.notification.dao;

import com.test.withdayback.notification.vo.Notification;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

@Mapper
public interface NotificationDao {
    List<Notification> getNotificationsById(Long id);

    void insertNotification(Notification notification);

    void readNotification(Long notificationId);

    int getNotificationCountById(Long id);

    int getNotificationTerm(Long id);

    void deleteNotification(Long notificationId);

    void deleteReadNotifications(Long id);

    void deleteAllNotifications(Long id);

    void readAllNotification(Long id);
}
