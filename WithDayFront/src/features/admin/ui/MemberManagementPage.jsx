import styles from "./MemberManagementPage.module.css";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData, selectAllMember } from "../api";
import { useEffect, useState } from "react";
import MemberList from "./MemberList";
import { Input } from "../../../shared/ui/Form/Form";
import Button from "../../../shared/ui/Button/Button";
import CommonSelect from "../../../shared/ui/Select/CommonSelect";
import { Controller, useForm } from "react-hook-form";

const MemberManagementPage = () => {
  const [searchParams, setSearchParams] = useState({
    keyword: "",
    gender: "",
    provider: "",
    status: "",
  });

  const [page, setPage] = useState(0);
  const size = 10;

  const { data } = useQuery({
    queryKey: ["memberList", searchParams, page],
    queryFn: () => selectAllMember({ ...searchParams, page, size }),
  });

  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
  });

  const memberList = data?.memberList ?? [];
  const totalPage = data?.totalPage ?? 0;

  // register - 일반 input을 form에 등록.
  /* 
  control - 외부 컴포넌트 (mui select ...)는 register로 제어 X
  rhf(react-hook-form)가 따로 관리할 수 있도록 control을 전달.
  */
  // handleSubmit - 폼 제출 처리 함수
  // watch - rhf이 관리하는 상태 전체를 초기화, 특정 값으로 변경할 때 사용
  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      keyword: "",
      gender: "",
      provider: "",
      status: "",
    },
  });

  const genderOptions = [
    { label: "남성", value: "1" },
    { label: "여성", value: "2" },
  ];

  const providerOptions = [
    { label: "Google", value: "google" },
    { label: "Local", value: "local" },
  ];

  const statusOptions = [
    { label: "active", value: "active" },
    { label: "suspended", value: "suspended" },
    { label: "admin", value: "admin" },
  ];

  const handleReset = () => {
    const initialValue = {
      keyword: "",
      gender: "",
      provider: "",
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
          placeholder="닉네임 또는 이메일 검색"
          {...register("keyword")}
        />

        {/* 외부 컴포넌트를 rhf에 연결하는 브릿지 */}
        <Controller
          name="gender" // 폼 데이터 이름
          control={control} // rhf 내부 상태 관리자 연결
          render={(
            // 실제 렌더링할 컴포넌트, field - rhf가 제공하는 값
            // field = { value, onChange, onBlur, name, ref }
            { field },
          ) => (
            <CommonSelect
              label="성별"
              value={field.value} // rhf 상태값 연결
              onChange={field.onChange} // 값 변경 시 rhf에 전달
              options={genderOptions}
              size="small"
            />
          )}
        />

        <Controller
          name="provider"
          control={control}
          render={({ field }) => (
            <CommonSelect
              label="가입 경로"
              value={field.value}
              onChange={field.onChange}
              options={providerOptions}
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

      <MemberList
        memberList={memberList}
        page={page}
        setPage={setPage}
        totalPage={totalPage}
        totalMembers={dashboardData?.nowTotalUserCount || 0}
      />
    </main>
  );
};

export default MemberManagementPage;
