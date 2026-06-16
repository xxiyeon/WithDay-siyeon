import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMypageEditData, updateMypageData, withdrawMe } from "./api";

export const useMypageEdit = () => {
  const queryClient = useQueryClient();

  const editQuery = useQuery({
    queryKey: ["mypageEdit"],
    queryFn: getMypageEditData,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation({
    mutationFn: updateMypageData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mypageEdit"] });
      queryClient.invalidateQueries({ queryKey: ["mypage"] });
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: withdrawMe,
  });

  return {
    editQuery,
    updateMutation,
    withdrawMutation,
  };
};
