package com.test.withdayback.participation.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ParticipationStatusTest {

    @Test
    void fromValueMapsCanceledAliasToCanceled() {
        assertEquals(ParticipationStatus.CANCELED, ParticipationStatus.fromValue("canceled"));
        assertEquals(ParticipationStatus.CANCELED, ParticipationStatus.fromValue("CANCELLED"));
    }

    @Test
    void getDatabaseValueReturnsLowercaseEnumLiteral() {
        assertEquals("pending", ParticipationStatus.PENDING.getDatabaseValue());
        assertEquals("canceled", ParticipationStatus.CANCELED.getDatabaseValue());
    }
}
