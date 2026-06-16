import { useQuery } from "@tanstack/react-query";
import { getMypageData, getUserProfileData } from "./api";
import { useAuthStore } from "../../auth/store/authStore";

export const useMypage = (targetEmail, enabled = true) => {
  const loginUser = useAuthStore((state) => state.user);
  const loginEmail = loginUser?.email;

  const isOtherProfile = !!targetEmail;

  const queryEmail = isOtherProfile ? targetEmail : loginEmail;

  const mypageQuery = useQuery({
    queryKey: ["mypage", queryEmail],
    queryFn: () =>
      isOtherProfile ? getUserProfileData(targetEmail) : getMypageData(),

    enabled: enabled && !!queryEmail,

    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  return {
    mypageQuery,
  };
};