package com.test.withdayback.recommended.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.test.withdayback.recommended.dao.RecommendedScheduleDao;
import com.test.withdayback.recommended.dto.RecommendedScheduleRequestDTO;
import com.test.withdayback.recommended.dto.RecommendedScheduleResponseDTO;
import com.test.withdayback.recommended.vo.RecommendedSchedule;
import com.test.withdayback.recommended.vo.RecommendedScheduleDetail;
import com.test.withdayback.recommended.vo.RecommendedScheduleImage;
import com.test.withdayback.user.dao.UserDao;
import com.test.withdayback.user.vo.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// @Service: 추천 일정 관련 데이터 가공, 검증, 저장 로직을 처리하는 클래스.
// Controller는 요청/응답만 담당하고, 실제 로직은 Service에서 처리함.
@Service
public class RecommendedScheduleService {

    @Autowired
    private RecommendedScheduleDao recommendedScheduleDao;

    @Autowired
    private UserDao userDao;

    @Autowired
    private Cloudinary cloudinary;

    // 추천 일정 목록 조회
    public List<RecommendedScheduleResponseDTO> getRecommendedScheduleList() {
        // 추천 일정 기본 정보 목록 조회
        List<RecommendedSchedule> recommendedSchedules =
                recommendedScheduleDao.getRecommendedScheduleList();

        List<RecommendedScheduleResponseDTO> result = new ArrayList<>();

        // 목록 화면에서도 상세 일정/이미지를 같이 쓸 수 있도록 DTO 형태로 묶어서 반환
        for (RecommendedSchedule recommendedSchedule : recommendedSchedules) {
            Long recommendedScheduleId = recommendedSchedule.getId();

            List<RecommendedScheduleDetail> detailSchedule =
                    recommendedScheduleDao.getRecommendedScheduleDetailList(recommendedScheduleId);

            List<RecommendedScheduleImage> images =
                    recommendedScheduleDao.getRecommendedScheduleImageList(recommendedScheduleId);

            RecommendedScheduleResponseDTO responseDTO =
                    new RecommendedScheduleResponseDTO(recommendedSchedule, detailSchedule, images);

            result.add(responseDTO);
        }

        return result;
    }

    // 추천 일정 상세 조회
    public RecommendedScheduleResponseDTO getRecommendedScheduleById(Long id) {
        // 추천 일정 기본 정보 조회
        RecommendedSchedule recommendedSchedule =
                recommendedScheduleDao.getRecommendedScheduleById(id);

        // 조회된 추천 일정이 없다면 에러 발생
        if (recommendedSchedule == null) {
            throw new RuntimeException("추천 일정을 찾을 수 없습니다.");
        }

        // 추천 일정 상세 일정 조회
        List<RecommendedScheduleDetail> detailSchedule =
                recommendedScheduleDao.getRecommendedScheduleDetailList(id);

        // 추천 일정 이미지 조회
        List<RecommendedScheduleImage> images =
                recommendedScheduleDao.getRecommendedScheduleImageList(id);

        return new RecommendedScheduleResponseDTO(
                recommendedSchedule,
                detailSchedule,
                images
        );
    }

