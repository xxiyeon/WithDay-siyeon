import styles from "./MyPageEdit.module.css";
import Cropper from "react-easy-crop";
import DaumPostcode from "react-daum-postcode";
import { uploadMypageProfileImage } from "../../features/user/mypage/api";
import { getCroppedImg } from "../../features/user/mypage/getCroppedImg";
import { useAuthStore } from "../../features/auth/store/authStore";
import { clearAuthSession } from "../../features/auth/lib/clearAuthSession";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { useMypageEdit } from "../../features/user/mypage/useMypageEdit";
import { useQueryClient } from "@tanstack/react-query";
import EditCalendarOutlinedIcon from "@mui/icons-material/EditCalendarOutlined";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Snackbar from "@mui/material/Snackbar";
import InterestIcon from "../../shared/ui/InterestIconRenderer/InterestIconRenderer";

import {
  EyeClosedIcon,
  EyeIcon,
  LockIcon,
  BellIcon,
  BellOffIcon,
  UserRoundIcon,
  MessageCircleIcon,
  TagsIcon,
  PhoneIcon,
  MapPinIcon,
} from "lucide-react";
const MyPageEdit = () => {
  // authStore에서 로그인 유저 정보 가져오기
  const user = useAuthStore((state) => state.user);
  const email = user?.email;
  const { email: routeEmail } = useParams();
  // 수정 라우트도 /mypage/edit/:email 형태라 path param 을 decode 후 비교해야 본인 판별이 정확하다.
  const normalizedRouteEmail = routeEmail ? decodeURIComponent(routeEmail) : "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { editQuery, updateMutation, withdrawMutation } = useMypageEdit();
  const [nickname, setNickname] = useState("단이");
  const [showPw, setShowPw] = useState([false, false, false]);
  const [isNotiOn, setIsNotiOn] = useState(true);

  //사진 편집
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [shineInterestId, setShineInterestId] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false);
  const profileFileInputRef = useRef(null);
  const profileMenuRef = useRef(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [withdrawErrorToastOpen, setWithdrawErrorToastOpen] = useState(false);

  const DEFAULT_PROFILE_IMAGE = "/logo.png";
  const formatPhoneNumber = (value = "") => {
    const onlyNumber = String(value).replace(/\D/g, "").slice(0, 11);

    if (onlyNumber.length <= 3) {
      return onlyNumber;
    }

    if (onlyNumber.length <= 7) {
      return `${onlyNumber.slice(0, 3)}-${onlyNumber.slice(3)}`;
    }

    return `${onlyNumber.slice(0, 3)}-${onlyNumber.slice(
      3,
      7,
    )}-${onlyNumber.slice(7)}`;
  };

  const removePhoneHyphen = (value = "") => {
    return String(value).replace(/\D/g, "");
  };
  const [intro, setIntro] = useState(
    "안녕하세요 단이입니다. 평소 여행을 다니면서 여행기록을 남기는 걸 좋아해요.",
  );

  const maxLength = 8;
  const maxIntroLength = 100;

  const passwordFields = [
    {
      label: "기존 비밀번호",
      placeholder: "현재 비밀번호를 입력하세요",
      key: "current",
    },
    {
      label: "새 비밀번호",
      placeholder: "새 비밀번호를 입력하세요",
      key: "newPw",
    },
    {
      label: "새 비밀번호 확인",
      placeholder: "새 비밀번호를 다시 입력하세요",
      key: "confirm",
    },
  ];

  const togglePassword = (idx) => {
    const newShowPw = [...showPw];
    newShowPw[idx] = !newShowPw[idx];
    setShowPw(newShowPw);
  };

  const [pwState, setPwState] = useState({
    current: "",
    newPw: "",
    confirm: "",
  });

  const handleNicknameChange = (e) => {
    if (e.target.value.length <= maxLength) setNickname(e.target.value);
  };

  const handleIntroChange = (e) => {
    if (e.target.value.length <= maxIntroLength) setIntro(e.target.value);
  };

  const isMatch = pwState.newPw === pwState.confirm && pwState.confirm !== "";
  const isError = pwState.confirm !== "" && !isMatch;
  const handlePwChange = (e, field) =>
    setPwState({ ...pwState, [field]: e.target.value });

  {
    /*초기 값*/
  }
  const { handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      nickname: "",
      phone: "",
      intro: "",
      profileImage: "",
      interestIds: [],
      notificationAgreed: false,
      //주소
      postcode: "",
      address: "",
      detailAddress: "",
      //패스워드
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    },
  });
  const initializedRef = useRef(false);

  const normalizeInterestIds = (value) => {
    if (!Array.isArray(value)) return [];

    return value
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          return item.interestId ?? item.id;
        }

        return item;
      })
      .map(Number)
      .filter((id) => Number.isFinite(id));
  };

  {
    /*백엔드에서 가져온 데이터로 초기값 세팅*/
  }
  useEffect(() => {
    if (!editQuery.data || initializedRef.current) return;

    const data = editQuery.data;

    const initialInterestIds = normalizeInterestIds(
      data.selectedInterestIds ?? [],
    );

    reset({
      nickname: data.nickname ?? "",
      phone: formatPhoneNumber(data.phone ?? ""),
      intro: data.intro ?? "",
      profileImage: data.profileImage ?? "",
      interestIds: initialInterestIds,
      notificationAgreed: data.notificationAgreed ?? false,

      //주소
      postcode: data.postcode ?? "",
      address: data.address ?? "",
      detailAddress: data.detailAddress ?? "",

      //비밀번호
      currentPassword: "",
      newPassword: "",
      newPasswordConfirm: "",
    });

    setNickname(data.nickname ?? "");
    setIntro(data.intro ?? "");
    setIsNotiOn(Boolean(data.notificationAgreed));
    setProfilePreview(data.profileImage ?? "");

    initializedRef.current = true;
  }, [editQuery.data, reset]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (e) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  const selectedInterestIds = watch("interestIds") ?? [];

  const isLocalUser = editQuery.data?.provider === "local";
  const handleToggleInterest = (interestId) => {
    const id = Number(interestId);
    const current = selectedInterestIds.map(Number);

    const isAlreadySelected = current.includes(id);

    if (isAlreadySelected) {
      setValue(
        "interestIds",
        current.filter((item) => item !== id),
        { shouldValidate: true },
      );
      return;
    }

    setValue("interestIds", [...current, id], {
      shouldValidate: true,
    });

    setShineInterestId(id);

    setTimeout(() => {
      setShineInterestId(null);
    }, 550);
  };

  const validateForm = (formData) => {
    if (!formData.nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return false;
    }

    if (!formData.phone.trim()) {
      alert("연락처를 입력해주세요.");
      return false;
    }

    if (!formData.interestIds || formData.interestIds.length === 0) {
      alert("관심사를 1개 이상 선택해주세요.");
      return false;
    }

    if (isLocalUser) {
      const hasCurrentPassword = !!formData.currentPassword;
      const hasNewPassword = !!formData.newPassword;
      const hasNewPasswordConfirm = !!formData.newPasswordConfirm;

      const wantsToChangePassword =
        hasCurrentPassword || hasNewPassword || hasNewPasswordConfirm;

      if (wantsToChangePassword) {
        if (!hasCurrentPassword || !hasNewPassword || !hasNewPasswordConfirm) {
          alert("비밀번호 변경 정보를 모두 입력해주세요.");
          return false;
        }

        if (formData.newPassword.length < 8) {
          alert("새 비밀번호는 8자 이상 입력해주세요.");
          return false;
        }

        if (formData.newPassword !== formData.newPasswordConfirm) {
          alert("새 비밀번호가 일치하지 않습니다.");
          return false;
        }
      }
    }
    return true;
  };

  // 이미지 편집
  const handleProfileFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);

    setSelectedImage(imageUrl);
    setCropModalOpen(true);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setProfileMenuOpen(false);

    e.target.value = "";
  };

  const handleCropComplete = (_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  };

  //프로필 이미지 변경
  const handleSaveCroppedImage = async () => {
    if (isImageUploading) return;

    try {
      if (!selectedImage || !croppedAreaPixels) return;

      setIsImageUploading(true);

      const croppedFile = await getCroppedImg(selectedImage, croppedAreaPixels);
      const result = await uploadMypageProfileImage(croppedFile);

      const imageUrl = result.profileImage;

      setProfilePreview(imageUrl);
      setValue("profileImage", imageUrl, {
        shouldValidate: true,
        shouldDirty: true,
      });

      queryClient.setQueryData(["mypage", email], (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          profileImage: imageUrl,
        };
      });

      queryClient.invalidateQueries({
        queryKey: ["mypage", email],
      });

      setCropModalOpen(false);
      setSelectedImage(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });

      alert("프로필 이미지가 변경되었습니다.");
    } catch (error) {
      alert("프로필 이미지 변경 중 오류가 발생했습니다.");
    } finally {
      setIsImageUploading(false);
    }
  };
  const handleSetDefaultProfileImage = () => {
    setProfilePreview(DEFAULT_PROFILE_IMAGE);
    setValue("profileImage", DEFAULT_PROFILE_IMAGE, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setSelectedImage(null);
    setCropModalOpen(false);
    setProfileMenuOpen(false);
  };
  const onSubmit = () => {
    const formData = {
      nickname,
      phone: watch("phone"),
      intro,
      profileImage: watch("profileImage"),
      interestIds: selectedInterestIds,
      notificationAgreed: isNotiOn,

      postcode: watch("postcode"),
      address: watch("address"),
      detailAddress: watch("detailAddress"),

      currentPassword: pwState.current,
      newPassword: pwState.newPw,
      newPasswordConfirm: pwState.confirm,
    };

    if (!validateForm(formData)) return;

    const payload = {
      nickname: formData.nickname,
      phone: removePhoneHyphen(formData.phone),
      intro: formData.intro,
      profileImage: formData.profileImage,
      interestIds: formData.interestIds,
      notificationAgreed: formData.notificationAgreed,
      postcode: formData.postcode,
      address: formData.address,
      detailAddress: formData.detailAddress,
      currentPassword: isLocalUser ? formData.currentPassword : "",
      newPassword: isLocalUser ? formData.newPassword : "",
      newPasswordConfirm: isLocalUser ? formData.newPasswordConfirm : "",
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        alert("프로필이 수정되었습니다.");
        // 수정 직후에는 placeholder 경로가 아니라 실제 사용자 프로필 URL로 돌아가야 방금 바뀐 결과를 바로 확인할 수 있다.
        navigate(`/mypage/${encodeURIComponent(email)}`);
      },
      onError: (error) => {
        const message =
          error?.response?.data || "프로필 수정 중 오류가 발생했습니다.";
        alert(message);
      },
    });
  };

  const handleWithdraw = () => {
    if (withdrawMutation.isPending) {
      return;
    }

    withdrawMutation.mutate(undefined, {
      onSuccess: async () => {
        // 탈퇴 직후 예전 사용자 캐시가 잠깐 남으면 홈 이동 과정에서 stale 정보가 섞일 수 있어 먼저 정리한다.
        queryClient.removeQueries({ queryKey: ["mypage"] });
        queryClient.removeQueries({ queryKey: ["mypageEdit"] });
        queryClient.removeQueries({ queryKey: ["wishlist"] });
        queryClient.removeQueries({ queryKey: ["mySchedules"] });
        queryClient.removeQueries({ queryKey: ["notifications"] });

        await clearAuthSession();
        setIsWithdrawDialogOpen(false);
        navigate("/", { replace: true });
      },
      onError: () => {
        setIsWithdrawDialogOpen(false);
        setWithdrawErrorToastOpen(true);
      },
    });
  };

  if (!email) {
    return <div className={styles.container}>로그인이 필요합니다.</div>;
  }

  // URL 조작으로 타인 이메일을 넣고 수정 화면에 진입하는 시도를 프런트에서 먼저 차단한다.
  if (normalizedRouteEmail && normalizedRouteEmail !== email) {
    return (
      <div className={styles.container}>본인 프로필만 수정할 수 있습니다.</div>
    );
  }

  if (editQuery.isLoading) {
    return <div className={styles.container}>불러오는 중...</div>;
  }

  if (editQuery.isError) {
    return (
      <div className={styles.container}>
        마이페이지 수정 정보를 불러오지 못했습니다.
      </div>
    );
  }

  const handleCompletePostcode = (data) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") {
        extraAddress += data.bname;
      }

      if (data.buildingName !== "") {
        extraAddress +=
          extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }

      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    setValue("postcode", data.zonecode, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue("address", fullAddress, {
      shouldValidate: true,
      shouldDirty: true,
    });

    setValue("detailAddress", "", {
      shouldValidate: true,
      shouldDirty: true,
    });

    setIsPostcodeOpen(false);
  };
  return (
    <div className={styles.container}>
      <h1 className={styles.headerTitle}>회원 정보 수정</h1>

      <div className={styles.content}>
        <div className={styles.profile}>
          <div
            className={`${styles.avatarEditBox} ${
              cropModalOpen ? styles.avatarEditBoxCropping : ""
            }`}
          >
            {cropModalOpen && selectedImage ? (
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            ) : (
              <>
                <img
                  src={
                    profilePreview ||
                    editQuery.data?.profileImage ||
                    "/logo.png"
                  }
                  alt="프로필"
                  className={styles.avatar}
                />

                <div
                  ref={profileMenuRef}
                  className={styles.profileActionWrapper}
                >
                  <button
                    type="button"
                    className={styles.retouch_btn}
                    onClick={() => setProfileMenuOpen((prev) => !prev)}
                  >
                    <EditCalendarOutlinedIcon />
                  </button>

                  {profileMenuOpen && (
                    <div className={styles.profileImageMenu}>
                      <button
                        type="button"
                        className={styles.profileImageMenuItem}
                        onClick={() => {
                          setProfileMenuOpen(false);
                          profileFileInputRef.current?.click();
                        }}
                      >
                        사진 변경
                      </button>

                      <button
                        type="button"
                        className={styles.profileImageMenuItem}
                        onClick={handleSetDefaultProfileImage}
                      >
                        기본 이미지로 변경
                      </button>

                      <button
                        type="button"
                        className={styles.profileImageMenuItem}
                        onClick={() => setProfileMenuOpen(false)}
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>

                <input
                  ref={profileFileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleProfileFileChange}
                />
              </>
            )}
          </div>

          {cropModalOpen && selectedImage && (
            <div className={styles.inlineCropControls}>
              <div className={styles.zoomBox}>
                <span>확대</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
              </div>

              <div className={styles.cropButtons}>
                <button
                  type="button"
                  className={styles.cropCancelButton}
                  onClick={() => {
                    setCropModalOpen(false);
                    setSelectedImage(null);
                    setZoom(1);
                    setCrop({ x: 0, y: 0 });
                  }}
                >
                  취소
                </button>

                <button
                  type="button"
                  className={styles.cropSaveButton}
                  onClick={handleSaveCroppedImage}
                  disabled={isImageUploading}
                >
                  {isImageUploading ? "업로드 중..." : "적용하기"}
                </button>
              </div>
            </div>
          )}

          <div className={styles.name}>
            {nickname || editQuery.data?.nickname}
          </div>
          <div className={styles.email}>{editQuery.data?.email}</div>
          <div className={styles.email}>
            {formatPhoneNumber(editQuery.data?.phone)}
          </div>
          <button
            className={styles.userout}
            type="button"
            onClick={() => setIsWithdrawDialogOpen(true)}
          >
            회원 탈퇴
          </button>
        </div>

        <div className={styles.formSide}>
          {/* 1. 닉네임 */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              <UserRoundIcon size={20} />
              닉네임
            </div>
            <div className={styles.inputRow}>
              <span className={styles.fieldLabel}>닉네임</span>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={nickname}
                  onChange={handleNicknameChange}
                  maxLength={maxLength}
                  className={styles.input_name}
                />
                <span className={styles.charCount}>
                  {nickname.length} / {maxLength}
                </span>
              </div>
            </div>
          </div>

          {/* 2. 소개글 */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              <MessageCircleIcon size={16} />
              <span>소개글</span>
            </div>
            <div className={styles.inputRow}>
              <span
                className={styles.fieldLabel}
                style={{ alignSelf: "flex-start", marginTop: "14px" }}
              >
                소개글
              </span>
              <div className={styles.textareaContainer}>
                <textarea
                  value={intro}
                  onChange={handleIntroChange}
                  className={styles.textarea}
                  maxLength={maxIntroLength}
                />
                <span className={styles.charCountInside}>
                  {intro.length} / {maxIntroLength}
                </span>
              </div>
            </div>
          </div>

          {/* 3. 관심사 */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              <TagsIcon size={18} />
              <span>관심사</span>
            </div>

            <div className={styles.interestList}>
              {(editQuery.data?.allInterests ?? []).map((interest) => {
                const interestId = Number(interest.interestId ?? interest.id);
                const interestName = interest.interestName ?? interest.name;
                const iconName = interest.iconName;

                const isSelected = selectedInterestIds
                  .map(Number)
                  .includes(interestId);

                return (
                  <button
                    key={interestId}
                    type="button"
                    className={`${styles.interestChip} ${
                      isSelected ? styles.interestChipSelected : ""
                    } ${
                      shineInterestId === interestId
                        ? styles.interestChipShine
                        : ""
                    }`}
                    onClick={() => handleToggleInterest(interestId)}
                  >
                    <InterestIcon iconName={iconName} size={14} />
                    <span>{interestName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. 연락처 */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              <PhoneIcon size={18} />
              <span>연락처</span>
            </div>
            <div className={styles.inputRow}>
              <span className={styles.fieldLabel}>연락처</span>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={watch("phone") ?? ""}
                  onChange={(e) => {
                    setValue("phone", formatPhoneNumber(e.target.value), {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  className={styles.input_name}
                  placeholder="010-1234-5678"
                  maxLength={13}
                />
              </div>
            </div>
          </div>

          {/* 5. 주소 */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              <MapPinIcon size={20} />
              <span>주소</span>
            </div>
            <div className={styles.inputRow}>
              <span className={styles.fieldLabel}>우편번호</span>
              <div className={styles.addressSearchRow}>
                <input
                  type="text"
                  value={watch("postcode") ?? ""}
                  className={styles.input_name}
                  placeholder="우편번호"
                  readOnly
                />
                <button
                  type="button"
                  className={styles.addressSearchButton}
                  onClick={() => setIsPostcodeOpen(true)}
                >
                  주소 검색
                </button>
              </div>
            </div>
            {isPostcodeOpen && (
              <div className={styles.postcodeLayer}>
                <div className={styles.postcodeHeader}>
                  <span>주소 검색</span>
                  <button
                    type="button"
                    className={styles.postcodeCloseButton}
                    onClick={() => setIsPostcodeOpen(false)}
                  >
                    ×
                  </button>
                </div>
                <DaumPostcode
                  onComplete={handleCompletePostcode}
                  style={{ width: "100%", height: "420px" }}
                />
              </div>
            )}
            <div className={styles.inputRow}>
              <span className={styles.fieldLabel}>기본주소</span>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={watch("address") ?? ""}
                  className={styles.input_name}
                  placeholder="주소 검색 버튼을 눌러주세요"
                  readOnly
                />
              </div>
            </div>
            <div className={styles.inputRow}>
              <span className={styles.fieldLabel}>상세주소</span>
              <div className={styles.inputWrapper}>
                <input
                  type="text"
                  value={watch("detailAddress") ?? ""}
                  onChange={(e) => {
                    setValue("detailAddress", e.target.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                  }}
                  className={styles.input_name}
                  placeholder="상세주소를 입력해주세요"
                />
              </div>
            </div>
          </div>

          {/* 6. 비밀번호 */}
          {isLocalUser && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                <LockIcon size={18} />
                <span>비밀번호</span>
              </div>
              {passwordFields.map((field, i) => (
                <div className={styles.inputRow} key={field.key}>
                  <span className={styles.fieldLabel}>{field.label}</span>
                  <div className={styles.inputWrapper}>
                    <input
                      className={styles.input}
                      type={showPw[i] ? "text" : "password"}
                      placeholder={field.placeholder}
                      value={pwState[field.key]}
                      onChange={(e) => handlePwChange(e, field.key)}
                    />
                    <div
                      className={styles.iconEnd}
                      onClick={() => togglePassword(i)}
                    >
                      {showPw[i] ? (
                        <EyeIcon size={20} />
                      ) : (
                        <EyeClosedIcon size={20} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className={styles.messageWrapper}>
                {isError ? (
                  <span className={styles.errorMsg}>
                    비밀번호가 일치하지 않습니다.
                  </span>
                ) : (
                  <span />
                )}
                <span className={styles.pw_text}>영문, 숫자 포함 8자 이상</span>
              </div>
            </div>
          )}
          {!isLocalUser && (
            <div className={styles.group}>
              <div className={styles.groupTitle}>
                <LockIcon size={18} />
                <span>비밀번호</span>
              </div>
              <span className={styles.pw_text}>
                구글 로그인 계정은 비밀번호 변경을 지원하지 않습니다.
              </span>
            </div>
          )}

          {/* 7. 알림 설정 */}
          <div className={styles.group}>
            <div className={styles.groupTitle}>
              <BellIcon size={18} />
              <span>알림 설정</span>
            </div>
            <div className={styles.inputRow}>
              <span className={styles.fieldLabel}>알림 수신 동의</span>
              <div className={styles.notiRow}>
                <span>위트 신청, 승인, 일정 관련 알림을 받아볼 수 있어요.</span>
                <button
                  type="button"
                  className={`${styles.notificationSwitch} ${
                    isNotiOn ? styles.notificationSwitchOn : ""
                  }`}
                  onClick={() => setIsNotiOn((prev) => !prev)}
                  aria-checked={isNotiOn}
                  role="switch"
                >
                  <div className={styles.notificationSwitchThumb}>
                    {isNotiOn ? (
                      <BellIcon
                        className={`${styles.notificationSwitchIcon} ${styles.iconOn}`}
                      />
                    ) : (
                      <BellOffIcon
                        className={`${styles.notificationSwitchIcon} ${styles.iconOff}`}
                      />
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
          {/*취소 버튼*/}
          <div className={styles.footer}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnCancel}`}
              onClick={() => navigate(-1)}
            >
              취소
            </button>

            {/*저장 버튼*/}
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSave}`}
              onClick={handleSubmit(onSubmit)}
              disabled={updateMutation.isPending}
            >
              저장하기
            </button>
          </div>
        </div>
      </div>

      <Dialog
        open={isWithdrawDialogOpen}
        onClose={
          withdrawMutation.isPending
            ? undefined
            : () => setIsWithdrawDialogOpen(false)
        }
        aria-labelledby="withdraw-dialog-title"
        aria-describedby="withdraw-dialog-description"
      >
        <DialogTitle id="withdraw-dialog-title">회원 탈퇴</DialogTitle>
        <DialogContent>
          <DialogContentText id="withdraw-dialog-description">
            정말 탈퇴하시겠습니까?
            <br />
            탈퇴 시 아래 정보는 복구할 수 없습니다.
            <br />
            <br />
            • 프로필 정보
            <br />
            • 위시리스트
            <br />
            • 참여 기록
            <br />• 알림 기록
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            onClick={() => setIsWithdrawDialogOpen(false)}
            disabled={withdrawMutation.isPending}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
          >
            {withdrawMutation.isPending ? "처리 중..." : "회원 탈퇴"}
          </button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={withdrawErrorToastOpen}
        autoHideDuration={3000}
        onClose={() => setWithdrawErrorToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setWithdrawErrorToastOpen(false)}
          severity="error"
          variant="filled"
        >
          회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MyPageEdit;
