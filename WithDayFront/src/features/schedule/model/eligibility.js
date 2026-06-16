const normalizeGenderLimit = (genderLimit) =>
  String(genderLimit ?? "")
    .trim()
    .toLowerCase();

const normalizeAge = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseBirthday = (birthday) => {
  const normalizedBirthday = String(birthday ?? "").trim();
  if (!normalizedBirthday) {
    return null;
  }

  const parsed = new Date(`${normalizedBirthday}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const hasAgeRestriction = (ageMin, ageMax) =>
  normalizeAge(ageMin) !== null || normalizeAge(ageMax) !== null;

const hasGenderRestriction = (genderLimit) => {
  const normalized = normalizeGenderLimit(genderLimit);
  return normalized === "male" || normalized === "female";
};

export function calculateFullAge(birthday, today = new Date()) {
  const birthDate = parseBirthday(birthday);
  if (!birthDate || Number.isNaN(today?.getTime?.())) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

export function isGenderEligible({ userGender, genderLimit }) {
  const normalizedGenderLimit = normalizeGenderLimit(genderLimit);

  if (!hasGenderRestriction(normalizedGenderLimit)) {
    return true;
  }

  if (userGender === null || userGender === undefined || userGender === "") {
    return false;
  }

  const normalizedGender = Number(userGender);

  if (normalizedGenderLimit === "male") {
    return normalizedGender === 1;
  }

  if (normalizedGenderLimit === "female") {
    return normalizedGender === 2;
  }

  return true;
}

export function isAgeEligible({ birthday, ageMin, ageMax, today = new Date() }) {
  const normalizedAgeMin = normalizeAge(ageMin);
  const normalizedAgeMax = normalizeAge(ageMax);

  if (!hasAgeRestriction(normalizedAgeMin, normalizedAgeMax)) {
    return true;
  }

  const age = calculateFullAge(birthday, today);
  if (age === null) {
    return false;
  }

  if (normalizedAgeMin !== null && age < normalizedAgeMin) {
    return false;
  }

  if (normalizedAgeMax !== null && age > normalizedAgeMax) {
    return false;
  }

  return true;
}

export function getScheduleEligibility({
  userGender,
  birthday,
  genderLimit,
  ageMin,
  ageMax,
  today = new Date(),
}) {
  const normalizedGenderLimit = normalizeGenderLimit(genderLimit);
  const normalizedAgeMin = normalizeAge(ageMin);
  const normalizedAgeMax = normalizeAge(ageMax);
  const age = calculateFullAge(birthday, today);

  const genderRestricted = hasGenderRestriction(normalizedGenderLimit);
  const ageRestricted = hasAgeRestriction(normalizedAgeMin, normalizedAgeMax);

  const isMissingGender =
    genderRestricted && (userGender === null || userGender === undefined || userGender === "");
  const isMissingBirthday = ageRestricted && age === null;

  const isGenderValid = isGenderEligible({
    userGender,
    genderLimit: normalizedGenderLimit,
  });
  const isAgeValid = isAgeEligible({
    birthday,
    ageMin: normalizedAgeMin,
    ageMax: normalizedAgeMax,
    today,
  });

  const reasons = [];

  if (isMissingGender) {
    reasons.push("성별 정보가 없어 참여할 수 없습니다.");
  } else if (!isGenderValid) {
    reasons.push("성별 조건에 맞지 않습니다.");
  }

  if (isMissingBirthday) {
    reasons.push("생년월일 정보가 없어 참여할 수 없습니다.");
  } else if (!isAgeValid) {
    reasons.push("참여 가능 연령이 아닙니다.");
  }

  return {
    age,
    isEligible: isGenderValid && isAgeValid && !isMissingGender && !isMissingBirthday,
    isGenderValid,
    isAgeValid,
    isMissingGender,
    isMissingBirthday,
    reasons,
  };
}
