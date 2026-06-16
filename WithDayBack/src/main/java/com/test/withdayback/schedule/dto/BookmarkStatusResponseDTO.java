package com.test.withdayback.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Alias("BookmarkStatusResponse")
public class BookmarkStatusResponseDTO {
    /*
     * 북마크 토글 응답은 복잡한 payload보다 "대상 일정 id + 최종 저장 상태"만 확정해주면 충분하다.
     * 프론트는 이 결과를 optimistic update 재동기화와 토스트 문구 결정에 사용한다.
     */
    private Long scheduleId;
    private Boolean isBookmarked;
}
