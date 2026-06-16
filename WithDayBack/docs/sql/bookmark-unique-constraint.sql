-- bookmark 위시리스트 정합성 보강 SQL
-- 서비스 레이어의 exists -> insert 방어는 "사용자 경험상 중복 저장을 에러로 보지 않기 위한 1차 방어"다.
-- 하지만 동시 요청이나 예기치 않은 race condition에서는 애플리케이션 체크만으로 중복 row를 완전히 막을 수 없어서,
-- 최종 정합성은 DB unique 제약이 책임져야 한다.

-- 1) 같은 user_id + schedule_id 조합이 여러 건 있다면 최신 row 1건만 남긴다.
DELETE b1
FROM bookmark b1
INNER JOIN bookmark b2
        ON b1.user_id = b2.user_id
       AND b1.schedule_id = b2.schedule_id
       AND (
            b1.created_at < b2.created_at
            OR (b1.created_at = b2.created_at AND b1.id < b2.id)
       );

-- 2) 사용자별 일정 저장은 하나만 허용한다.
ALTER TABLE bookmark
    ADD CONSTRAINT uk_bookmark_user_schedule UNIQUE (user_id, schedule_id);

-- 3) 위시리스트 최신순 조회 최적화가 필요하면 아래 보조 인덱스를 검토한다.
-- CREATE INDEX idx_bookmark_user_created_at ON bookmark (user_id, created_at DESC);
