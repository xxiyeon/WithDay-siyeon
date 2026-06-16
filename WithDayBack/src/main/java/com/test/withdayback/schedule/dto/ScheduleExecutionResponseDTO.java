package com.test.withdayback.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@NoArgsConstructor
@AllArgsConstructor
@Data
public class ScheduleExecutionResponseDTO {
    private Long scheduleId;
    private String status;
    private Integer currentParticipants;
    private Integer maxParticipants;
    private OffsetDateTime updatedAt;
}
