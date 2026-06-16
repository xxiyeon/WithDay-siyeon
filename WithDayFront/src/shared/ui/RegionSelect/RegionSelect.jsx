import { useMemo, useState } from "react";
import clsx from "clsx";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import styles from "./RegionSelect.module.css";

const THEME_CLASS_MAP = {
  navy: styles.themeNavy,
  white: styles.themeWhite,
  mint: styles.themeMint,
};

export default function RegionSelect({
  value = "",
  options = [],
  onSelect,
  theme = "navy",
  className,
}) {
  const [anchorEl, setAnchorEl] = useState(null);

  const selectedOption = useMemo(() => {
    return (
      options.find((option) => option.value === value) ??
      options[0] ?? { label: "지역 선택", value: "" }
    );
  }, [options, value]);

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (option) => {
    onSelect?.(option);
    handleClose();
  };

  return (
    <>
      <button
        type="button"
        className={clsx(
          styles.trigger,
          THEME_CLASS_MAP[theme] ?? styles.themeNavy,
          className,
        )}
        onClick={(event) => setAnchorEl(event.currentTarget)}
      >
        <span className={styles.iconWrap}>
          <PlaceOutlinedIcon fontSize="small" />
        </span>
        <span className={styles.label}>{selectedOption.label}</span>
        <KeyboardArrowDownRoundedIcon
          className={clsx(styles.arrow, {
            [styles.arrowOpen]: Boolean(anchorEl),
          })}
          fontSize="small"
        />
      </button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        disableScrollLock
        PaperProps={{ className: styles.menuPaper }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value || option.label}
            className={clsx(styles.menuItem, {
              [styles.menuItemSelected]: option.value === selectedOption.value,
            })}
            selected={option.value === selectedOption.value}
            onClick={() => handleSelect(option)}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
