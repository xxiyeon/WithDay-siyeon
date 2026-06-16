package com.test.withdayback.participation.enums;

import java.util.Locale;

/*
 * 참여 상태의 서버 표준 enum이다.
 * DB에는 소문자 문자열(pending, approved, rejected, canceled, kicked)로 저장하고,
 * Java/프론트 응답에서는 enum 이름(PENDING, APPROVED, REJECTED, CANCELED, KICKED)을 기준으로 비교한다.
 */
public enum ParticipationStatus {
    PENDING("pending"),
    APPROVED("approved"),
    REJECTED("rejected"),
    CANCELED("canceled"),
    KICKED("kicked");

    private final String databaseValue;

    ParticipationStatus(String databaseValue) {
        this.databaseValue = databaseValue;
    }

    /*
     * 외부 입력이나 DB 조회값을 enum으로 변환한다.
     * 취소 상태는 미국식 CANCELED와 영국식 CANCELLED가 섞일 수 있어서 둘 다 CANCELED enum으로 보정한다.
     */
    public static ParticipationStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("참여 상태가 필요합니다.");
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT);

        if ("CANCELED".equals(normalized) || "CANCELLED".equals(normalized)) {
            return CANCELED;
        }

        return ParticipationStatus.valueOf(normalized);
    }

    /*
     * Mapper나 다른 레이어에서 읽은 상태 문자열을 프론트가 비교하기 쉬운 대문자 enum 이름으로 맞춘다.
     */
    public static String normalizeDatabaseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        ParticipationStatus status = fromValue(value);

        return status.name();
    }

    /*
     * 실제 DB에 저장할 literal이다.
     * CANCELED enum도 기존 DB 스키마와 호환되도록 "canceled"로 저장한다.
     */
    public String getDatabaseValue() {
        return databaseValue;
    }

    /*
     * 참여 상태 전이 규칙이다.
     * PENDING은 승인/거절/취소로 갈 수 있고, APPROVED는 사용자 취소(CANCELED) 또는 호스트 강퇴(KICKED)만 가능하다.
     * 이미 거절/취소/강퇴된 상태는 다시 되돌리지 않아 이력과 인원 수가 꼬이지 않게 한다.
     */
    public boolean canTransitionTo(ParticipationStatus targetStatus) {
        return switch (this) {
            case PENDING -> targetStatus == APPROVED
                    || targetStatus == REJECTED
                    || targetStatus == CANCELED;
            case APPROVED -> targetStatus == CANCELED
                    || targetStatus == KICKED;
            default -> false;
        };
    }

    // 승인 상태는 일정의 확정 인원 수에 영향을 주는 상태다.
    public boolean affectsParticipantCountOnApproval() {
        return this == APPROVED;
    }

    // 알림이나 화면 분기에서 승인 여부만 빠르게 확인할 때 사용한다.
    public boolean isApproval() {
        return this == APPROVED;
    }
}
