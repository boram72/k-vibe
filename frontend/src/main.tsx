import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import { AppToaster } from '@/blocks/common/app-toaster'
import { AnalysisCompletionBanner } from '@/blocks/analyze/analysis-completion-banner'
import '@/i18n'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <AppToaster />
      {/* 라우트 트리 밖에 마운트 — 어느 페이지에 있든(홈/지도/분석기/기타 탭)
          SNS 분석 완료·실패 배너가 뜨게 하기 위함. see analysis-completion-banner.tsx */}
      <AnalysisCompletionBanner />
    </QueryClientProvider>
  </StrictMode>,
)
