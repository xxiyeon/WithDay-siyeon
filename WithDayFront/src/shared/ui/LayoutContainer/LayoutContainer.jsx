import clsx from "clsx";
import styles from "./LayoutContainer.module.css";

export default function LayoutContainer({ children, className }) {
  return <div className={clsx(styles.container, className)}>{children}</div>;
}
