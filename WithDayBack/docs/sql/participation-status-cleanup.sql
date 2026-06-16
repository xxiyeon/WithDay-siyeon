-- participation.status 이상값 점검
SELECT
    status,
    COUNT(*) AS row_count
FROM participation
GROUP BY status
ORDER BY status;

-- 잘못 들어간 취소 상태 문자열을 CANCELED의 DB literal인 'canceled'로 정리
UPDATE participation
SET status = 'canceled'
WHERE UPPER(status) IN ('CANCELLED', 'CANCEL');

-- 대소문자 혼용 정리
UPDATE participation
SET status = LOWER(status)
WHERE status <> LOWER(status);

-- 허용 상태 외 값 재확인
SELECT
    id,
    user_id,
    schedule_id,
    status
FROM participation
WHERE LOWER(status) NOT IN ('pending', 'approved', 'rejected', 'canceled', 'kicked');

-- 필요 시 enum 정의도 현재 코드 계약과 맞춘다.
-- 운영 DB 적용 전에는 기존 스키마/데이터 백업 후 실행 권장.
ALTER TABLE participation
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'canceled', 'kicked')
    NOT NULL DEFAULT 'pending';
