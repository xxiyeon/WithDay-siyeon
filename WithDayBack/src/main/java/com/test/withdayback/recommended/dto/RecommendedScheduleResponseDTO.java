package com.test.withdayback.recommended.dto;

import com.test.withdayback.recommended.vo.RecommendedSchedule;
import com.test.withdayback.recommended.vo.RecommendedScheduleDetail;
import com.test.withdayback.recommended.vo.RecommendedScheduleImage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendedScheduleResponseDTO {
    private RecommendedSchedule recommendedSchedule;
    private List<RecommendedScheduleDetail> detailSchedule;
    private List<RecommendedScheduleImage> images;
}