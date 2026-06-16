package com.test.withdayback.notification.service;

import com.test.withdayback.notification.dao.NotificationDao;
import com.test.withdayback.notification.enums.NotificationType;
import com.test.withdayback.notification.vo.Notification;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor

// 알림 발송
public class NotificationService {

    @Autowired
    private NotificationDao notificationDao;

    @Autowired
    private final OneSignalService oneSignalService;

    // 신청자 -> 호스트 (참가 신청)
    public void notifyApply(
            Long receiverId,
            String receiverEmail,
            String senderNickname,
            String title,
            long scheduleId
    ) {

        String message =
                String.format("[요청] %s님이 참가 신청을 했습니다.", senderNickname);

        // DB에 알림 저장
        Notification notification = new Notification();

        notification.setReceiverId(receiverId);
        notification.setTargetUrl("/schedule/" + scheduleId);
        notification.setType(NotificationType.APPLY);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setIsRead(0);

        notificationDao.insertNotification(notification);

        oneSignalService.sendToUser(
                receiverEmail,
                NotificationType.APPLY.getTitle(),
                message
        );
    }

    // 호스트 -> 신청자 (승인)
    public void notifyApproved(
            Long receiverId,
            String receiverEmail,
            String senderNickname,
            String title
    ) {

        String message =
                String.format("[승인] %s님이 참가 신청을 승인했습니다.", senderNickname);

        // DB에 알림 저장
        Notification notification = new Notification();

        notification.setReceiverId(receiverId);
        notification.setTargetUrl("/my-schedule");
        notification.setType(NotificationType.APPROVE);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setIsRead(0);

        notificationDao.insertNotification(notification);

        oneSignalService.sendToUser(
                receiverEmail,
                NotificationType.APPROVE.getTitle(),
                message
        );
    }

    // 호스트 -> 신청자 (거절)
    public void notifyRejected(
            Long receiverId,
            String receiverEmail,
            String senderNickname,
            String title
    ) {

        String message =
                String.format("[거부] %s님이 참가 신청을 거절했습니다.", senderNickname);

        // DB에 알림 저장
        Notification notification = new Notification();

        notification.setReceiverId(receiverId);
        notification.setTargetUrl("/my-schedule");
        notification.setType(NotificationType.REJECT);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setIsRead(0);

        notificationDao.insertNotification(notification);

        oneSignalService.sendToUser(
                receiverEmail,
                NotificationType.REJECT.getTitle(),
                message
        );
    }

    // 호스트 -> 신청자 (강퇴)
    public void notifyKick(
            Long receiverId,
            String receiverEmail,
            String senderNickname,
            String title
    ) {

        String message =
                String.format("[추방] %s님이 플랜에서 추방했습니다.", senderNickname);

        // DB에 알림 저장
        Notification notification = new Notification();

        notification.setReceiverId(receiverId);
        notification.setTargetUrl("/my-schedule");
        notification.setType(NotificationType.KICK);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setIsRead(0);

        notificationDao.insertNotification(notification);

        oneSignalService.sendToUser(
                receiverEmail,
                NotificationType.KICK.getTitle(),
                message
        );
    }

    public List<Notification> getNotifications(Long id) {
        return notificationDao.getNotificationsById(id);
    }

    public void readNotification(Long notificationId) {
        notificationDao.readNotification(notificationId);
    }

    public int getNotificationCount(Long id) {
        return notificationDao.getNotificationCountById(id);
    }

    public int getNotificationTerm(Long id) {
        return notificationDao.getNotificationTerm(id);
    }

    public void deleteNotification(Long notificationId) {
        notificationDao.deleteNotification(notificationId);
    }

    public void deleteReadNotifications(Long id) {
        notificationDao.deleteReadNotifications(id);
    }

    public void deleteAllNotifications(Long id) {
        notificationDao.deleteAllNotifications(id);
    }

    public void readAllNotification(Long id) {
        notificationDao.readAllNotification(id);
    }
}