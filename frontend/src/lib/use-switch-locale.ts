import { useLocation, useNavigate } from 'react-router-dom'
import type { Locale } from '@/i18n'

// 언어 드롭다운(TopBar)과 프로필 설정이 함께 쓰는 "같은 화면에서 언어만 바꾸기".
//
// 예전에는 navigate(경로)만 호출해서 경로의 로케일 세그먼트만 새로 만들어 이동했다. 라우터 state로
// 화면을 구분하는 곳 — 페르소나 결과 화면(state.selectedPersonaId), 지도의 핸드오프(돌아가기 버튼·
// 필터·선택 장소 state) — 은 그 state가 통째로 사라져서, 언어만 바꿨는데 페르소나 결과 화면이 카드 선택
// 화면으로 돌아가고 지도의 "돌아가기"도 없어졌다. 그래서 state/쿼리/해시를 그대로 옮긴다.
//
// replace로 이동하는 이유: 같은 화면의 언어만 바뀌는 것이라 히스토리를 새로 쌓지 않는다. push로 쌓으면
// 페르소나의 "다른 루트 만들기"(navigate(-1))가 카드 목록이 아니라 "이전 언어의 같은 결과 화면"으로 가고,
// 뒤로가기도 같은 화면을 한 번 더 거쳐야 했다.
export function useSwitchLocale() {
  const location = useLocation()
  const navigate = useNavigate()

  return function switchLocale(code: Locale) {
    const segments = location.pathname.split('/')
    segments[1] = code
    navigate(
      { pathname: segments.join('/'), search: location.search, hash: location.hash },
      { state: location.state, replace: true },
    )
  }
}
