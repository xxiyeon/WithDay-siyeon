import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import Button from "../../../shared/ui/Button/Button";
import InterestIconRenderer from "../../../shared/ui/InterestIconRenderer/InterestIconRenderer";

import interestIconOptions from "./interestIconOptions";
import {
  getAdminInterests,
  createAdminInterest,
  updateAdminInterest,
  deleteAdminInterest,
} from "../api";

import styles from "./AdminInterestPage.module.css";

const DEFAULT_ICON_NAME = interestIconOptions?.[0]?.value ?? "FaHeart";

const AdminInterestPage = () => {
  const queryClient = useQueryClient();

  const [interestMode, setInterestMode] = useState("create");
  const [editingInterest, setEditingInterest] = useState(null);
  const [interestForm, setInterestForm] = useState({
    interestName: "",
    iconName: DEFAULT_ICON_NAME,
  });

  const {
    data: interests = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["admin-interests"],
    queryFn: getAdminInterests,
  });

  const sortedInterests = useMemo(() => {
    return [...interests].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
  }, [interests]);

  const createInterestMutation = useMutation({
    mutationFn: createAdminInterest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      await queryClient.invalidateQueries({ queryKey: ["interests"] });

      resetInterestForm();
      alert("관심사가 추가되었습니다.");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "관심사 추가 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  const updateInterestMutation = useMutation({
    mutationFn: updateAdminInterest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      await queryClient.invalidateQueries({ queryKey: ["interests"] });

      resetInterestForm();
      alert("관심사가 수정되었습니다.");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "관심사 수정 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  const deleteInterestMutation = useMutation({
    mutationFn: deleteAdminInterest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      await queryClient.invalidateQueries({ queryKey: ["interests"] });

      alert("관심사가 삭제되었습니다.");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "관심사 삭제 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  const isSubmitting =
    createInterestMutation.isPending || updateInterestMutation.isPending;

  const resetInterestForm = () => {
    setInterestMode("create");
    setEditingInterest(null);
    setInterestForm({
      interestName: "",
      iconName: DEFAULT_ICON_NAME,
    });
  };

  const handleChangeName = (event) => {
    setInterestForm((prev) => ({
      ...prev,
      interestName: event.target.value,
    }));
  };

  const handleSelectIcon = (iconName) => {
    setInterestForm((prev) => ({
      ...prev,
      iconName,
    }));
  };

  const handleEditInterest = (interest) => {
    setInterestMode("edit");
    setEditingInterest(interest);
    setInterestForm({
      interestName: interest?.interestName ?? interest?.name ?? "",
      iconName: interest?.iconName || DEFAULT_ICON_NAME,
    });
  };

  const handleSubmitInterest = (event) => {
    event.preventDefault();

    const trimmedName = interestForm.interestName.trim();

    if (!trimmedName) {
      alert("관심사 이름을 입력해주세요.");
      return;
    }

    if (!interestForm.iconName) {
      alert("아이콘을 선택해주세요.");
      return;
    }

    const payload = {
      interestName: trimmedName,
      iconName: interestForm.iconName,
    };

    if (interestMode === "edit") {
      const id = editingInterest?.id ?? editingInterest?.interestId;

      if (!id) {
        alert("수정할 관심사 정보가 없습니다.");
        return;
      }

      updateInterestMutation.mutate({
        id,
        ...payload,
      });

      return;
    }

    createInterestMutation.mutate(payload);
  };

  const handleDeleteInterest = (interest) => {
    const id = interest?.id ?? interest?.interestId;
    const name = interest?.interestName ?? interest?.name ?? "선택한 관심사";

    if (!id) {
      alert("삭제할 관심사 정보가 없습니다.");
      return;
    }

    const isConfirmed = window.confirm(
      `${name} 관심사를 삭제하시겠습니까?\n삭제 시 해당 관심사를 선택한 유저의 관심사 목록에서도 함께 제거될 수 있습니다.`,
    );

    if (!isConfirmed) return;

    deleteInterestMutation.mutate(id);
  };

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>ADMIN INTEREST</p>
          <h1>관심사 관리</h1>
          <p>
            사용자들이 자신에게 맞는 일정과 위트를 찾을 수 있도록 관심사 항목을
            관리합니다.
          </p>
        </div>

        <span className={styles.countBadge}>총 {sortedInterests.length}개</span>
      </div>

      <section className={styles.interestLayout}>
        <form className={styles.formCard} onSubmit={handleSubmitInterest}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{interestMode === "edit" ? "관심사 수정" : "관심사 추가"}</h2>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="interestName">관심사 이름</label>
            <input
              id="interestName"
              type="text"
              value={interestForm.interestName}
              placeholder="예: 산책"
              onChange={handleChangeName}
            />
          </div>

          <div className={styles.formGroup}>
            <label>아이콘 선택</label>

            <div className={styles.iconPreviewBox}>
              <div className={styles.iconPreviewChip}>
                <InterestIconRenderer
                  iconName={interestForm.iconName}
                  size={18}
                />
                <span>{interestForm.interestName || "미리보기"}</span>
              </div>

              <span className={styles.iconCode}>{interestForm.iconName}</span>
            </div>

            <div className={styles.iconGrid}>
              {interestIconOptions.map((option) => {
                const isSelected = interestForm.iconName === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${styles.iconOption} ${
                      isSelected ? styles.iconOptionSelected : ""
                    }`}
                    onClick={() => handleSelectIcon(option.value)}
                  >
                    <InterestIconRenderer iconName={option.value} size={18} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>

            <span className={styles.helperText}>
              사용자가 관심사를 쉽게 알아볼 수 있도록 이름과 어울리는 아이콘을
              선택해주세요.
            </span>
          </div>

          <div className={styles.formActions}>
            {interestMode === "edit" && (
              <Button
                type="button"
                variant="outline"
                onClick={resetInterestForm}
              >
                <CloseRoundedIcon fontSize="small" />
                취소
              </Button>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {interestMode === "edit" ? (
                <SaveOutlinedIcon fontSize="small" />
              ) : (
                <AddRoundedIcon fontSize="small" />
              )}

              {interestMode === "edit"
                ? isSubmitting
                  ? "수정 중"
                  : "수정"
                : isSubmitting
                  ? "추가 중"
                  : "추가"}
            </Button>
          </div>
        </form>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>관심사 목록</h2>
              <p>
                등록된 관심사는 회원가입과 마이페이지의 관심사 선택 영역에
                표시됩니다
              </p>
            </div>
          </div>

          {isLoading && (
            <div className={styles.stateBox}>
              관심사 목록을 불러오는 중입니다.
            </div>
          )}

          {isError && (
            <div className={styles.stateBox}>
              관심사 목록을 불러오지 못했습니다.
            </div>
          )}

          {!isLoading && !isError && (
            <div className={styles.interestList}>
              {sortedInterests.length > 0 ? (
                sortedInterests.map((interest) => {
                  const id = interest.id ?? interest.interestId;
                  const name = interest.interestName ?? interest.name;
                  const iconName = interest.iconName || "FaHeart";

                  return (
                    <article key={id} className={styles.interestItem}>
                      <div className={styles.interestInfo}>
                        <div className={styles.interestIconBox}>
                          <InterestIconRenderer iconName={iconName} size={20} />
                        </div>

                        <div className={styles.interestText}>
                          <strong>{name}</strong>
                          <span>{iconName}</span>
                        </div>
                      </div>

                      <div className={styles.itemActions}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditInterest(interest)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                          수정
                        </Button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          disabled={deleteInterestMutation.isPending}
                          onClick={() => handleDeleteInterest(interest)}
                          aria-label={`${name} 관심사 삭제`}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className={styles.stateBox}>등록된 관심사가 없습니다.</div>
              )}
            </div>
          )}
        </section>
      </section>
    </section>
  );
};

export default AdminInterestPage;
