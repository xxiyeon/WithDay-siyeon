package com.test.withdayback.schedule.dto;

import lombok.Data;
import org.apache.ibatis.type.Alias;

@Data
@Alias("BookmarkToggleRequest")
public class BookmarkToggleRequestDTO {
    /*
     * POST /bookmarks는 "어떤 일정을 저장할지"만 알면 된다.
     * 사용자 식별은 Authorization 헤더에서 분리해서 얻기 때문에 body는 scheduleId 하나로 고정한다.
     */
    private Long scheduleId;
}
