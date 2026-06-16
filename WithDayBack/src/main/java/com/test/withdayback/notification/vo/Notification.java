package com.test.withdayback.notification.vo;

import com.test.withdayback.notification.enums.NotificationType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("Notification")
public class Notification {
    private Long id;
    private Long receiverId;
    private String targetUrl;
    private NotificationType type;
    private String title;
    private String message;
    private Integer isRead;
    private String createdAt;
}
