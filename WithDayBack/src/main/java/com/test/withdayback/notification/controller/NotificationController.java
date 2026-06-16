package com.test.withdayback.notification.controller;

import com.test.withdayback.common.util.JwtUtil;
import com.test.withdayback.notification.service.NotificationService;
import com.test.withdayback.notification.vo.Notification;
import com.test.withdayback.user.service.UserService;
import com.test.withdayback.user.vo.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
@CrossOrigin("*")
public class NotificationController {
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private NotificationService notificationService;
    @Autowired
    private UserService userService;

    @GetMapping("/count")
    public ResponseEntity<?> getNotificationCount(
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.replace("Bearer ", "");

            String email = jwtUtil.getEmail(token);

            User user = userService.findByEmail(email);

            int count = notificationService.getNotificationCount(user.getId());

            return ResponseEntity.ok(count);

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getNotifications(
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.replace("Bearer ", "");

            String email = jwtUtil.getEmail(token);

            User user = userService.findByEmail(email);

            List<Notification> notifications =
                    notificationService.getNotifications(user.getId());

            return ResponseEntity.ok(notifications);

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @PatchMapping("/read")
    public ResponseEntity<?> readAllNotification(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");

            String email = jwtUtil.getEmail(token);

            User user = userService.findByEmail(email);

            notificationService.readAllNotification(user.getId());

            return ResponseEntity.ok().build();

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<?> readNotification(@PathVariable Long notificationId) {
        notificationService.readNotification(notificationId);

        return ResponseEntity.ok().build();
    }

    @GetMapping("/notification-term")
    public ResponseEntity<?> getNotificationTerm(@RequestHeader("Authorization") String authHeader
    ) {
        try {
            String token = authHeader.replace("Bearer ", "");

            String email = jwtUtil.getEmail(token);

            User user = userService.findByEmail(email);

            int agreed = notificationService.getNotificationTerm(user.getId());

            return ResponseEntity.ok(agreed);

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long notificationId){
        notificationService.deleteNotification(notificationId);

        return ResponseEntity.ok().build();
    }

    @DeleteMapping(value = "/read")
    public ResponseEntity<?> deleteReadNotifications(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");

            String email = jwtUtil.getEmail(token);

            User user = userService.findByEmail(email);

            notificationService.deleteReadNotifications(user.getId());
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }

    @DeleteMapping(value = "")
    public ResponseEntity<?> deleteAllNotifications(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = authHeader.replace("Bearer ", "");

            String email = jwtUtil.getEmail(token);

            User user = userService.findByEmail(email);

            notificationService.deleteAllNotifications(user.getId());
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            e.printStackTrace();

            return ResponseEntity.badRequest()
                    .body(e.getMessage());
        }
    }


}

