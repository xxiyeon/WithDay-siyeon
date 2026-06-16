import styles from "../../../page/schedule/ScheduleDetail.module.css";

export default function ScheduleDailyPlan({ details }) {
  if (!details || details.length === 0) return null;

  return (
    <section className={styles.contentWrapper}>
      <h2 className={styles.subTitle}>세부 일정 (Day-by-Day)</h2>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {details.map((detail) => (
          <div
            key={detail.id}
            style={{
              padding: "1rem",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
            }}
          >
            <h3
              style={{
                margin: "0 0 0.5rem 0",
                color: "#1976d2",
                fontSize: "1.1rem",
              }}
            >
              Day {detail.dayNumber}
            </h3>
            <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>
              {detail.title}
            </h4>
            <p
              style={{
                margin: 0,
                color: "#555",
                fontSize: "0.95rem",
                whiteSpace: "pre-wrap",
              }}
            >
              {detail.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
