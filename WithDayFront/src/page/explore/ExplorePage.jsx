import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import Select from "@mui/material/Select";
import styles from "./ExplorePage.module.css";
import Button from "../../shared/ui/Button/Button";
import ScheduleCard from "../../features/schedule/ui/ScheduleCard";
import { fetchSchedules } from "../../features/schedule/api";
import { useAuthStore } from "../../features/auth/store/authStore";
import { getDetailRegion, getRegion } from "../../features/region/api";

const CATEGORY_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "travel", label: "여행" },
  { value: "popup", label: "팝업" },
  { value: "food", label: "식사" },
  { value: "activity", label: "액티비티" },
  { value: "culture", label: "문화" },
  { value: "etc", label: "기타" },
];

const GENDER_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "male", label: "남성만" },
  { value: "female", label: "여성만" },
];

const SORT_OPTIONS = [
  { value: "latest", label: "최신 등록순" },
  { value: "deadlineSoon", label: "마감 임박순" },
  { value: "deadlineRelaxed", label: "마감 여유순" },
  { value: "startSoon", label: "일정 시작일 빠른순" },
  { value: "startLate", label: "일정 시작일 늦은순" },
];

const DEFAULT_FILTERS = Object.freeze({
  keyword: "",
  category: "all",
  region: "",
  district: "",
  genderLimit: "all",
  sort: "latest",
  startDate: "",
  endDate: "",
});

/*
 * 탐색 탭의 카드 key 생성 규칙이다.
 * 정상 응답은 schedule.id를 사용하고, 과거 응답 형태나 임시 데이터처럼 id가 없는 경우에도 렌더링이 깨지지 않도록 fallback을 둔다.
 */
const getScheduleKey = (schedule) =>
  String(
    schedule?.id ??
    schedule?.scheduleId ??
    `${schedule?.title ?? "schedule"}-${schedule?.startDate ?? "unknown"}`,
  );

const normalizeText = (value) => value?.trim() ?? "";

const getKstToday = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const dateParts = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
};

const findLabel = (options, value) =>
  options.find((option) => option.value === value)?.label ?? value;

const formatVisibleDate = (value, fallbackLabel) => {
  if (!value) {
    return fallbackLabel;
  }

  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) {
    return fallbackLabel;
  }

  return `${year}.${month}.${day}`;
};

const buildFilterChips = (filters) => {
  const chips = [];

  if (filters.keyword) {
    chips.push({ key: "keyword", label: filters.keyword });
  }

  if (filters.category !== "all") {
    chips.push({
      key: "category",
      label: findLabel(CATEGORY_OPTIONS, filters.category),
    });
  }

  if (filters.region) {
    chips.push({
      key: filters.district ? "district" : "region",
      label: filters.district
        ? `${filters.region} ${filters.district}`
        : filters.region,
    });
  }

  if (filters.genderLimit !== "all") {
    chips.push({
      key: "genderLimit",
      label: findLabel(GENDER_OPTIONS, filters.genderLimit),
    });
  }

  if (filters.startDate || filters.endDate) {
    const startLabel = filters.startDate
      ? filters.startDate.slice(5).replace("-", ".")
      : "시작일";
    const endLabel = filters.endDate
      ? filters.endDate.slice(5).replace("-", ".")
      : "종료일";
    chips.push({ key: "dateRange", label: `${startLabel}~${endLabel}` });
  }

  if (filters.sort !== "latest") {
    chips.push({ key: "sort", label: findLabel(SORT_OPTIONS, filters.sort) });
  }

  return chips;
};

const FILTER_MENU_PROPS = {
  disableScrollLock: true,
  PaperProps: {
    style: {
      maxHeight: 320,
    },
  },
};

/*
 * 탐색 탭은 Header 지역 상태에 의존하지 않고, 검색/지역/성별/기간/정렬을 한 화면에서 조합한다.
 * draftFilters는 사용자가 현재 만지는 값이고, appliedFilters는 실제 GET /schedules 요청에 들어간 마지막 조건이다.
 */
