-- schedule.status의 취소 상태 표기를 canceled로 통일한다.
-- MySQL ENUM은 허용값에 없는 literal로 UPDATE할 수 없으므로,
-- canceled를 임시 허용한 뒤 데이터를 바꾸고 마지막에 cancelled를 제거한다.

ALTER TABLE schedule
    MODIFY COLUMN status ENUM('recruiting', 'closed', 'cancelled', 'canceled', 'completed') NOT NULL;

UPDATE schedule
SET status = 'canceled'
WHERE status = 'cancelled';

ALTER TABLE schedule
    MODIFY COLUMN status ENUM('recruiting', 'closed', 'canceled', 'completed') NOT NULL;

SELECT
    status,
    COUNT(*) AS count
FROM schedule
GROUP BY status
ORDER BY status;
