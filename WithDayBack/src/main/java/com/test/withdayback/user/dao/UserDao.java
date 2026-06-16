package com.test.withdayback.user.dao;

import com.test.withdayback.user.vo.Interest;
import com.test.withdayback.user.vo.Terms;
import com.test.withdayback.user.vo.User;
import com.test.withdayback.user.vo.UserInterest;
import com.test.withdayback.user.vo.UserTerms;
import com.test.withdayback.user.dto.FindAccountDTO;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Mapper;

import java.util.List;

// @Mapper: 스프링 부트와 MyBatis(SQL 도구)를 연결해주는 어노테이션, 스프링이 알아서 XML 파일(user-mapper.xml)에 가서 SQL 쿼리 실행하게 연결해줌.
@Mapper
public interface UserDao {

    // 유저 정보 저장
    void insertUser(User user);

    // 이메일로 유저찾기
    User findByEmail(String email);

    // suspended 포함 원본 row 조회가 필요한 예외 경로(탈퇴 처리, 운영 점검)에서만 사용한다.
    User findAnyByEmail(String email);

    // 이메일로 유저 ID 찾기
    Long findUserIdByEmail(String email);
    
    // 닉네임과 전화번호로 유저찾기
    User findByNicknameAndPhone(FindAccountDTO findAccountDTO);

    // 비밀번호 변경
    // email과 password처럼 값을 2개 이상 따로 넘길 때는 MyBatis가 이름을 헷갈리지 않도록 @Param으로 이름표를 붙여줌.
    // 여기서 password는 유저가 입력한 원본 비밀번호가 아니라, Service에서 암호화가 끝난 비밀번호임.
    void updatePassword(
            @Param("email") String email,
            @Param("password") String password
    );

    // 약관 동의 내역 저장
    void insertUserTerms(UserTerms userTerms);

    // 약관 리스트 전체 가져오기
    List<Terms> getAllTerms();

    // 아이디로 유저찾기
    User findById(Long userId);
    
    // 관심사 리스트 전체 가져오기
    List<Interest> getAllInterests();

    // 유저의 관심사 선택 내역 저장
    void insertUserInterest(UserInterest userInterest);

    // 유저가 선택한 관심사 id 목록 가져오기
    List<Long> getUserInterestIds(Long userId);

    // 유저의 알림 동의 여부 가져오기
    Boolean getNotificationAgreed(Long userId);

    // 마이페이지 유저 기본 정보 수정
    void updateMypageUser(User user);

    // 유저의 기존 관심사 전체 삭제
    void deleteUserInterests(Long userId);

    void deleteUserTermsByUserId(Long userId);

    int deleteNotificationsByUserId(Long userId);

    int closeSchedulesByHostUserId(Long userId);

    int deleteNonApprovedParticipationsByUserId(Long userId);

    // 특정 유저가 특정 약관에 대한 동의 내역을 가지고 있는지 확인
    int countUserTerms(
            @Param("userId") Long userId,
            @Param("termsId") Long termsId
    );

    // 유저의 특정 약관 동의 여부 수정
    void updateUserTermsAgreed(UserTerms userTerms);

    void updateProfileImage(
            @Param("userId") Long userId,
            @Param("profileImage") String profileImage
    );
    int getTogetherScheduleCount(Long userId);

    int getMetWitCount(Long userId);

    int deleteBookmarksByUserId(Long userId);

    int softDeleteUser(
            @Param("userId") Long userId,
            @Param("tombstoneEmail") String tombstoneEmail
    );

}
