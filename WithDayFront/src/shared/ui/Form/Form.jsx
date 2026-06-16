import { forwardRef } from "react";
import clsx from "clsx";
import styles from "./Form.module.css";

/* ===== Input ===== */
const Input = forwardRef(({ error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={clsx(styles.input, {
        [styles.error]: error,
      })}
      {...props}
    />
  );
});

/* ===== TextArea ===== */
const TextArea = forwardRef(({ error, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={clsx(styles.textarea, {
        [styles.error]: error,
      })}
      {...props}
    />
  );
});

export { Input, TextArea };