    // 추천 일정 생성
    // 추천 일정 기본 정보, 상세 일정, 이미지 저장 중 하나라도 실패하면 전체 rollback
    @Transactional
    public String insertRecommendedSchedule(
            RecommendedScheduleRequestDTO recommendedRequest,
            List<MultipartFile> images,
            String adminEmail
    ) {
        // 요청 데이터에서 추천 일정 기본 정보 추출
        RecommendedSchedule recommendedSchedule = recommendedRequest.getRecommendedSchedule();

        // 요청 데이터에서 추천 일정 상세 일정 리스트 추출
        List<RecommendedScheduleDetail> detailSchedule = recommendedRequest.getDetailSchedule();

        // 로그인한 이메일로 관리자 유저 정보 조회
        User adminUser = userDao.findByEmail(adminEmail);

        // 로그인한 유저가 없으면 에러 발생
        if (adminUser == null) {
            throw new RuntimeException("관리자 정보를 찾을 수 없습니다.");
        }

        // status가 admin인 유저만 추천 일정을 생성할 수 있음.
        if (!"admin".equals(adminUser.getStatus())) {
            throw new RuntimeException("추천 일정 생성 권한이 없습니다.");
        }

        // 추천 일정 기본값 방어
        if (recommendedSchedule.getDurationDays() == null) {
            recommendedSchedule.setDurationDays(1);
        }

        if (recommendedSchedule.getGenderLimit() == null || recommendedSchedule.getGenderLimit().isEmpty()) {
            recommendedSchedule.setGenderLimit("all");
        }

        if (recommendedSchedule.getCostType() == null || recommendedSchedule.getCostType().isEmpty()) {
            recommendedSchedule.setCostType("per_person");
        }

        // 추천 일정을 생성한 관리자 id 저장
        recommendedSchedule.setAdminId(adminUser.getId());

        try {
            // 이미지가 있다면 Cloudinary에 업로드 후 첫 번째 이미지를 썸네일로 사용
            if (images != null && !images.isEmpty()) {
                MultipartFile thumbnailFile = images.get(0);

                if (thumbnailFile != null && !thumbnailFile.isEmpty()) {
                    Map uploadParams = ObjectUtils.asMap(
                            "folder", "withday/recommended-schedules",
                            "use_filename", true,
                            "unique_filename", true
                    );

                    Map uploadResult = cloudinary.uploader().upload(
                            thumbnailFile.getBytes(),
                            uploadParams
                    );

                    String thumbnailUrl = (String) uploadResult.get("secure_url");

                    // 추천 일정 기본 테이블의 썸네일 컬럼에 첫 번째 이미지 URL 저장
                    recommendedSchedule.setThumbnailImage(thumbnailUrl);
                }
            }

            // 추천 일정 기본 정보 저장
            // insert 후 recommendedSchedule.id에 생성된 PK가 들어옴.
            recommendedScheduleDao.insertRecommendedSchedule(recommendedSchedule);

            Long recommendedScheduleId = recommendedSchedule.getId();

            // 추천 일정 상세 일정 저장
            if (detailSchedule != null && !detailSchedule.isEmpty()) {
                int defaultSortOrder = 1;

                for (RecommendedScheduleDetail detail : detailSchedule) {
                    detail.setRecommendedScheduleId(recommendedScheduleId);

                    // sortOrder가 없으면 반복 순서대로 기본값 부여
                    if (detail.getSortOrder() == null) {
                        detail.setSortOrder(defaultSortOrder);
                    }

                    recommendedScheduleDao.insertRecommendedScheduleDetail(detail);

                    defaultSortOrder++;
                }
            }

            // 추천 일정 이미지 저장
            if (images != null && !images.isEmpty()) {
                for (int i = 0; i < images.size(); i++) {
                    MultipartFile imageFile = images.get(i);

                    if (imageFile == null || imageFile.isEmpty()) {
                        continue;
                    }

                    Map uploadParams = ObjectUtils.asMap(
                            "folder", "withday/recommended-schedules",
                            "use_filename", true,
                            "unique_filename", true
                    );

                    Map uploadResult = cloudinary.uploader().upload(
                            imageFile.getBytes(),
                            uploadParams
                    );

                    String imageUrl = (String) uploadResult.get("secure_url");

                    RecommendedScheduleImage recommendedScheduleImage =
                            new RecommendedScheduleImage();

                    recommendedScheduleImage.setRecommendedScheduleId(recommendedScheduleId);
                    recommendedScheduleImage.setImageUrl(imageUrl);

                    // 첫 번째 이미지를 썸네일 이미지로 저장
                    recommendedScheduleImage.setIsThumbnail(i == 0);

                    recommendedScheduleDao.insertRecommendedScheduleImage(recommendedScheduleImage);
                }
            }

            return "success";
        } catch (Exception e) {
            // 정확한 에러 추적용 로그
            e.printStackTrace();

            // Controller의 catch로 넘김
            throw new RuntimeException("추천 일정 생성 중 오류가 발생했습니다.");
        }
    }

