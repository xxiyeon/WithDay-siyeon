import { Link } from "react-router-dom";
import Pagination from "../../../shared/ui/Pagination/Pagination";
import styles from "./MemberList.module.css";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import { releaseUser, roleChange, suspendUser } from "../api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const MemberList = ({ memberList, page, setPage, totalPage, totalMembers }) => {
  return (
    <div className={styles.member_list}>
      <label className={styles.member_count}>총 {totalMembers}명</label>
      <ul className={styles.member_item_title}>
        <li className={styles.member_profile}>회원</li>
        <li className={styles.member_email}>이메일</li>
        <li className={styles.member_route}>가입 경로</li>
        <li className={styles.member_gender}>성별</li>
        <li className={styles.member_birthday}>생년월일</li>
        <li className={styles.member_status}>상태</li>
        <li className={styles.member_create}>가입일</li>
        <li className={styles.member_manage}>관리</li>
      </ul>
      <ul className={styles.member_list_wrap}>
        {memberList?.length > 0 ? (
          memberList.map((member) => (
            <MemberItem key={`member-list-${member.email}`} member={member} />
          ))
        ) : (
          <h3 className={styles.resultNone}>조회 결과가 없습니다.</h3>
        )}
        <div>
          <Pagination
            page={page}
            setPage={setPage}
            totalPage={totalPage ?? 0}
            naviSize={5}
          />
        </div>
      </ul>
    </div>
  );
};

const MemberItem = ({ member }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const queryClient = useQueryClient();

  const makeAdminMutation = useMutation({
    mutationFn: roleChange,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["memberList"],
      });

      alert("관리자로 변경되었습니다.");
    },
    onError: () => {
      alert("관리자 변경 실패");
    },
  });

  const handleRoleChange = async () => {
    const confirmChange = window.confirm(
      "해당 회원을 관리자로 변경하시겠습니까?",
    );

    if (!confirmChange) return;

    try {
      // API 응답이 올 때까지 기다림.
      // 흐름 제어를 위해 사용
      await makeAdminMutation.mutateAsync(member.email);

      handleMenuClose();
    } catch (error) {
      console.error(error);
      alert("관리자 변경 실패");
    }
  };

  const suspendMutation = useMutation({
    mutationFn: suspendUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["memberList"],
      });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: releaseUser,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["memberList"],
      });
    },
  });

  const handleSuspend = async () => {
    try {
      await suspendMutation.mutateAsync(member.email);
    } catch (error) {
      console.error(error);
      alert("회원 정지 실패");
    }
  };

  const handleRelease = async () => {
    try {
      await releaseMutation.mutateAsync(member.email);
    } catch (error) {
      console.error(error);
      alert("정지 해제 실패");
    }
  };

  const handleStatusChange = () => {
    if (member.status === "active") {
      handleSuspend(); // 회원 정지
    } else if (member.status === "suspended") {
      handleRelease(); // 정지 해제
    }

    handleMenuClose();
  };

  return (
    <ul className={styles.member_item}>
      <li className={styles.member_profile}>
        <div className={styles.member_profile_item}>
          {member.profileImage ? (
            <img
              src={member.profileImage}
              alt="프로필 이미지"
              className={styles.profileImage}
            />
          ) : (
            <AccountCircleIcon
              sx={{
                fontSize: 40,
              }}
            ></AccountCircleIcon>
          )}

          <Link to={`/mypage/${member.email}`} className={styles.memberLink}>
            {member.nickname}
          </Link>
        </div>
      </li>
      <li className={styles.member_email}>{member.email}</li>
      <li className={styles.member_route}>{member.provider}</li>
      <li className={styles.member_gender}>
        {member.gender == 1 ? "남" : "여"}
      </li>
      <li className={styles.member_birthday}>{member.birthday}</li>
      <li className={styles.member_status}>
        {member.status === "admin"
          ? "관리자"
          : member.status === "active"
            ? "회원"
            : "정지"}
      </li>

      <li className={styles.member_create}>{member.createdAt.slice(0, 10)}</li>
      {/* 메뉴 */}
      <li className={styles.member_manage}>
        {member.status === "admin" ? null : (
          <>
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              disableScrollLock
            >
              <MenuItem onClick={handleRoleChange}>
                {member.status === "active" ? "관리자로 변경" : ""}
              </MenuItem>

              <MenuItem
                onClick={handleStatusChange}
                sx={{ color: "error.main" }}
              >
                {member.status === "active" ? "회원 정지" : "정지 해제"}
              </MenuItem>
            </Menu>
          </>
        )}
      </li>

      {/* 모바일 전용 추가 */}
      <div className={styles.mobileCard}>
        <div className={styles.mobileHeader}>
          {member.profileImage ? (
            <img
              src={member.profileImage}
              alt="프로필 이미지"
              className={styles.profileImage}
            />
          ) : (
            <AccountCircleIcon sx={{ fontSize: 40 }} />
          )}

          <div>
            <strong>{member.nickname}</strong>
            <p>{member.email}</p>
          </div>
        </div>

        <div className={styles.mobileInfo}>
          <span>가입경로 : {member.provider}</span>
          <span>성별 : {member.gender ? "남" : "여"}</span>
          <span>생년월일 : {member.birthday}</span>
          <span>
            상태 :
            {member.status === "admin"
              ? "관리자"
              : member.status === "active"
                ? "회원"
                : "정지"}
          </span>
          <span>가입일 : {member.createdAt.slice(0, 10)}</span>
        </div>
      </div>
    </ul>
  );
};

export default MemberList;
