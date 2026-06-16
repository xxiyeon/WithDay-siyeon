package com.test.withdayback.common.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Date;

@Component
public class EmailSender {

    @Autowired
    private JavaMailSender sender;

    public void sendMail(String emailTitle, String receiver, String emailContent) {
        MimeMessage message = sender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, "utf-8");

        try {
            // 메일 전송 시간 설정
            helper.setSentDate(new Date());
            // 보내는 사람 정보
            helper.setFrom("shinjiwoong1656@gmail.com");
            // 받는 사람 정보
            helper.setTo(receiver);
            // 제목 설정
            helper.setSubject(emailTitle);
            // 내용 설정
            helper.setText(emailContent, true); // true: HTML 모드 활성화
            //이메일 전송
            sender.send(message);

        } catch (MessagingException e) {
            e.printStackTrace();
        }
    }
}