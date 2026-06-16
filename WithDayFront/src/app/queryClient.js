import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,              // 실패 시 재시도 횟수
            staleTime: 1000 * 60, // 1분 동안 fresh 상태
            refetchOnWindowFocus: false, // 포커스 시 재요청 방지
            // 커밋 알림
        },
    },
})