    // 추천 일정 삭제
    // 현재 프로젝트의 기존 일정 삭제 흐름에 맞춰 hard delete로 처리함.
    // 추천 일정 기본 정보, 상세 일정, 이미지 삭제 중 하나라도 실패하면 전체 rollback.
    @Transactional
    public String deleteRecommendedSchedule(Long id, String adminEmail) {
        // 로그인한 이메일로 관리자 유저 정보 조회
        User adminUser = userDao.findByEmail(adminEmail);

        // 로그인한 유저가 없으면 에러 발생
        if (adminUser == null) {
            throw new RuntimeException("관리자 정보를 찾을 수 없습니다.");
        }

        // status가 admin인 유저만 추천 일정을 삭제할 수 있음.
        if (!"admin".equals(adminUser.getStatus())) {
            throw new RuntimeException("추천 일정 삭제 권한이 없습니다.");
        }

        // 삭제할 추천 일정이 실제로 존재하는지 확인
        RecommendedSchedule recommendedSchedule =
                recommendedScheduleDao.getRecommendedScheduleById(id);

        if (recommendedSchedule == null) {
            throw new RuntimeException("삭제할 추천 일정을 찾을 수 없습니다.");
        }

        try {
            // FK 오류 방지를 위해 자식 테이블 데이터를 먼저 삭제
            recommendedScheduleDao.deleteRecommendedScheduleImages(id);
            recommendedScheduleDao.deleteRecommendedScheduleDetails(id);

            // 추천 일정 기본 정보 삭제
            recommendedScheduleDao.deleteRecommendedSchedule(id);

            return "success";
        } catch (Exception e) {
            // 정확한 에러 추적용 로그
            e.printStackTrace();

            // Controller의 catch로 넘김
            throw new RuntimeException("추천 일정 삭제 중 오류가 발생했습니다.");
        }
    }

