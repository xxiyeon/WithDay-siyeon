import Popover from "@mui/material/Popover";
import useMediaQuery from "@mui/material/useMediaQuery";
import NotificationList from "./NotificationList";

export default function NotificationPopover({ open, anchorEl, handleClose }) {
  const isMobile = useMediaQuery("(max-width:768px)");

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      // 헤더 알림은 기준 요소에 붙는 팝오버라 body scroll lock이 필요 없다.
      // 기본 scroll lock이 scrollbar 보정용 padding-right를 body에 주입해서 레이아웃이 흔들리므로 여기서 끈다.
      disableScrollLock
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      slotProps={{
        paper: {
          sx: {
            position: isMobile ? "fixed" : "absolute",
            top: isMobile ? "50%" : undefined,
            left: isMobile ? "50%" : undefined,
            transform: isMobile ? "translate(-50%, -50%)" : undefined,

            width: isMobile ? "calc(100% - 24px)" : 480,
            maxWidth: isMobile ? "calc(100% - 24px)" : 480,
            maxHeight: isMobile ? "80vh" : 600,

            overflowY: "auto",
            borderRadius: 2,
            m: 0,
          },
        },
      }}
    >
      <NotificationList onClose={handleClose} />
    </Popover>
  );
}
