import Pagination from "../../../shared/ui/Pagination/Pagination";
import styles from "./ScheduleList.module.css";
import { Link } from "react-router-dom";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateSchedulePublic, deleteSchedule } from "../api";

const ScheduleList = ({
  scheduleList = [],
  page,
  setPage,
  totalPage,
  totalSchedules,
}) => {
  const isMobile = window.innerWidth <= 768;

  return (
    <div className={styles.scheduleList}>
      <label className={styles.scheduleCount}>총 {totalSchedules}건</label>

      <ul className={styles.scheduleHeader}>
        <li style={{ flex: 3 }}>일정명</li>
        <li style={{ flex: 2 }}>지역</li>
        <li style={{ flex: 1, textAlign: "center" }}>작성자</li>
        <li style={{ flex: 1, textAlign: "center" }}>상태</li>
        <li style={{ flex: 1, textAlign: "center" }}>공개여부</li>
        <li style={{ flex: 2, textAlign: "center" }}>등록일</li>
        <li style={{ flex: 0.5 }}>관리</li>
      </ul>

      <ul className={styles.scheduleWrap}>
        {scheduleList.length > 0 ? (
          scheduleList.map((schedule) => (
            <ScheduleItem key={`schedule-${schedule.id}`} schedule={schedule} />
          ))
        ) : (
          <h3 className={styles.resultNone}>조회 결과가 없습니다.</h3>
        )}

        <div>
          <Pagination
            page={page}
            setPage={setPage}
            totalPage={totalPage ?? 0}
            naviSize={isMobile ? 3 : 5}
          />
        </div>
      </ul>
    </div>
  );
};

const ScheduleItem = ({ schedule }) => {
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const statusMap = {
    recruiting: "모집중",
    closed: "모집마감",
    canceled: "일정취소",
    completed: "일정완료",
  };

  const publicMap = {
    1: "공개",
    0: "비공개",
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const queryClient = useQueryClient();

  const updatePublicMutation = useMutation({
    mutationFn: updateSchedulePublic,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduleList"],
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scheduleList"],
      });
    },
  });

  const handleTogglePublic = async () => {
    try {
      await updatePublicMutation.mutateAsync(schedule.id);

      handleMenuClose();
    } catch (error) {
      console.error(error);
      alert("공개 여부 변경 실패");
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm("정말 이 일정을 삭제하시겠습니까?");

    if (!confirmDelete) return;

    try {
      await deleteMutation.mutateAsync(schedule.id);

      handleMenuClose();
    } catch (error) {
      console.error(error);
      alert("일정 삭제 실패");
    }
  };

  return (
    <ul
      className={`${styles.scheduleItem} ${
        schedule.deletedAt ? styles.deletedItem : ""
      }`}
    >
      <li style={{ flex: 3 }}>
        <Link to={`/schedule/${schedule.id}`} className={styles.scheduleLink}>
          {schedule.title}
        </Link>
      </li>
      <li style={{ flex: 2 }}>
        {schedule.region} {schedule.detailRegion}
      </li>
      <li style={{ flex: 1, textAlign: "center" }}>{schedule.nickname}</li>
      <li style={{ flex: 1, textAlign: "center" }}>
        {statusMap[schedule.status] ?? schedule.status}
      </li>
      <li style={{ flex: 1, textAlign: "center" }}>
        {publicMap[schedule.isPublic] ?? "-"}
      </li>
      <li style={{ flex: 2, textAlign: "center" }}>
        {schedule.createdAt?.slice(0, 10)}
      </li>

      {/* 메뉴 */}
      <li style={{ flex: 0.5 }}>
        <IconButton onClick={handleMenuOpen}>
          <MoreVertIcon />
        </IconButton>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          disableScrollLock
        >
          <MenuItem onClick={handleTogglePublic}>
            {schedule.isPublic === 1 ? "비공개로 변경" : "공개로 변경"}
          </MenuItem>

          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            일정 삭제
          </MenuItem>
        </Menu>
      </li>

      {/* 모바일 */}
      <div className={styles.mobileCard}>
        <div className={styles.mobileHeader}>
          <strong>
            <Link
              to={`/schedule/${schedule.id}`}
              className={styles.scheduleLink}
            >
              {schedule.title}
            </Link>
          </strong>

          <div className={styles.mobileMenu}>
            <IconButton onClick={handleMenuOpen}>
              <MoreVertIcon />
            </IconButton>
          </div>
        </div>

        <div className={styles.mobileInfo}>
          <span>
            지역 : {schedule.region} {schedule.detailRegion}
          </span>
          <span>작성자 : {schedule.nickname}</span>
          <span>상태 : {statusMap[schedule.status] ?? schedule.status}</span>
          <span>공개여부 : {publicMap[schedule.isPublic] ?? "-"}</span>
          <span>등록일 : {schedule.createdAt?.slice(0, 10)}</span>
        </div>
      </div>
    </ul>
  );
};

export default ScheduleList;
