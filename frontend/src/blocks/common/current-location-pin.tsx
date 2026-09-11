import { LocateFixed } from 'lucide-react'

// 2026-09 — "내 위치"를 지도 위에 표시하는 공용 마커. 스탑 번호 핀(primary/
// crowd-low)이나 카테고리 핀(각 카테고리 색)과 확실히 구분되도록 빨간색 +
// 펄스 링으로 처리(대화로 확정). route-mini-map.tsx(13번)에서 처음 만들었고,
// map-canvas.tsx(12번, K-Vibe 지도 메뉴)에서도 동일하게 재사용한다.
export function CurrentLocationPin() {
  return (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <span className="absolute h-7 w-7 animate-ping rounded-full bg-red-500/50" />
      <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-background bg-red-500 text-white shadow-lg">
        <LocateFixed className="h-3 w-3" />
      </span>
    </div>
  )
}
