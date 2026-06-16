import styles from "./MemberManagementPage.module.css";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData, selectAllSchedule } from "../api";
import { useEffect, useState } from "react";
import { Input } from "../../../shared/ui/Form/Form";
import Button from "../../../shared/ui/Button/Button";
import CommonSelect from "../../../shared/ui/Select/CommonSelect";
import { Controller, useForm } from "react-hook-form";
import { getDetailRegion, getRegion } from "../../region/api";
import ScheduleList from "./ScheduleList";

const ScheduleManagementPage = () => {
  // register - 일반 input을 form에 등록.
  /* 
  control - 외부 컴포넌트 (mui select, ...)는 register로 제어 X
  rhf(react-hook-form)가 따로 관리할 수 있도록 control을 전달.
  */
  // handleSubmit - 폼 제출 처리 함수
  // watch - rhf이 관리하는 상태 전체를 초기화, 특정 값으로 변경할 때 사용
  const { register, control, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      keyword: "",
      region: "",
      detailRegion: "",
      status: "",
    },
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const region = watch("region");

  const [searchParams, setSearchParams] = useState({
    keyword: "",
    region: "",
    detailRegion: "",
    status: "",
  });

  // 시/도 조회
  const { data: regions = [] } = useQuery({
    queryKey: ["region"],
    queryFn: getRegion,
  });

  // 군/구 조회(RHF)
  const { data: detailRegions = [] } = useQuery({
    queryKey: ["detailRegion", region],
    queryFn: () => getDetailRegion(region),
    enabled: !!region,
  });

  useEffect(() => {
    setValue("detailRegion", "");
  }, [region, setValue]);

  const [page, setPage] = useState(0);
  const size = 10;

  const { data } = useQuery({
    queryKey: ["scheduleList", searchParams, page],
    queryFn: () => selectAllSchedule({ ...searchParams, page, size }),
  });

  const scheduleList = data?.scheduleList ?? [];
  const totalPage = data?.totalPage ?? 0;

  const statusOptions = [
    { label: "모집중", value: "recruiting" },
    { label: "모집마감", value: "closed" },
    { label: "일정취소", value: "canceled" },
    { label: "일정완료", value: "completed" },
  ];

  const handleReset = () => {
    const initialValue = {
      keyword: "",
      region: "",
      detailRegion: "",
      status: "",
    };

    reset(initialValue);
    setSearchParams(initialValue);
    setPage(0); // 초기화 시 첫 페이지로
  };

  const onSubmit = (formData) => {
    setPage(0); // 검색 완료 시 첫 페이지로
    setSearchParams(formData);
  };

  return (
    <main className={styles.main}>
      <form className={styles.searchForm} onSubmit={handleSubmit(onSubmit)}>
        <Input
          type="text"
          placeholder="호스트 닉네임 또는 일정 제목 검색"
          {...register("keyword")}
        />

        {/* 외부 컴포넌트를 rhf에 연결하는 브릿지 */}
        <Controller
          name="region" // 폼 데이터 이름
          control={control} // rhf 내부 상태 관리자 연결
          render={(
            // 실제 렌더링할 컴포넌트, field - rhf가 제공하는 값
            // field = { value, onChange, onBlur, name, ref }
            { field },
          ) => (
            <CommonSelect
              label="지역"
              value={field.value} // rhf 상태값 연결
              onChange={field.onChange} // 값 변경 시 rhf에 전달
              options={regions.map((region) => ({
                label: region.regionName,
                value: region.regionName,
              }))}
              size="small"
            />
          )}
        />

        <Controller
          name="detailRegion"
          control={control}
          render={({ field }) => (
            <CommonSelect
              label="상세 지역"
              value={field.value}
              onChange={field.onChange}
              options={detailRegions.map((item) => ({
                label: item.detailName,
                value: item.detailName,
              }))}
              disabled={!region}
              size="small"
            />
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <CommonSelect
              label="상태"
              value={field.value}
              onChange={field.onChange}
              options={statusOptions}
              size="small"
            />
          )}
        />

        <Button type="button" variant="outline" size="md" onClick={handleReset}>
          초기화
        </Button>
        <Button type="submit" variant="primary" size="md">
          검색
        </Button>
      </form>

      <ScheduleList
        scheduleList={scheduleList}
        page={page}
        setPage={setPage}
        totalPage={totalPage}
        totalSchedules={dashboardData?.nowTotalScheduleCount || 0}
      />
    </main>
  );
};

export default ScheduleManagementPage;
