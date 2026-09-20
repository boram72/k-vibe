// 대화 중 요청 — 장식용 Sparkles 아이콘(lucide-react) 색상을 홈 배너
// (home-banner.tsx의 bg-gradient-to-br from-rose-500 via-pink-500
// to-orange-400)와 맞추기 위한 공유 SVG 그라데이션. lucide 아이콘은
// stroke="currentColor"라 Tailwind 클래스만으로는 그라데이션을 줄 수 없어서,
// <Sparkles color="url(#kvibe-sparkle-gradient)" /> 형태로 이 정의를 참조한다.
// 배너의 다크모드 그라데이션(rose-950 등)은 배경 표면용이라 그대로 쓰면 작은
// 아이콘은 거의 안 보이게 되므로, 라이트모드 색상값을 다크/라이트 공통으로
// 고정 사용(로고 워드마크/파비콘에 적용한 것과 동일한 방식).
// main.tsx에 앱 루트에서 딱 한 번만 렌더 — 어느 페이지에서 쓰든(AppLayout
// 경유든 LandingPage처럼 standalone이든) 항상 이 정의를 참조할 수 있다.
export function SparkleGradientDefs() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <defs>
        <linearGradient id="kvibe-sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
  )
}
