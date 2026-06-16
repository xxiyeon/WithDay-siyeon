import styles from "./Dashboard.module.css";
import { getDashboardData } from "../api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Chart from "react-apexcharts";
import Button from "../../../shared/ui/Button/Button";
import GroupIcon from "@mui/icons-material/Group";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import StarIcon from "@mui/icons-material/Star";
import FlagIcon from "@mui/icons-material/Flag";

const Dashboard = () => {
  const [period, setPeriod] = useState("daily");

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => getDashboardData(period),
  });

  // dashboardData의 값이 없을 때 null 반환.
  if (!dashboardData) return null;

  // 오늘 회원 수와 누적 회원 수의 차이
  const userDiff =
    dashboardData.nowTotalUserCount - dashboardData.totalUserCount;

  // 오늘 일정 수와 누적 일정 수의 차이
  const scheduleDiff =
    dashboardData.nowTotalScheduleCount - dashboardData.totalScheduleCount;

  // 차이값에 따라 변동 없으면 -, 늘어나면 ▲, 줄어들면 ▼
  const getArrow = (value) => {
    if (value === 0) return "-";
    return value > 0 ? "▲" : "▼";
  };

  // 차이값에 따라 스타일 (색) 변경
  {
    /* 
    className={
    userDiff > 0
      ? styles.up
      : userDiff < 0
      ? styles.down
      : styles.neutral
    } 
  */
  }
  const getClassName = (value) => {
    if (value === 0) return styles.neutral;
    return value > 0 ? styles.up : styles.down;
  };

  return (
    <div className={styles.dashboard_wrap}>
      <div className={styles.dashboard_card_wrap}>
        <div className={styles.dashboard_card}>
          <div className={styles.icon}>
            <GroupIcon />
          </div>
          <div className={styles.card_content}>
            <span className={styles.label}>전체 회원 수</span>
            {/* .toLocaleString() - 천 단위에 콤마 표시 */}
            <h2>{dashboardData.nowTotalUserCount.toLocaleString()}</h2>
            <p className={getClassName(userDiff)}>
              {getArrow(userDiff)} {Math.abs(userDiff)}
            </p>
          </div>
        </div>

        <div className={styles.dashboard_card}>
          <div className={styles.icon}>
            <CalendarMonthIcon />
          </div>
          <div className={styles.card_content}>
            <span className={styles.label}>전체 일정 수</span>
            <h2>{dashboardData.nowTotalScheduleCount.toLocaleString()}</h2>
            <p className={getClassName(scheduleDiff)}>
              {getArrow(scheduleDiff)} {Math.abs(scheduleDiff)}
            </p>
          </div>
        </div>

        <div className={styles.dashboard_card}>
          <div className={styles.icon}>
            <StarIcon />
          </div>
          <div className={styles.card_content}>
            <span className={styles.label}>추천 일정 수</span>
            <h2>{dashboardData.recommendedScheduleCount.toLocaleString()}</h2>
          </div>
        </div>

        <div className={styles.dashboard_card}>
          <div className={styles.icon}>
            <FlagIcon />
          </div>
          <div className={styles.card_content}>
            <div className={styles.statusRow}>
              <span>완료된 일정</span>
              <strong>
                {dashboardData.completedScheduleCount.toLocaleString()}
              </strong>
            </div>
            <div className={styles.statusRow}>
              <span>모집마감 일정</span>
              <strong>
                {dashboardData.closedScheduleCount.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.dashboard_chart_wrap}>
        <div className={styles.dashboard_main_chart}>
          <div className={styles.button_wrap}>
            {/* 각 버튼 클릭 시 차트에 출력되는 조건 다르게 설정 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPeriod("daily")}
            >
              일별
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPeriod("weekly")}
            >
              주간
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPeriod("monthly")}
            >
              월별
            </Button>
          </div>
          <UserScheduleAreaChart
            dashboardList={dashboardData.dashboardList}
            period={period}
          />
        </div>
        <div className={styles.dashboard_sub_chart_wrap}>
          <div className={styles.dashboard_sub_chart}>
            <DonutChart
              recommended={dashboardData.recommendedScheduleCount}
              normal={dashboardData.nowTotalScheduleCount}
            />
          </div>
          <div className={styles.dashboard_sub_chart}>
            <ScheduleStatusChart
              completed={dashboardData.completedScheduleCount}
              closed={dashboardData.closedScheduleCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const UserScheduleAreaChart = ({ dashboardList, period }) => {
  const categories = dashboardList.map((item) => item.statDate); // x축, 날짜

  const userData = dashboardList.map((item) => item.totalUserCount); // 회원 수

  const scheduleData = dashboardList.map((item) => item.totalScheduleCount); //일정 수

  const series = [
    // 차트 데이터를 생성 (실제 그래프 데이터)
    {
      name: "회원 수",
      data: userData,
    },
    {
      name: "일정 수",
      data: scheduleData,
    },
  ];

  const options = {
    chart: {
      type: "area", // 차트 종류 Area
      height: 400,
      toolbar: {
        // toolbar 제거
        show: false,
      },
      zoom: {
        // 드래그 확대 기능 제거
        enabled: false,
      },
    },

    title: {
      text:
        period === "daily"
          ? "일별 추이"
          : period === "weekly"
            ? "주간 추이"
            : "월별 추이",
      align: "left",
      style: {
        fontSize: "18px",
        fontWeight: 700,
      },
    },

    stroke: {
      curve: "smooth", // 선 모양
      width: 2,
    },

    dataLabels: {
      // 그래프 점 위 숫자 제거
      enabled: false,
    },

    fill: {
      // 그래프 아래 영역을 그라데이션으로 칠함
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.5,
        stops: [0, 90, 100],
      },
    },

    xaxis: {
      categories, // 날짜
      labels: {
        rotate: -45,
      },
    },

    yaxis: {
      labels: {
        formatter: (value) => Math.floor(value), // 소수점 제거
      },
    },

    legend: {
      // 범례 위치
      position: "top",
      horizontalAlign: "right",
    },

    tooltip: {
      // 마우스 올렸을 때
      y: {
        formatter: (value) => `${value}개`,
      },
    },

    grid: {
      // 배경 점선 형태로 표시
      borderColor: "#e5e7eb",
      strokeDashArray: 4,
    },
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <Chart
      options={options}
      series={series}
      type="area"
      height={isMobile ? 280 : 400}
    />
  );
};

const DonutChart = ({ recommended, normal }) => {
  const options = {
    labels: ["추천 일정", "일반 일정"],
    dataLabels: { enabled: false },
    title: {
      text: "추천 일정 / 일반 일정", // 상단 제목
      align: "left",
      style: {
        fontSize: "18px",
        fontWeight: 700,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          labels: {
            show: true,

            value: {
              show: true,
              formatter: (val) => {
                return parseInt(val);
              },
            },

            total: {
              show: true,
              label: "전체",
              formatter: (w) => {
                return w.globals.seriesTotals.reduce((a, b) => a + b, 0);
              },
            },
          },
        },
      },
    },
    legend: {
      position: "bottom",
      formatter: function (seriesName, opts) {
        return seriesName + " : " + opts.w.globals.series[opts.seriesIndex];
      },
    },
  };

  const series = [recommended, normal];

  return <Chart options={options} series={series} type="donut" height={200} />;
};

const ScheduleStatusChart = ({ completed, closed }) => {
  const series = [
    {
      name: "일정 수",
      data: [completed, closed],
    },
  ];

  const options = {
    chart: {
      type: "bar",
    },
    title: {
      text: "완료 / 모집마감 일정", // 상단 제목
      align: "left",
      style: {
        fontSize: "18px",
        fontWeight: 700,
      },
    },
    xaxis: {
      categories: ["완료된 일정", "모집마감 일정"],
    },
    legend: {
      position: "bottom",
    },
  };

  return <Chart options={options} series={series} type="bar" height={200} />;
};

export default Dashboard;
