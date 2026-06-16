package com.test.withdayback.schedule.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.test.withdayback.participation.dao.ParticipationDao;
import com.test.withdayback.participation.enums.ParticipationStatus;
import com.test.withdayback.participation.vo.Participation;
import com.test.withdayback.schedule.dao.ScheduleDao;
import com.test.withdayback.schedule.dto.ScheduleExecutionResponseDTO;
import com.test.withdayback.schedule.dto.ScheduleRequestDTO;
import com.test.withdayback.schedule.dto.ScheduleResponseDTO;
import com.test.withdayback.schedule.enums.ScheduleStatus;
import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.schedule.vo.ScheduleDetail;
import com.test.withdayback.schedule.vo.ScheduleImage;
import com.test.withdayback.user.dao.UserDao;
import com.test.withdayback.user.vo.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Service
public class ScheduleService {
    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);

    private final ScheduleDao scheduleDao;
    private final ParticipationDao participationDao;
    private final UserDao userDao;

    @Autowired
    private Cloudinary cloudinary;

    public ScheduleService(ScheduleDao scheduleDao, ParticipationDao participationDao, UserDao userDao) {
        this.scheduleDao = scheduleDao;
        this.participationDao = participationDao;
        this.userDao = userDao;
    }

    /*
     * 일정 상세 조회의 Service 흐름이다.
     * Controller는 id/email만 넘기고, Service는 화면에 필요한 여러 테이블 데이터를 조합한다.
     * schedule, schedule_detail, schedule_image, participation 상태가 서로 다른 테이블에 있기 때문에
     * DTO로 묶어 내려줘야 프론트가 여러 API를 순차 호출하지 않아도 된다.
     */
    public ScheduleResponseDTO getScheduleFullDetails(Long id, String viewerEmail) {
        String normalizedViewerEmail = normalizeEmail(viewerEmail);
        User viewer = findViewerByEmail(normalizedViewerEmail);
        Long viewerUserId = viewer != null ? viewer.getId() : null;
        boolean viewerIsAdmin = isAdminUser(viewer);

        /*
         * 일정 작성자의 email은 상세 화면에서 호스트 판별 기준으로 사용한다.
         * 이후 viewerEmail과 비교해 현재 사용자가 호스트인지 계산한다.
         */
        String email = scheduleDao.getEmailByScheduleId(id);

        /*
         * 1. 일정 기본 정보 조회
         * selectScheduleById는 삭제되지 않은 schedule row만 가져온다.
         * 상세 화면의 제목, 설명, 날짜, 모집 인원, 썸네일, 오픈채팅 링크 등이 이 객체에 들어 있다.
         */
        Schedule schedule = scheduleDao.selectScheduleByIdForViewer(id, normalizedViewerEmail);

        if (schedule == null) return null;

        boolean hiddenFromPublic = isHiddenFromPublic(schedule);
        boolean viewerCanViewHiddenSchedule =
                canViewHiddenSchedule(schedule, viewerUserId, viewerIsAdmin);
        if (hiddenFromPublic && !viewerCanViewHiddenSchedule) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정을 찾을 수 없습니다.");
        }

        /*
         * 2. Day-by-Day 세부 계획 조회
         * 일정 본문 아래에 날짜별 계획을 순서대로 렌더링하기 위해 day_number 오름차순으로 가져온다.
         */
        List<ScheduleDetail> details = scheduleDao.selectDetailsByScheduleId(id);

        /*
         * 3. 이미지 목록 조회
         * 상세 페이지의 이미지 슬라이더와 썸네일 fallback을 위해 schedule_image row를 함께 내려준다.
         */
        List<ScheduleImage> images = scheduleDao.selectImageByScheduleId(id);

        ScheduleResponseDTO response = new ScheduleResponseDTO(email, schedule, details, images);
        User host = schedule.getUserId() == null ? null : userDao.findById(schedule.getUserId());
        if (host != null) {
            response.setHost(new ScheduleResponseDTO.HostSummary(
                    host.getId(),
                    host.getNickname(),
                    host.getProfileImage()
            ));
        }

        /*
         * viewerEmail은 선택값이다.
         * 비로그인 사용자는 guest로 상세를 볼 수 있지만, 참여 버튼 상태와 채팅 링크 권한은 로그인 사용자일 때만 계산할 수 있다.
         */
        boolean viewerIsHost = isViewerHost(schedule, viewerUserId, email, normalizedViewerEmail);
        Long viewerParticipationId = null;
        String viewerParticipationStatus = null;

        /*
         * 현재 사용자가 이 일정에 신청/승인된 적이 있는지 조회한다.
         * 이 값은 프론트 ApplyScheduleButton의 "참여 신청하기/신청 완료/참여 확정" 라벨 결정에 쓰인다.
         */
        if (!normalizedViewerEmail.isBlank()) {
            Participation viewerParticipation =
                    participationDao.findByEmailAndScheduleId(normalizedViewerEmail, id);
            if (viewerParticipation != null) {
                viewerParticipationId = viewerParticipation.getId();
                viewerParticipationStatus = viewerParticipation.getStatus() != null
                        ? viewerParticipation.getStatus().name()
                        : null;
            }
        }

        /*
         * 오픈채팅 링크는 호스트 또는 승인된 참여자에게만 보여준다.
         * 권한이 없으면 schedule.chatLink를 null로 지워 내려보내 프론트가 실수로 링크를 렌더링하지 않게 한다.
         */
        boolean viewerCanAccessChatLink = viewerIsHost
                || ParticipationStatus.APPROVED.name().equals(viewerParticipationStatus);

        if (!viewerCanAccessChatLink) {
            schedule.setChatLink(null);
        }

        response.setViewerIsHost(viewerIsHost);
        response.setViewerIsAdmin(viewerIsAdmin);
        response.setViewerParticipationId(viewerParticipationId);
        response.setViewerParticipationStatus(viewerParticipationStatus);
        response.setViewerCanAccessChatLink(viewerCanAccessChatLink);
        response.setIsBookmarked(schedule.getIsBookmarked());
        response.setHiddenFromPublic(hiddenFromPublic);

        return response;
    }

    /**
     * 상세 페이지 진입 시 조회수를 1 증가시킨다.
     * <p>
     * 별도 API로 분리해두면 GET 상세 조회가 캐시/프리패치/자동 재시도에 휘말려
     * 의도치 않게 조회수가 더 오르는 문제를 줄일 수 있다.
     *
     * @param id 일정 ID
     * @return true면 증가 성공, false면 대상 일정이 없어서 증가하지 못한 경우
     */
    @Transactional
    public boolean increaseViewCount(Long id) {
        return scheduleDao.increaseViewCount(id) > 0;
    }

    /*
     * 홈/탐색 탭의 일정 리스트 조회 흐름이다.
     * Service는 별도 비즈니스 가공 없이 Controller에서 받은 필터를 Dao로 넘긴다.
     * 필터 조건 조립은 MyBatis dynamic SQL이 더 적합하므로 mapper에서 조건을 선택적으로 붙인다.
     * sort는 SQL 조각 선택에 쓰이므로 허용된 값만 통과시키고, 알 수 없는 값은 최신순으로 되돌린다.
     */
    public List<Schedule> getAllSchedules(
            String category,
            String keyword,
            String region,
            String district,
            String genderLimit,
            String startDate,
            String endDate,
            String sort,
            String email
    ) {
        String normalizedEmail = normalizeEmail(email);
        User viewer = findViewerByEmail(normalizedEmail);
        Long viewerUserId = viewer != null ? viewer.getId() : null;
        boolean viewerIsAdmin = isAdminUser(viewer);

        return scheduleDao.getAllSchedules(
                category,
                keyword,
                region,
                district,
                genderLimit,
                startDate,
                endDate,
                normalizeScheduleSort(sort),
                viewerUserId,
                viewerIsAdmin,
                normalizedEmail
        );
    }

    private String normalizeScheduleSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return "latest";
        }

        return switch (sort) {
            case "deadlineSoon", "deadlineRelaxed", "startSoon", "startLate" -> sort;
            default -> "latest";
        };
    }

    /*
     * 호스트가 "일정 완료 처리" 버튼을 눌렀을 때의 핵심 상태 전환이다.
     * 이 기능은 단순 status 변경이 아니라 운영 정책을 서버에서 확정하는 지점이므로
     * 프론트에서 버튼을 숨기거나 비활성화해도 백엔드에서 같은 규칙을 반드시 다시 검증해야 한다.
     *
     * 처리 순서:
     * 1. 일정 존재 여부 확인
     * 2. 요청 사용자가 실제 호스트인지 확인
     * 3. 현재 상태가 실행 가능한 상태인지 확인
     * 4. 최소 인원 조건 충족 여부 확인
     * 5. status를 completed로 변경
     * 6. 최신 schedule row를 다시 읽어 응답 반환
     *
     * @Transactional을 붙인 이유:
     * - 실행 가능 여부를 확인한 뒤 status를 바꾸는 흐름이 하나의 작업 단위여야 한다.
     * - 중간에 예외가 나면 부분 반영 없이 전체를 실패시켜야 "버튼은 눌렸는데 상태는 안 바뀐" 어정쩡한 상태를 줄일 수 있다.
     */
    @Transactional
    public ScheduleExecutionResponseDTO completeSchedule(Long scheduleId, String email) {
        Schedule schedule = requireSchedule(scheduleId);
        String normalizedEmail = normalizeEmail(email);
        validateHostAction(scheduleId, normalizedEmail, schedule);

        /*
         * 이미 completed인 일정은 중복 완료 처리를 허용하지 않는다.
         * 같은 상태로 다시 덮어써도 기능상 의미가 없고, 사용자는 "실행"이 성공했다고 오해할 수 있기 때문이다.
         */
        if (schedule.getStatus() == ScheduleStatus.completed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 완료 처리된 일정입니다.");
        }

        /*
         * 취소된 일정은 운영상 종료된 상태로 간주하므로 완료 대상으로 되살리지 않는다.
         * 이 정책을 풀고 싶다면 status 전이 규칙 자체를 다시 설계해야 한다.
         */
        if (schedule.getStatus() == ScheduleStatus.canceled) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소된 일정은 실행할 수 없습니다.");
        }

        /*
         * 이번 기능에서 실행 가능한 출발 상태는 recruiting, closed 두 가지뿐이다.
         * recruiting은 일반 모집중 상태이고,
         * closed는 정원이 찼거나 모집이 닫힌 상태지만 이미 모인 인원으로 일정 시작은 가능하다는 정책을 따른다.
         */
        if (schedule.getStatus() != ScheduleStatus.recruiting
                && schedule.getStatus() != ScheduleStatus.closed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "실행할 수 없는 일정 상태입니다.");
        }

        /*
         * 최소 인원 조건은 "일정이 실제로 성립했는가"를 판단하는 마지막 안전장치다.
         * 프론트에서도 버튼을 비활성화하지만, 사용자가 직접 API를 호출할 수 있으므로 서버에서 다시 확인한다.
         */
        int currentParticipants = schedule.getCurrentParticipants() == null ? 0 : schedule.getCurrentParticipants();
        int minParticipants = schedule.getMinParticipants() == null ? 0 : schedule.getMinParticipants();
        if (currentParticipants < minParticipants) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "최소 인원이 충족되지 않아 실행할 수 없습니다.");
        }

        /*
         * update 쿼리에 currentStatus를 함께 넣는 이유는 동시성 충돌 감지다.
         * 예를 들어 조회 직후 다른 요청이 먼저 closed/completed로 바꿨다면 update row 수가 0이 되고,
         * 서비스는 이를 충돌로 판단해 재시도를 유도할 수 있다.
         */
        int updated = scheduleDao.completeSchedule(scheduleId, schedule.getStatus().name());
        if (updated <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "일정 실행 처리에 실패했습니다.");
        }

        /*
         * TODO: 일정 완료 알림 전송
         * - 위치: 이 status 변경 성공 직후
         * - 대상: APPROVED 상태 참여자
         * - 내용 예시: "일정이 완료되었습니다"
         * - OneSignalService 또는 NotificationService 래퍼를 통해 비동기 전송 권장
         *
         * 알림 전송은 핵심 상태 변경과 트랜잭션을 분리하는 편이 안전하다.
         * 이유:
         * - 알림 실패가 schedule.status = completed 자체를 롤백시키면 운영자가 일정을 시작하지 못하는 문제가 생긴다.
         * - 상태 변경은 핵심 도메인 작업이고, 알림은 후속 부가 작업으로 취급하는 것이 장애 전파를 줄인다.
         */
        Schedule updatedSchedule = requireSchedule(scheduleId);
        log.info("일정 완료 처리 완료 - scheduleId: {}, actorEmail: {}, from: {}, to: {}",
                scheduleId, normalizedEmail, schedule.getStatus(), updatedSchedule.getStatus());

        return toExecutionResponse(updatedSchedule);
    }

    /*
     * 호스트가 "일정완료 취소" 버튼을 눌렀을 때의 롤백 로직이다.
     * completed를 무조건 recruiting으로 되돌리지 않고, 모집 마감일이 지났는지에 따라 recruiting/closed를 나눈다.
     *
     * 정책 이유:
     * - 마감일이 지나지 않았다면 다시 모집을 열 수 있으므로 recruiting
     * - 마감일이 이미 지났다면 더 이상 새 참여를 받을 수 없으므로 closed
     */
    @Transactional
    public ScheduleExecutionResponseDTO rollbackCompletedSchedule(Long scheduleId, String email) {
        Schedule schedule = requireSchedule(scheduleId);
        String normalizedEmail = normalizeEmail(email);
        validateHostAction(scheduleId, normalizedEmail, schedule);

        /*
         * 일정완료 취소는 completed 상태에서만 의미가 있다.
         * recruiting/closed에서 호출되면 단순 중복 요청이므로 명시적으로 막는다.
         */
        if (schedule.getStatus() != ScheduleStatus.completed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "일정완료 상태의 일정만 되돌릴 수 있습니다.");
        }

        /*
         * 롤백 목표 상태는 서비스에서 계산한다.
         * 이렇게 해야 매퍼는 "어떤 상태로 바꿀지"만 알고, 날짜 정책의 의미는 서비스 레이어 한 곳에서 관리할 수 있다.
         */
        ScheduleStatus targetStatus = isRecruitEnded(schedule.getRecruitEndDate())
                ? ScheduleStatus.closed
                : ScheduleStatus.recruiting;

        int updated = scheduleDao.rollbackCompletedSchedule(scheduleId, targetStatus.name());
        if (updated <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "일정 실행 취소 처리에 실패했습니다.");
        }

        /*
         * TODO: 일정완료 취소 알림 전송
         * - 위치: status 롤백 성공 직후
         * - 대상: APPROVED 상태 참여자
         * - 내용 예시: "일정 완료 처리가 취소되었습니다"
         * - 알림 실패가 롤백 자체를 막지 않도록 트랜잭션 외부 처리 또는 예외 격리 필요
         */
        Schedule updatedSchedule = requireSchedule(scheduleId);
        log.info("일정완료 취소 완료 - scheduleId: {}, actorEmail: {}, from: {}, to: {}",
                scheduleId, normalizedEmail, schedule.getStatus(), updatedSchedule.getStatus());

        return toExecutionResponse(updatedSchedule);
    }

    /*
     * 호스트가 일정을 아예 취소하는 상태 전환이다.
     * 모집중(recruiting)과 모집마감(closed) 상태에서만 canceled로 갈 수 있고,
     * 완료(completed)되었거나 이미 취소(canceled)된 일정은 다시 취소하지 않는다.
     */
    @Transactional
    public ScheduleExecutionResponseDTO cancelSchedule(Long scheduleId, String email) {
        Schedule schedule = requireSchedule(scheduleId);
        String normalizedEmail = normalizeEmail(email);
        validateHostAction(scheduleId, normalizedEmail, schedule);

        if (schedule.getStatus() == ScheduleStatus.completed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "완료된 일정은 취소할 수 없습니다.");
        }

        if (schedule.getStatus() == ScheduleStatus.canceled) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 취소된 일정입니다.");
        }

        if (schedule.getStatus() != ScheduleStatus.recruiting
                && schedule.getStatus() != ScheduleStatus.closed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "취소할 수 없는 일정 상태입니다.");
        }

        int updated = scheduleDao.cancelSchedule(scheduleId);
        if (updated <= 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "일정 취소 처리에 실패했습니다.");
        }

        /*
         * TODO: 일정 취소 알림 전송
         * - 대상: APPROVED 또는 PENDING 상태 참여자
         * - 내용 예시: "호스트가 일정을 취소했습니다"
         * - 알림 실패가 상태 변경을 되돌리지 않도록 트랜잭션 밖 비동기 처리 권장
         */
        Schedule updatedSchedule = requireSchedule(scheduleId);
        log.info("일정 취소 완료 - scheduleId: {}, actorEmail: {}, from: {}, to: {}",
                scheduleId, normalizedEmail, schedule.getStatus(), updatedSchedule.getStatus());

        return toExecutionResponse(updatedSchedule);
    }

    @Transactional
    public void insertSchedule(ScheduleRequestDTO dto, List<MultipartFile> images) {
        Schedule schedule = dto.getSchedule();

        // email로 userId get
        Long userId = userDao.findUserIdByEmail(dto.getEmail());
        schedule.setUserId(userId);

        // schedule insert
        scheduleDao.insertSchedule(schedule);

        Long scheduleId = schedule.getId();

        /*
         * 일정 생성자는 별도 신청 과정을 거치지 않지만, 도메인상 이미 해당 일정의 확정 참여자다.
         * schedule.current_participants는 insert mapper에서 1로 시작하므로 여기서는 인원 수를 다시 늘리지 않고,
         * participation row만 APPROVED 상태로 만들어 참여자 목록/내 일정 조회가 같은 기준을 사용할 수 있게 한다.
         */
        Participation existingHostParticipation =
                participationDao.findByEmailAndScheduleId(dto.getEmail(), scheduleId);
        if (existingHostParticipation == null) {
            Participation hostParticipation = new Participation();
            hostParticipation.setUserId(userId);
            hostParticipation.setScheduleId(scheduleId);
            hostParticipation.setStatus(ParticipationStatus.APPROVED);

            int inserted = participationDao.insertParticipation(hostParticipation);
            if (inserted <= 0 || hostParticipation.getId() == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "호스트 참여 정보 생성에 실패했습니다.");
            }
        }

        // detail insert
        if (dto.getDetailSchedule() != null) {
            for (ScheduleDetail detail : dto.getDetailSchedule()) {
                detail.setScheduleId(scheduleId);
                scheduleDao.insertScheduleDetail(detail);
            }
        }

        // 이미지 insert
        List<String> imageUrls = new ArrayList<>();

        if (images != null && !images.isEmpty()) {
            for (MultipartFile image : images) {
                if (image != null && !image.isEmpty()) {
                    Map uploadParams = ObjectUtils.asMap("folder", "withday/schedule/images", "use_filename", true, "unique_filename", true);
                    try {
                        Map uploadResult = cloudinary.uploader().upload(image.getBytes(), uploadParams);
                        imageUrls.add((String) uploadResult.get("secure_url"));
                        if (imageUrls.size() == 1) {
                            scheduleDao.updateThumbnail(scheduleId, imageUrls.get(0));
                        }
                    } catch (Exception e) {
                        throw new RuntimeException("이미지 업로드 실패", e);
                    }
                }
            }
            scheduleDao.insertScheduleImage(scheduleId, imageUrls);
        }
    }

    @Transactional
    public void updateSchedule(Long scheduleId, ScheduleRequestDTO dto, List<MultipartFile> images) {
        /*
         * 일정완료 상태의 일정은 내용을 바꾸지 못하게 막는다.
         * 일정이 이미 시작된 뒤 제목/날짜/모집 조건이 바뀌면 참여자 입장에서 계약이 바뀐 것처럼 보일 수 있기 때문이다.
         */
        Schedule existingSchedule = requireSchedule(scheduleId);
        validateScheduleNotCompleted(existingSchedule, "일정완료 상태의 일정은 수정할 수 없습니다.");

        Schedule schedule = dto.getSchedule();

        // email로 userId get
        Long userId = userDao.findUserIdByEmail(dto.getEmail());

        schedule.setUserId(userId);
        schedule.setId(scheduleId);

        // schedule update
        scheduleDao.updateSchedule(schedule);

        // 기존 detail 삭제
        scheduleDao.deleteScheduleDetail(scheduleId);

        // detail 재insert
        if (dto.getDetailSchedule() != null) {
            for (ScheduleDetail detail : dto.getDetailSchedule()) {
                detail.setScheduleId(scheduleId);
                scheduleDao.insertScheduleDetail(detail);
            }
        }

        int imageCount = scheduleDao.getScheduleImageCount(scheduleId);

        // 삭제할 이미지 삭제
        if (dto.getDeletedImageIds() != null && !dto.getDeletedImageIds().isEmpty()) {
            scheduleDao.deleteScheduleImages(dto.getDeletedImageIds());
        }

        // 기존 이미지 전체 삭제
        if (imageCount == Objects.requireNonNull(dto.getDeletedImageIds()).size()) {
            // 이미지 insert
            List<String> imageUrls = new ArrayList<>();

            if (images != null && !images.isEmpty()) {
                for (MultipartFile image : images) {
                    if (image != null && !image.isEmpty()) {
                        Map uploadParams = ObjectUtils.asMap("folder", "withday/schedule/images", "use_filename", true, "unique_filename", true);
                        try {
                            Map uploadResult = cloudinary.uploader().upload(image.getBytes(), uploadParams);
                            imageUrls.add((String) uploadResult.get("secure_url"));
                        } catch (Exception e) {
                            throw new RuntimeException("이미지 업로드 실패", e);
                        }
                    }
                }
                scheduleDao.insertScheduleImage(scheduleId, imageUrls);
            }
        }
        // 기존 이미지 일부 삭제
        else {
            // 새 이미지 업로드 + thumbnail 지정
            List<String> imageUrls = new ArrayList<>();
            if (images != null && !images.isEmpty()) {
                for (MultipartFile image : images) {
                    if (image != null && !image.isEmpty()) {
                        Map uploadParams = ObjectUtils.asMap("folder",
                                "withday/schedule/images", "use_filename", true, "unique_filename", true);
                        try {
                            Map uploadResult = cloudinary.uploader().upload(image.getBytes(), uploadParams);
                            imageUrls.add((String) uploadResult.get("secure_url"));
                        } catch (Exception e) {
                            throw new RuntimeException("이미지 업로드 실패", e);
                        }
                    }
                }

                if (!imageUrls.isEmpty()) {
                    scheduleDao.updateScheduleImage(scheduleId, imageUrls);
                }
            }
        }
        // 썸네일 이미지 등록
        String thumbnailUrl = scheduleDao.getThumbnailImageUrl(scheduleId);
        scheduleDao.updateThumbnail(scheduleId, thumbnailUrl);
    }

    public int deleteSchedule(Long scheduleId) {
        /*
         * 완료된 일정 삭제를 막는 이유는 운영 일관성 때문이다.
         * 이미 완료된 일정은 기록으로 남겨야 하고, 단순 삭제는 추적성을 크게 떨어뜨린다.
         */
        Schedule existingSchedule = requireSchedule(scheduleId);
        validateScheduleNotCompleted(existingSchedule, "일정완료 상태의 일정은 삭제할 수 없습니다.");
        return scheduleDao.deleteSchedule(scheduleId);
    }

    /*
     * scheduleId로 조회했을 때 null이면 즉시 404를 만든다.
     * 서비스 전역에서 같은 null-check를 반복하지 않도록 공통 helper로 분리했다.
     */
    private Schedule requireSchedule(Long scheduleId) {
        Schedule schedule = scheduleDao.selectScheduleById(scheduleId);
        if (schedule == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "일정 정보를 찾을 수 없습니다.");
        }
        return schedule;
    }

    /*
     * 실행/실행 취소는 호스트만 가능하므로 email을 일정 작성자와 비교해 권한을 검증한다.
     * 참여자나 제3자가 직접 API를 호출해도 여기서 차단된다.
     */
    private void validateHostAction(Long scheduleId, String normalizedEmail, Schedule schedule) {
        if (normalizedEmail.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 사용자 정보가 필요합니다.");
        }

        String hostEmail = scheduleDao.getEmailByScheduleId(scheduleId);
        if (hostEmail == null || !normalizedEmail.equalsIgnoreCase(hostEmail.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "호스트만 상태를 변경할 수 있습니다.");
        }
    }

    /*
     * completed 상태는 "일정완료 상태라 주요 관리 액션이 잠긴 상태"라는 뜻이다.
     * 수정/삭제 같은 관리자 액션도 이 helper 하나로 같은 정책을 재사용한다.
     */
    private void validateScheduleNotCompleted(Schedule schedule, String message) {
        if (schedule.getStatus() == ScheduleStatus.completed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, message);
        }
    }

    /*
     * 실행 취소 후 recruiting으로 되돌릴 수 있는지 판단하는 날짜 helper다.
     * KST 기준 오늘보다 recruitEndDate가 이전이면 이미 모집 기간이 끝난 것으로 보고 closed로 유지한다.
     */
    private boolean isRecruitEnded(String recruitEndDate) {
        LocalDate parsedDate = parseDate(recruitEndDate);
        return parsedDate != null && parsedDate.isBefore(LocalDate.now(ZoneId.of("Asia/Seoul")));
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return LocalDate.parse(value.trim());
        } catch (Exception exception) {
            return null;
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim();
    }

    private User findViewerByEmail(String normalizedEmail) {
        if (normalizedEmail.isBlank()) {
            return null;
        }

        return userDao.findByEmail(normalizedEmail);
    }

    private boolean isAdminUser(User viewer) {
        return viewer != null && "admin".equalsIgnoreCase(viewer.getStatus());
    }

    private boolean isHiddenFromPublic(Schedule schedule) {
        return schedule != null && Integer.valueOf(0).equals(schedule.getIsPublic());
    }

    private boolean canViewHiddenSchedule(Schedule schedule, Long viewerUserId, boolean viewerIsAdmin) {
        if (!isHiddenFromPublic(schedule)) {
            return true;
        }

        if (viewerIsAdmin) {
            return true;
        }

        return viewerUserId != null && Objects.equals(schedule.getUserId(), viewerUserId);
    }

    private boolean isViewerHost(
            Schedule schedule,
            Long viewerUserId,
            String hostEmail,
            String normalizedViewerEmail
    ) {
        if (schedule != null && viewerUserId != null && Objects.equals(schedule.getUserId(), viewerUserId)) {
            return true;
        }

        return !normalizedViewerEmail.isBlank() && hostEmail != null
                && normalizedViewerEmail.equalsIgnoreCase(hostEmail.trim());
    }

    /*
     * 실행/실행 취소 API는 상세 DTO 전체가 아니라, 상태 전환 결과 확인에 필요한 최소 필드만 반환한다.
     * 프론트는 이 응답을 직접 렌더링하기보다 invalidate 후 재조회에 쓰지만,
     * 그래도 현재 상태와 인원 수를 응답에 넣어두면 추후 optimistic UI 확장 시 재사용할 수 있다.
     */
    private ScheduleExecutionResponseDTO toExecutionResponse(Schedule schedule) {
        return new ScheduleExecutionResponseDTO(
                schedule.getId(),
                schedule.getStatus() != null ? schedule.getStatus().name().toUpperCase(Locale.ROOT) : null,
                schedule.getCurrentParticipants(),
                schedule.getMaxParticipants(),
                OffsetDateTime.now(ZoneId.of("Asia/Seoul"))
        );
    }
}
