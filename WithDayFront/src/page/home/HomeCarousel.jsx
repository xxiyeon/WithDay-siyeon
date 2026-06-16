import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import styles from "./Home.module.css";

const AUTO_PLAY_DELAY = 4500;

const CAROUSEL_ITEMS = [
  {
    id: "withday-night",
    image: "/carousel.png",
    title: "지도에는 없는 길, 우리라는 이름으로 걷다",
    description: "밥 한 끼부터 주말 여행까지, 같이 갈 위트를 찾아보세요.",
  },
  {
    id: "withday-museum",
    image: "/artGallery.png",
    title: "전시회는 좋은데, 감상평 혼잣말은 좀 그렇잖아요",
    description: "취향 맞는 사람과 전시·문화 일정을 함께 즐겨보세요.",
  },
  {
    id: "withday-travel",
    image: "/scenery.png",
    title: "이번 주말도 집콕? 그건 날씨한테 예의가 아니죠",
    description: "근교 여행, 당일치기, 가벼운 나들이 일정을 만나보세요.",
  },
  {
    id: "withday-dining",
    image: "/izakaya.png",
    title: "맛집은 찾았는데 같이 갈 사람이 없다면",
    description: "퇴근 후 한 끼, 카페, 술집 번개까지 부담 없이 시작해보세요.",
  },
  {
    id: "withday-activity",
    image: "/trip.png",
    title: "운동은 싫지만 액티비티는 또 못 참지",
    description: "등산, 러닝, 서핑, 클라이밍처럼 움직이는 일정을 둘러보세요.",
  },
  {
    id: "withday-culture",
    image: "/concert.png",
    title: "공연 끝나고 ‘와 지웅짜 좋았다’만 하기 아쉽다면",
    description: "같은 취향의 위트와 공연·축제·전시 이야기를 나눠보세요.",
  },
  {
    id: "withday-gathering",
    image: "/busStop.png",
    title: "새로운 사람? 부담 없이, 어색함은 짧게",
    description: "동네 산책, 카페 대화, 소규모 모임을 가볍게 시작해보세요.",
  },
];

export default function HomeCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideCount = useMemo(() => CAROUSEL_ITEMS.length, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentIndex((previousIndex) => (previousIndex + 1) % slideCount);
    }, AUTO_PLAY_DELAY);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  const currentItem = CAROUSEL_ITEMS[currentIndex];

  return (
    <section className={styles.heroSection}>
      <div className={styles.carousel}>
        <div
          className={styles.carouselTrack}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {CAROUSEL_ITEMS.map((item) => (
            <article className={styles.carouselSlide} key={item.id}>
              <img
                src={item.image}
                alt={item.title}
                className={styles.carouselImage}
              />
            </article>
          ))}
        </div>
      </div>

      <div className={styles.carouselFooter}>
        <div className={styles.carouselTextWrap}>
          <p className={styles.carouselCaption}>{currentItem.title}</p>
          <p className={styles.carouselSubcaption}>{currentItem.description}</p>
        </div>
        <div className={styles.carouselDots}>
          {CAROUSEL_ITEMS.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={clsx(styles.carouselDot, {
                [styles.carouselDotActive]: index === currentIndex,
              })}
              onClick={() => setCurrentIndex(index)}
              aria-label={`${index + 1}번 배너로 이동`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
