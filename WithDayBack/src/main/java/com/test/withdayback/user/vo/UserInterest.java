package com.test.withdayback.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("UserInterest")
public class UserInterest {
    private Long id;
    private Long userId;
    private Long interestId;
}