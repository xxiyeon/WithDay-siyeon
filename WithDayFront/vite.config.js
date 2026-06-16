import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // 구글 로그인 팝업 에러(COOP) 해결을 위한 보안 헤더 출입증 추가
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups", 
    }
  }
})