    // 추천 일정 수정
// 추천 일정 기본 정보와 상세 일정을 수정함.
// 새 이미지가 넘어온 경우에만 기존 이미지를 삭제하고 새 이미지로 교체함.
    @Transactional
    public String updateRecommendedSchedule(
            Long id,
            RecommendedScheduleRequestDTO recommendedRequest,
            List<MultipartFile> images,
            String adminEmail
    ) {
        // 로그인한 이메일로 관리자 유저 정보 조회
        User adminUser = userDao.findByEmail(adminEmail);

        // 로그인한 유저가 없으면 에러 발생
        if (adminUser == null) {
            throw new RuntimeException("관리자 정보를 찾을 수 없습니다.");
        }

        // status가 admin인 유저만 추천 일정을 수정할 수 있음.
        if (!"admin".equals(adminUser.getStatus())) {
            throw new RuntimeException("추천 일정 수정 권한이 없습니다.");
        }

        // 수정할 추천 일정이 실제로 존재하는지 확인
        RecommendedSchedule existingSchedule =
                recommendedScheduleDao.getRecommendedScheduleById(id);

        if (existingSchedule == null) {
            throw new RuntimeException("수정할 추천 일정을 찾을 수 없습니다.");
        }

        // 요청 데이터에서 추천 일정 기본 정보 추출
        RecommendedSchedule recommendedSchedule = recommendedRequest.getRecommendedSchedule();

        // 요청 데이터에서 추천 일정 상세 일정 리스트 추출
        List<RecommendedScheduleDetail> detailSchedule = recommendedRequest.getDetailSchedule();

        // 수정 화면에서 삭제한 기존 이미지 id 목록
        List<Long> deletedImageIds = recommendedRequest.getDeletedImageIds();

        // 수정 대상 id 세팅
        recommendedSchedule.setId(id);

        // 추천 일정 기본값 방어
        if (recommendedSchedule.getDurationDays() == null) {
            recommendedSchedule.setDurationDays(1);
        }

        if (recommendedSchedule.getGenderLimit() == null || recommendedSchedule.getGenderLimit().isEmpty()) {
            recommendedSchedule.setGenderLimit("all");
        }

        if (recommendedSchedule.getCostType() == null || recommendedSchedule.getCostType().isEmpty()) {
            recommendedSchedule.setCostType("per_person");
        }

        if (recommendedSchedule.getIsActive() == null) {
            recommendedSchedule.setIsActive(true);
        }

        try {

            // 추천 일정 기본 정보 수정
            recommendedScheduleDao.updateRecommendedSchedule(recommendedSchedule);

            // 기존 상세 일정 삭제 후 다시 저장
            recommendedScheduleDao.deleteRecommendedScheduleDetails(id);

            if (detailSchedule != null && !detailSchedule.isEmpty()) {
                int defaultSortOrder = 1;

                for (RecommendedScheduleDetail detail : detailSchedule) {
                    detail.setRecommendedScheduleId(id);

                    // sortOrder가 없으면 반복 순서대로 기본값 부여
                    if (detail.getSortOrder() == null) {
                        detail.setSortOrder(defaultSortOrder);
                    }

                    recommendedScheduleDao.insertRecommendedScheduleDetail(detail);

                    defaultSortOrder++;
                }
            }

            // 수정 화면에서 삭제한 기존 이미지가 있으면 해당 이미지 row만 삭제
            if (deletedImageIds != null && !deletedImageIds.isEmpty()) {
                for (Long imageId : deletedImageIds) {
                    recommendedScheduleDao.deleteRecommendedScheduleImageById(imageId);
                }
            }

            // 새 이미지가 있으면 기존 이미지를 전부 삭제하지 않고 추가 저장
            if (images != null && !images.isEmpty()) {
                for (MultipartFile imageFile : images) {
                    if (imageFile == null || imageFile.isEmpty()) {
                        continue;
                    }

                    Map uploadParams = ObjectUtils.asMap(
                            "folder", "withday/recommended-schedules",
                            "use_filename", true,
                            "unique_filename", true
                    );

                    Map uploadResult = cloudinary.uploader().upload(
                            imageFile.getBytes(),
                            uploadParams
                    );

                    String imageUrl = (String) uploadResult.get("secure_url");

                    RecommendedScheduleImage recommendedScheduleImage =
                            new RecommendedScheduleImage();

                    recommendedScheduleImage.setRecommendedScheduleId(id);
                    recommendedScheduleImage.setImageUrl(imageUrl);

                    // 최종 썸네일은 아래에서 남은 이미지 목록 기준으로 다시 계산함
                    recommendedScheduleImage.setIsThumbnail(false);

                    recommendedScheduleDao.insertRecommendedScheduleImage(recommendedScheduleImage);
                }
            }

            // 이미지 삭제/추가가 끝난 뒤, DB에 남아 있는 이미지 기준으로 thumbnail_image 재계산
            List<RecommendedScheduleImage> remainingImages =
                    recommendedScheduleDao.getRecommendedScheduleImageList(id);

            String nextThumbnailImage = null;

            if (remainingImages != null && !remainingImages.isEmpty()) {
                nextThumbnailImage = remainingImages.get(0).getImageUrl();
            }

            // 남은 이미지가 없으면 thumbnail_image = NULL
            // 남은 이미지가 있으면 첫 번째 이미지 URL을 thumbnail_image로 저장
            recommendedScheduleDao.updateRecommendedScheduleThumbnail(id, nextThumbnailImage);

            return "success";
        } catch (Exception e) {
            // 정확한 에러 추적용 로그
            e.printStackTrace();

            // Controller의 catch로 넘김
            throw new RuntimeException("추천 일정 수정 중 오류가 발생했습니다.");
        }
    }
}