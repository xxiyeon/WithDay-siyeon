package com.test.withdayback.region.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("DetailRegion")
public class DetailRegion {
    private int detailId;
    private String detailName;
    private int regionId;
}
