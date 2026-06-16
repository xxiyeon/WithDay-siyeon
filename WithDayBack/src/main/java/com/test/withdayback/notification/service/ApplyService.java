package com.test.withdayback.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor

// 참가 신청 / 승인 / 거절 / 추방 알림 연결 서비스
public class ApplyService {

    private final NotificationService notificationService;

    // 신청자 -> 호스트 (참가 신청)
    public void apply(
            Long hostId,
            String hostEmail,
            String senderNickname,
            String title,
            long scheduleId
    ) {

        // 호스트에게 신청 알림 전송
        notificationService.notifyApply(
                hostId,
                hostEmail,
                senderNickname,
                title,
                scheduleId
        );
    }

    // 호스트 -> 신청자 (승인)
    public void approve(
            Long userId,
            String userEmail,
            String senderNickname,
            String title
    ) {

        // 신청자에게 승인 알림 전송
        notificationService.notifyApproved(
                userId,
                userEmail,
                senderNickname,
                title
        );
    }

    // 호스트 -> 신청자 (거절)
    public void rejected(
            Long userId,
            String userEmail,
            String senderNickname,
            String title
    ) {

        // 신청자에게 거절 알림 전송
        notificationService.notifyRejected(
                userId,
                userEmail,
                senderNickname,
                title
        );
    }

    // 호스트 -> 신청자 (추방)
    public void kick(
            Long userId,
            String userEmail,
            String senderNickname,
            String title
    ) {

        // 신청자에게 추방 알림 전송
        notificationService.notifyKick(
                userId,
                userEmail,
                senderNickname,
                title
        );
    }
}