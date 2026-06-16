package com.test.withdayback.user.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("UserTerms")
public class UserTerms {
    private Long id;
    private Long userId;
    private Long termsId;
    private boolean agreed;
}