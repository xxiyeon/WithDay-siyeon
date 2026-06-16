import { useNavigate } from "react-router-dom";
import Button from "../../shared/ui/Button/Button";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <div className={styles.card}>
        <img src="/logo.png" alt="WithDay 로고" className={styles.logo} />

        <div className={styles.textBlock}>
          <p className={styles.statusCode}>404</p>
          <h1 id="not-found-title" className={styles.title}>
            페이지를 찾을 수 없습니다.
          </h1>
          <p className={styles.description}>
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
          <p className={styles.description}>
            홈으로 돌아가거나 새로운 일정을 탐색해보세요.
          </p>
        </div>

        <div className={styles.actionGroup}>
          <Button
            variant="accent"
            size="lg"
            className={styles.primaryAction}
            onClick={() => navigate("/")}
          >
            홈으로 이동
          </Button>
          <Button
            variant="outline"
            size="lg"
            className={styles.secondaryAction}
            onClick={() => navigate("/explore")}
          >
            탐색하러 가기
          </Button>
        </div>
      </div>
    </section>
  );
}
