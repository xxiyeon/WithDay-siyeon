package com.test.withdayback.schedule.controller;

import com.test.withdayback.common.util.JwtUtil;
import com.test.withdayback.schedule.dto.BookmarkStatusResponseDTO;
import com.test.withdayback.schedule.dto.BookmarkToggleRequestDTO;
import com.test.withdayback.schedule.service.BookmarkService;
import com.test.withdayback.schedule.vo.Schedule;
import com.test.withdayback.user.service.UserService;
import com.test.withdayback.user.vo.User;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/bookmarks")
@CrossOrigin("*")
public class BookmarkController {

    private final BookmarkService bookmarkService;
    private final JwtUtil jwtUtil;
    private final UserService userService;

    public BookmarkController(
            BookmarkService bookmarkService,
            JwtUtil jwtUtil,
            UserService userService
    ) {
        this.bookmarkService = bookmarkService;
        this.jwtUtil = jwtUtil;
        this.userService = userService;
    }

    /*
     * 이 프로젝트는 아직 공통 principal 주입 계층이 없어서,
     * 북마크 API도 notification API와 같은 직접 토큰 파싱 패턴을 따른다.
     * 이렇게 맞추면 이번 기능은 구현 범위를 북마크 도메인에만 한정하면서도 기존 인증 흐름과 충돌하지 않는다.
     */
    @PostMapping
    public ResponseEntity<BookmarkStatusResponseDTO> addBookmark(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody BookmarkToggleRequestDTO request
    ) {
        Long userId = resolveUserId(authHeader);
        BookmarkStatusResponseDTO response =
                bookmarkService.addBookmark(userId, request.getScheduleId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<BookmarkStatusResponseDTO> deleteBookmark(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long scheduleId
    ) {
        Long userId = resolveUserId(authHeader);
        BookmarkStatusResponseDTO response =
                bookmarkService.removeBookmark(userId, scheduleId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Schedule>> getBookmarks(
            @RequestHeader("Authorization") String authHeader
    ) {
        Long userId = resolveUserId(authHeader);
        return ResponseEntity.ok(bookmarkService.getBookmarks(userId));
    }

    @GetMapping("/{scheduleId}/exists")
    public ResponseEntity<BookmarkStatusResponseDTO> existsBookmark(
            @RequestHeader("Authorization") String authHeader,
            @PathVariable Long scheduleId
    ) {
        Long userId = resolveUserId(authHeader);
        return ResponseEntity.ok(bookmarkService.getBookmarkStatus(userId, scheduleId));
    }

    private Long resolveUserId(String authHeader) {
        if (authHeader == null || authHeader.isBlank() || !authHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "로그인이 필요합니다."
            );
        }

        String token = authHeader.replace("Bearer ", "");
        String email = jwtUtil.getEmail(token);
        User user = userService.findByEmail(email);

        if (user == null || user.getId() == null) {
            throw new ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "로그인 사용자를 찾을 수 없습니다."
            );
        }

        return user.getId();
    }
}
