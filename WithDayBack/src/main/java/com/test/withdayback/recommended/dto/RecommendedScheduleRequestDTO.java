package com.test.withdayback.recommended.dto;

import com.test.withdayback.recommended.vo.RecommendedSchedule;
import com.test.withdayback.recommended.vo.RecommendedScheduleDetail;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendedScheduleRequestDTO {
    private RecommendedSchedule recommendedSchedule;
    private List<RecommendedScheduleDetail> detailSchedule;
    private List<Long> deletedImageIds;
}