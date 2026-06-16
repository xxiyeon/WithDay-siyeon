import { useRef } from "react";

import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";

export default function CommonSelect({
  label,
  value,
  onChange,
  options = [],
  fullWidth = true,
  size = "medium",
  borderColor = "var(--color-primary)",
}) {
  const selectRef = useRef(null);

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "8px",

          "& fieldset": {
            borderColor,
          },

          "&:hover fieldset": {
            borderColor,
          },

          "&.Mui-focused fieldset": {
            borderColor,
            borderWidth: "2px",
          },
        },

        "& .MuiInputLabel-root": {
          color: borderColor,
        },

        "& .MuiInputLabel-root.Mui-focused": {
          color: borderColor,
        },

        "& .MuiSelect-icon": {
          color: borderColor,
        },
      }}
    >
      <InputLabel shrink>{label}</InputLabel>

      {/* mui select - 내부 상태를 따로 관리하는 제어 컴포넌트 */}
      <Select
        ref={selectRef}
        value={value}
        label={label}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return <span style={{ color: "#999" }}>{label}</span>;
          }

          return options.find((o) => o.value === selected)?.label;
        }}
        onChange={(e) => {
          onChange?.(e);

          // 선택 후 포커스 제거
          setTimeout(() => {
            //focus를 잡고 있는 내부 버튼/div요소를 ref로 직접 해제
            selectRef.current?.blur();
          }, 0);
        }}
        MenuProps={{
          // select 버튼 눌러도 스크롤 바 고정되게
          disableScrollLock: true,
        }}
      >
        {options
          .filter((option) => option.value !== "")
          .map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
}
