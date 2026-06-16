import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import Button from "../../../shared/ui/Button/Button";

import {
  createAdminInterest,
  deleteAdminInterest,
  getAdminInterests,
  getAdminTerms,
  updateAdminInterest,
  updateAdminTerms,
} from "../api";

import styles from "./AdminSignupSettingPage.module.css";

const TAB = {
  TERMS: "terms",
  INTERESTS: "interests",
};

const getRequiredLabel = (term) => {
  const isRequired = term?.isRequired ?? term?.required;

  return isRequired ? "필수" : "선택";
};

const getTermTypeLabel = (type) => {
  const labels = {
    TOS: "서비스 이용약관",
    PRIVACY: "개인정보 처리방침",
    MARKETING: "마케팅 수신 동의",
    NOTIFICATION: "알림 수신 동의",
  };

  return labels[type] ?? type ?? "-";
};

const AdminSignupSettingPage = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(TAB.TERMS);

  const [editingTerm, setEditingTerm] = useState(null);
  const [termForm, setTermForm] = useState({
    version: "",
    content: "",
  });

  const [interestMode, setInterestMode] = useState("create");
  const [editingInterest, setEditingInterest] = useState(null);
  const [interestForm, setInterestForm] = useState({
    interestName: "",
    iconName: "",
  });

  // 관리자 약관 목록 조회
  const {
    data: terms = [],
    isLoading: isTermsLoading,
    isError: isTermsError,
  } = useQuery({
    queryKey: ["admin-terms"],
    queryFn: getAdminTerms,
  });

  // 관리자 관심사 목록 조회
  const {
    data: interests = [],
    isLoading: isInterestsLoading,
    isError: isInterestsError,
  } = useQuery({
    queryKey: ["admin-interests"],
    queryFn: getAdminInterests,
  });

  // 약관 수정 mutation
  const updateTermMutation = useMutation({
    mutationFn: updateAdminTerms,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-terms"] });
      await queryClient.invalidateQueries({ queryKey: ["terms"] });

      closeTermModal();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "약관 수정 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  // 관심사 추가 mutation
  const createInterestMutation = useMutation({
    mutationFn: createAdminInterest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      await queryClient.invalidateQueries({ queryKey: ["interests"] });

      resetInterestForm();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "관심사 추가 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  // 관심사 수정 mutation
  const updateInterestMutation = useMutation({
    mutationFn: updateAdminInterest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      await queryClient.invalidateQueries({ queryKey: ["interests"] });

      resetInterestForm();
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "관심사 수정 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  // 관심사 삭제 mutation
  const deleteInterestMutation = useMutation({
    mutationFn: deleteAdminInterest,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-interests"] });
      await queryClient.invalidateQueries({ queryKey: ["interests"] });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ??
        error?.response?.data ??
        "관심사 삭제 중 오류가 발생했습니다.";

      alert(message);
    },
  });

  const sortedTerms = useMemo(() => {
    return [...terms].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
  }, [terms]);

  const sortedInterests = useMemo(() => {
    return [...interests].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
  }, [interests]);

  const openTermModal = (term) => {
    setEditingTerm(term);
    setTermForm({
      version: term?.version ?? "",
      content: term?.content ?? "",
    });
  };

  const closeTermModal = () => {
    setEditingTerm(null);
    setTermForm({
      version: "",
      content: "",
    });
  };

  const handleSubmitTerm = (event) => {
    event.preventDefault();

    if (!editingTerm?.id) {
      alert("수정할 약관 정보가 없습니다.");
      return;
    }

    if (!termForm.version.trim()) {
      alert("약관 버전을 입력해주세요.");
      return;
    }

    if (!termForm.content.trim()) {
      alert("약관 내용을 입력해주세요.");
      return;
    }

    updateTermMutation.mutate({
      id: editingTerm.id,
      version: termForm.version.trim(),
      content: termForm.content.trim(),
    });
  };

  const resetInterestForm = () => {
    setInterestMode("create");
    setEditingInterest(null);
    setInterestForm({
      interestName: "",
      iconName: "",
    });
  };

  const handleEditInterest = (interest) => {
    setInterestMode("edit");
    setEditingInterest(interest);
    setInterestForm({
      interestName: interest?.interestName ?? "",
      iconName: interest?.iconName ?? "",
    });
  };

  const handleSubmitInterest = (event) => {
    event.preventDefault();

    if (!interestForm.interestName.trim()) {
      alert("관심사 이름을 입력해주세요.");
      return;
    }

    const payload = {
      interestName: interestForm.interestName.trim(),
      iconName: interestForm.iconName.trim() || null,
    };

    if (interestMode === "edit") {
      if (!editingInterest?.id) {
        alert("수정할 관심사 정보가 없습니다.");
        return;
      }

      updateInterestMutation.mutate({
        id: editingInterest.id,
        ...payload,
      });

      return;
    }

    createInterestMutation.mutate(payload);
  };

  const handleDeleteInterest = (interest) => {
    const isConfirmed = window.confirm(
      "이 관심사를 삭제하면 해당 관심사를 선택한 유저의 관심사 목록에서도 함께 제거됩니다.\n삭제하시겠습니까?",
    );

    if (!isConfirmed) {
      return;
    }

    deleteInterestMutation.mutate(interest.id);
  };

  const isInterestSubmitting =
    createInterestMutation.isPending || updateInterestMutation.isPending;

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>ADMIN SETTING</p>
          <h1>회원가입 설정 관리</h1>
          <p>
            회원가입 화면에 노출되는 이용약관과 관심사 항목을 관리합니다.
          </p>
        </div>
      </div>

      <div className={styles.tabPanel}>
        <button
          type="button"
          className={`${styles.tabButton} ${
            activeTab === TAB.TERMS ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab(TAB.TERMS)}
        >
          이용약관 관리
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${
            activeTab === TAB.INTERESTS ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab(TAB.INTERESTS)}
        >
          관심사 관리
        </button>
      </div>

      {activeTab === TAB.TERMS && (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2>이용약관 관리</h2>
              <p>
                약관은 회원 동의 이력과 연결되어 있으므로 내용과 버전만
                수정합니다.
              </p>
            </div>
          </div>

          {isTermsLoading && (
            <div className={styles.stateBox}>약관 목록을 불러오는 중입니다.</div>
          )}

          {isTermsError && (
            <div className={styles.stateBox}>약관 목록을 불러오지 못했습니다.</div>
          )}

          {!isTermsLoading && !isTermsError && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>약관 종류</th>
                    <th>버전</th>
                    <th>구분</th>
                    <th>내용</th>
                    <th>관리</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedTerms.map((term) => (
                    <tr key={term.id ?? term.type}>
                      <td>{term.id}</td>
                      <td>
                        <div className={styles.mainText}>
                          {getTermTypeLabel(term.type)}
                        </div>
                        <span className={styles.subText}>{term.type}</span>
                      </td>
                      <td>{term.version}</td>
                      <td>
                        <span
                          className={`${styles.badge} ${
                            (term.isRequired ?? term.required)
                              ? styles.required
                              : styles.optional
                          }`}
                        >
                          {getRequiredLabel(term)}
                        </span>
                      </td>
                      <td>
                        <p className={styles.previewText}>{term.content}</p>
                      </td>
                      <td>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openTermModal(term)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                          수정
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {activeTab === TAB.INTERESTS && (
        <section className={styles.interestLayout}>
          <form className={styles.formCard} onSubmit={handleSubmitInterest}>
            <div className={styles.cardHeader}>
              <div>
                <h2>
                  {interestMode === "edit" ? "관심사 수정" : "관심사 추가"}
                </h2>
                <p>
                  회원가입과 마이페이지에서 선택할 수 있는 관심사를 관리합니다.
                </p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="interestName">관심사 이름</label>
              <input
                id="interestName"
                type="text"
                value={interestForm.interestName}
                placeholder="예: 여행"
                onChange={(event) =>
                  setInterestForm((prev) => ({
                    ...prev,
                    interestName: event.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="iconName">아이콘 이름</label>
              <input
                id="iconName"
                type="text"
                value={interestForm.iconName}
                placeholder="예: FlightTakeoff"
                onChange={(event) =>
                  setInterestForm((prev) => ({
                    ...prev,
                    iconName: event.target.value,
                  }))
                }
              />
              <span className={styles.helperText}>
                프론트에서 아이콘 매칭에 사용할 이름입니다. 비워둘 수도
                있습니다.
              </span>
            </div>

            <div className={styles.formActions}>
              <Button type="submit" disabled={isInterestSubmitting}>
                <SaveOutlinedIcon fontSize="small" />
                {interestMode === "edit"
                  ? isInterestSubmitting
                    ? "수정 중"
                    : "수정"
                  : isInterestSubmitting
                    ? "추가 중"
                    : "추가"}
              </Button>

              {interestMode === "edit" && (
                <Button type="button" variant="outline" onClick={resetInterestForm}>
                  취소
                </Button>
              )}
            </div>
          </form>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2>관심사 목록</h2>
                <p>
                  삭제 시 해당 관심사를 선택한 유저의 관심사 목록에서도 함께
                  제거됩니다.
                </p>
              </div>

              <span className={styles.countBadge}>
                총 {sortedInterests.length}개
              </span>
            </div>

            {isInterestsLoading && (
              <div className={styles.stateBox}>
                관심사 목록을 불러오는 중입니다.
              </div>
            )}

            {isInterestsError && (
              <div className={styles.stateBox}>
                관심사 목록을 불러오지 못했습니다.
              </div>
            )}

            {!isInterestsLoading && !isInterestsError && (
              <div className={styles.interestList}>
                {sortedInterests.map((interest) => (
                  <article key={interest.id} className={styles.interestItem}>
                    <div>
                      <strong>{interest.interestName}</strong>
                      <span>{interest.iconName || "아이콘 없음"}</span>
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
                      >
                        <DeleteOutlineRoundedIcon fontSize="small" />
                      </button>
                    </div>
                  </article>
                ))}

                {sortedInterests.length === 0 && (
                  <div className={styles.stateBox}>
                    등록된 관심사가 없습니다.
                  </div>
                )}
              </div>
            )}
          </section>
        </section>
      )}

      {editingTerm && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleSubmitTerm}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{getTermTypeLabel(editingTerm.type)} 수정</h2>
                <p>{editingTerm.type}</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeTermModal}
              >
                <CloseRoundedIcon />
              </button>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="termVersion">약관 버전</label>
              <input
                id="termVersion"
                type="text"
                value={termForm.version}
                onChange={(event) =>
                  setTermForm((prev) => ({
                    ...prev,
                    version: event.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="termContent">약관 내용</label>
              <textarea
                id="termContent"
                value={termForm.content}
                onChange={(event) =>
                  setTermForm((prev) => ({
                    ...prev,
                    content: event.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.modalActions}>
              <Button
                type="submit"
                disabled={updateTermMutation.isPending}
              >
                <SaveOutlinedIcon fontSize="small" />
                {updateTermMutation.isPending ? "저장 중" : "저장"}
              </Button>

              <Button type="button" variant="outline" onClick={closeTermModal}>
                취소
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
};

export default AdminSignupSettingPage;