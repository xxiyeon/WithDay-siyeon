package com.test.withdayback.recommended.dao;

import com.test.withdayback.recommended.vo.RecommendedSchedule;
import com.test.withdayback.recommended.vo.RecommendedScheduleDetail;
import com.test.withdayback.recommended.vo.RecommendedScheduleImage;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;

// @Mapper: 스프링 부트와 MyBatis를 연결해주는 어노테이션.
// 이 인터페이스의 메서드 이름과 mapper.xml의 id가 같으면 해당 SQL이 실행됨.
@Mapper
public interface RecommendedScheduleDao {

    // 추천 일정 목록 조회
    // 삭제되지 않았고(deleted_at IS NULL), 노출 상태(is_active = 1)인 추천 일정만 가져옴.
    List<RecommendedSchedule> getRecommendedScheduleList();

    // 추천 일정 상세 조회
    // 추천 일정 id로 기본 정보를 가져옴.
    RecommendedSchedule getRecommendedScheduleById(Long id);

    // 추천 일정 상세 일정 조회
    // 추천 일정 id에 연결된 일차별 상세 일정을 가져옴.
    List<RecommendedScheduleDetail> getRecommendedScheduleDetailList(Long recommendedScheduleId);

    // 추천 일정 이미지 조회
    // 추천 일정 id에 연결된 이미지들을 가져옴.
    List<RecommendedScheduleImage> getRecommendedScheduleImageList(Long recommendedScheduleId);

    // 추천 일정 기본 정보 저장
    // useGeneratedKeys를 통해 insert 후 생성된 id를 RecommendedSchedule 객체에 채워 넣음.
    void insertRecommendedSchedule(RecommendedSchedule recommendedSchedule);

    // 추천 일정 상세 일정 저장
    void insertRecommendedScheduleDetail(RecommendedScheduleDetail recommendedScheduleDetail);

    // 추천 일정 이미지 저장
    void insertRecommendedScheduleImage(RecommendedScheduleImage recommendedScheduleImage);

    // 추천 일정 기본 정보 수정
    void updateRecommendedSchedule(RecommendedSchedule recommendedSchedule);

    // 추천 일정 이미지 삭제
    // 추천 일정 삭제 전 연결된 이미지 데이터를 먼저 삭제함.
    void deleteRecommendedScheduleImages(Long recommendedScheduleId);

    // 추천 일정 상세 일정 삭제
    // 추천 일정 삭제 전 연결된 일차별 상세 일정을 먼저 삭제함.
    void deleteRecommendedScheduleDetails(Long recommendedScheduleId);

    // 추천 일정 기본 정보 삭제
    // 추천 일정 row 자체를 삭제하는 hard delete 방식.
    void deleteRecommendedSchedule(Long id);

    // 추천 일정 이미지 단건 삭제
    void deleteRecommendedScheduleImageById(Long imageId);

    // 추천 일정 썸네일 URL 수정
    void updateRecommendedScheduleThumbnail(
            @Param("recommendedScheduleId") Long recommendedScheduleId,
            @Param("thumbnailImage") String thumbnailImage
    );
}