export default function ExplorePage() {
  const today = useMemo(() => getKstToday(), []);
  const authEmail = useAuthStore((state) => state.user?.email?.trim() ?? "");
  const [draftFilters, setDraftFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);

  const { data: regions = [] } = useQuery({
    queryKey: ["explore-region-options"],
    queryFn: getRegion,
    staleTime: 1000 * 60 * 10,
  });

  const selectedRegion = normalizeText(draftFilters.region);

  const { data: detailRegions = [] } = useQuery({
    queryKey: ["explore-detail-region-options", selectedRegion],
    queryFn: () => getDetailRegion(selectedRegion),
    enabled: Boolean(selectedRegion),
    staleTime: 1000 * 60 * 10,
  });

  const selectedFilterChips = useMemo(
    () => buildFilterChips(appliedFilters),
    [appliedFilters],
  );

  /*
   * queryKey에는 적용된 필터 전체를 펼쳐 넣는다.
   * draft 값은 검색 버튼 전까지 queryKey에 들어가지 않아, 필터를 둘러보는 동안 API가 흔들리지 않는다.
   */
  const {
    data: schedules = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: [
      "schedules",
      appliedFilters.keyword,
      appliedFilters.category,
      appliedFilters.region,
      appliedFilters.district,
      appliedFilters.genderLimit,
      appliedFilters.startDate,
      appliedFilters.endDate,
      appliedFilters.sort,
      authEmail || "guest",
    ],
    queryFn: () =>
      fetchSchedules({
        ...appliedFilters,
        email: authEmail,
      }),
    staleTime: 1000 * 60,
  });

  const updateDraftFilter = (key, value) => {
    setDraftFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRegionChange = (region) => {
    setDraftFilters((prev) => ({
      ...prev,
      region,
      district: "",
    }));
  };

  const handleStartDateChange = (startDate) => {
    setDraftFilters((prev) => ({
      ...prev,
      startDate,
      endDate: prev.endDate && prev.endDate < startDate ? "" : prev.endDate,
    }));
  };

  const handleEndDateChange = (endDate) => {
    setDraftFilters((prev) => ({
      ...prev,
      endDate,
      startDate: prev.startDate || (endDate ? today : prev.startDate),
    }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({
      ...draftFilters,
      keyword: normalizeText(draftFilters.keyword),
      region: normalizeText(draftFilters.region),
      district: normalizeText(draftFilters.district),
    });
  };

  const handleResetAll = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  const removeFilter = (key) => {
    const nextFilters = {
      ...appliedFilters,
      ...(key === "keyword" ? { keyword: "" } : {}),
      ...(key === "category" ? { category: "all" } : {}),
      ...(key === "region" || key === "district"
        ? { region: "", district: "" }
        : {}),
      ...(key === "genderLimit" ? { genderLimit: "all" } : {}),
      ...(key === "dateRange" ? { startDate: "", endDate: "" } : {}),
      ...(key === "sort" ? { sort: "latest" } : {}),
    };

    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const resultTitle = selectedFilterChips.length
    ? "필터 적용 결과"
    : "방금 올라온 일정";

  const openDatePicker = (inputRef) => {
    const input = inputRef?.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <main className={styles.main}>
      <section className={styles.banner}>
        <h2 className={styles.bannerTitle}>
          혼자 가기 애매할 때,
          <br />
          <span className={styles.highlight}>함께할 동행</span>을 찾아보세요
        </h2>
      </section>

      <section className={styles.filterPanel} aria-label="일정 탐색 필터">
        <form onSubmit={handleSearch}>
          <div className={styles.searchRow}>
            <label className={styles.searchInputWrapper}>
              <SearchRoundedIcon fontSize="small" className={styles.searchIcon} />
              <input
                type="search"
                value={draftFilters.keyword}
                placeholder="일정명 또는 내용으로 검색"
                className={styles.searchInput}
                onChange={(event) =>
                  updateDraftFilter("keyword", event.target.value)
                }
              />
            </label>
            <Button
              type="submit"
              variant="accent"
              size="md"
              className={styles.searchButton}
            >
              검색
            </Button>
          </div>

          <div className={styles.filterBar}>
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>카테고리</span>
              <FormControl className={styles.muiFormControl} size="small">
                <Select
                  value={draftFilters.category}
                  className={styles.muiSelect}
                  displayEmpty
                  MenuProps={FILTER_MENU_PROPS}
                  onChange={(event) =>
                    updateDraftFilter("category", event.target.value)
                  }
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>지역</span>
              <FormControl className={styles.muiFormControl} size="small">
                <Select
                  value={draftFilters.region}
                  className={styles.muiSelect}
                  displayEmpty
                  MenuProps={FILTER_MENU_PROPS}
                  onChange={(event) => handleRegionChange(event.target.value)}
                >
                  <MenuItem value="">전체</MenuItem>
                  {regions.map((region) => (
                    <MenuItem key={region.regionId} value={region.regionName}>
                      {region.regionName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>시/군/구</span>
              <FormControl className={styles.muiFormControl} size="small">
                <Select
                  value={draftFilters.district}
                  className={styles.muiSelect}
                  displayEmpty
                  disabled={!draftFilters.region}
                  MenuProps={FILTER_MENU_PROPS}
                  onChange={(event) =>
                    updateDraftFilter("district", event.target.value)
                  }
                >
                  <MenuItem value="">전체</MenuItem>
                  {detailRegions.map((detailRegion) => (
                    <MenuItem
                      key={detailRegion.detailId}
                      value={detailRegion.detailName}
                    >
                      {detailRegion.detailName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>성별</span>
              <FormControl className={styles.muiFormControl} size="small">
                <Select
                  value={draftFilters.genderLimit}
                  className={styles.muiSelect}
                  displayEmpty
                  MenuProps={FILTER_MENU_PROPS}
                  onChange={(event) =>
                    updateDraftFilter("genderLimit", event.target.value)
                  }
                >
                  {GENDER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </label>

            <label className={styles.filterField}>
              <span className={styles.filterLabel}>정렬</span>
              <FormControl className={styles.muiFormControl} size="small">
                <Select
                  value={draftFilters.sort}
                  className={styles.muiSelect}
                  displayEmpty
                  MenuProps={FILTER_MENU_PROPS}
                  onChange={(event) => updateDraftFilter("sort", event.target.value)}
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </label>

            <div className={clsx(styles.filterField, styles.dateRangeField)}>
              <span className={styles.filterLabel}>일정기간</span>
              <div className={styles.dateRangeInputs}>
                <button
                  type="button"
                  className={styles.dateValueSlot}
                  onClick={() => openDatePicker(startDateInputRef)}
                >
                  <span
                    className={clsx(styles.dateValueText, {
                      [styles.datePlaceholder]: !draftFilters.startDate,
                    })}
                  >
                    {formatVisibleDate(draftFilters.startDate, "시작일")}
                  </span>
                  <input
                    ref={startDateInputRef}
                    type="date"
                    value={draftFilters.startDate}
                    min={today}
                    className={clsx(styles.dateInput, styles.dateInputOverlay)}
                    onChange={(event) => handleStartDateChange(event.target.value)}
                  />
                </button>
                <span className={styles.dateDivider}>~</span>
                <button
                  type="button"
                  className={styles.dateValueSlot}
                  onClick={() => openDatePicker(endDateInputRef)}
                >
                  <span
                    className={clsx(styles.dateValueText, {
                      [styles.datePlaceholder]: !draftFilters.endDate,
                    })}
                  >
                    {formatVisibleDate(draftFilters.endDate, "종료일")}
                  </span>
                  <input
                    ref={endDateInputRef}
                    type="date"
                    value={draftFilters.endDate}
                    min={draftFilters.startDate || today}
                    className={clsx(styles.dateInput, styles.dateInputOverlay)}
                    onChange={(event) => handleEndDateChange(event.target.value)}
                  />
                </button>
              </div>
            </div>
          </div>
        </form>

        <div className={styles.selectedFilterRow}>
          <div className={styles.selectedChipList} aria-label="선택된 필터">
            {selectedFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                className={styles.selectedChip}
                onClick={() => removeFilter(chip.key)}
              >
                <span>{chip.label}</span>
                <CloseRoundedIcon fontSize="small" aria-hidden="true" />
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="md"
            className={styles.resetButton}
            onClick={handleResetAll}
          >
            전체 초기화
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{resultTitle}</h2>
        </div>

        {isLoading && (
          <div className={styles.stateBox}>
            <div className={styles.loadingSpinner} />
            <p>일정을 불러오는 중...</p>
          </div>
        )}

        {isError && (
          <div className={clsx(styles.stateBox, styles.errorBox)}>
            <p>일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          (Array.isArray(schedules) && schedules.length > 0 ? (
            <div className={styles.exploreCardGrid}>
              {schedules.map((schedule) => (
                <ScheduleCard
                  key={getScheduleKey(schedule)}
                  schedule={schedule}
                  variant="compact"
                  className="homeTicketCard exploreTicketCard"
                />
              ))}
            </div>
          ) : (
            <div className={styles.noData}>조건에 맞는 일정이 없습니다.</div>
          ))}
      </section>
    </main>
  );
}
