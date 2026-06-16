import styles from "./Button.module.css";
import clsx from "clsx";

function Button({
  children,
  variant = "primary", // primary | accent | outline
  size = "md", // sm | md | lg
  disabled = false,
  fullWidth = false,
  className,
  onClick,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={clsx(
        styles.button,
        styles[variant],
        styles[size],
        className,
        {
          [styles.fullWidth]: fullWidth,
          [styles.disabled]: disabled,
        }
      )}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
