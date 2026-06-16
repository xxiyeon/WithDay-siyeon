package com.test.withdayback.schedule.dto;

import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.schedule.vo.ScheduleDetail;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.apache.ibatis.type.Alias;

import java.util.List;

@NoArgsConstructor
@AllArgsConstructor
@Data
@Alias("ScheduleRequest")
public class ScheduleRequestDTO {
    private String email;
    private Schedule schedule;
    private List<ScheduleDetail> detailSchedule;
    // 삭제할 이미지
    private List<Long> deletedImageIds;
}