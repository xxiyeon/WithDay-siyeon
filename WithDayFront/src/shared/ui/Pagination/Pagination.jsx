import FirstPageRoundedIcon from "@mui/icons-material/FirstPageRounded";
import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import LastPageRoundedIcon from "@mui/icons-material/LastPageRounded";
import styles from "./Pagination.module.css";

const Pagination = ({ page, setPage, totalPage, naviSize }) => {
  if (totalPage === null || totalPage < 1) {
    //db 먼저 수행할 수 있도록 함
    return;
  }

  // 현재 페이지 번호 (서버에 주는 숫자 + 1, 1부터 시작하도록)
  const current = page + 1;
  const halfLenth = Math.floor(naviSize / 2);
  // 현재 페이지가 페이지네이션의 가운데 숫자가 될 수 있도록 함
  let startPage = Math.max(1, current - halfLenth);
  // 마지막 페이지가 총 페이지 개수를 넘지 않도록
  let endPage = Math.min(totalPage, startPage + naviSize - 1);

  const pages = new Array();
  for (let i = startPage; i < endPage + 1; i++) {
    pages.push(i);
  }

  const isFirst = current === 1;
  const isLast = current === totalPage;

  return (
    <div className={styles.pagination_wrap}>
      <button
        type="button"
        onClick={() => {
          setPage(0);
        }}
        disabled={isFirst}
        className={`${styles.navButton} ${styles.firstLastButton}`}
        aria-label="첫 페이지"
      >
        <FirstPageRoundedIcon className={styles.navIcon} />
      </button>
      <button
        type="button"
        onClick={() => {
          setPage(page - 1);
        }}
        disabled={isFirst}
        className={styles.navButton}
        aria-label="이전 페이지"
      >
        <KeyboardArrowLeftRoundedIcon className={styles.navIcon} />
      </button>
      {pages.map((p, i) => {
        return (
          <button
            type="button"
            key={"pagination-" + i}
            onClick={() => {
              setPage(p - 1);
            }}
            className={`${styles.pageButton} ${
              p === current ? styles.active : ""
            }`}
            aria-current={p === current ? "page" : undefined}
          >
            {p}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => {
          setPage(page + 1);
        }}
        disabled={isLast}
        className={styles.navButton}
        aria-label="다음 페이지"
      >
        <KeyboardArrowRightRoundedIcon className={styles.navIcon} />
      </button>
      <button
        type="button"
        onClick={() => {
          setPage(totalPage - 1);
        }}
        disabled={isLast}
        className={`${styles.navButton} ${styles.firstLastButton}`}
        aria-label="마지막 페이지"
      >
        <LastPageRoundedIcon className={styles.navIcon} />
      </button>
    </div>
  );
};

export default Pagination;
