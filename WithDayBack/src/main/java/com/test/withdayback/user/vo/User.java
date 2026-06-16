package com.test.withdayback.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("User")
public class User {
    private Long id;
    private String email;
    private String password;
    private String provider;
    private String providerId;
    private String nickname;
    private String profileImage;
    private String birthday;
    private Integer gender;
    private String intro;
    private String phone;
    private String status;
    private String postcode;
    private String address;
    private String detailAddress;
    private String createdAt;

    // createdAt 필드 추가로 Lombok 전체 생성자 시그니처가 바뀌었지만, 기존 테스트/모킹 코드는 예전 15개 인자 순서를 사용 중이라 호환 생성자를 유지한다.
    public User(
            Long id,
            String email,
            String password,
            String provider,
            String providerId,
            String nickname,
            String profileImage,
            String birthday,
            Integer gender,
            String phone,
            String status,
            String postcode,
            String address,
            String detailAddress,
            String createdAt
    ) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.provider = provider;
        this.providerId = providerId;
        this.nickname = nickname;
        this.profileImage = profileImage;
        this.birthday = birthday;
        this.gender = gender;
        // 예전 시그니처에는 intro 자리가 없었으므로 이 호환 생성자 경로에서는 null 로 둔다.
        this.intro = null;
        this.phone = phone;
        this.status = status;
        this.postcode = postcode;
        this.address = address;
        this.detailAddress = detailAddress;
        this.createdAt = createdAt;
    }
}
