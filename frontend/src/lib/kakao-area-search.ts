// 팀 태스크보드 6번 — "동네검색"(강남/종로 같이 임의의 지역명으로 이동).
// 기존 검색창은 이미 불러온 주변 스팟 목록을 클라이언트에서 텍스트로 필터링할
// 뿐이라 목록에 없는 지역으로는 이동할 수 없었음. kakao.maps.services 라이브러리의
// 키워드 장소검색으로 지역명을 좌표로 바꿔서 지도의 새 검색 중심으로 삼는다.
//
// 순수 프론트엔드 기능(카카오 지도 SDK 자체가 이미 프론트에서만 동작) — 백엔드
// 변경 없음. 퍼센트 좌표 폴백 모드(VITE_KAKAO_MAP_KEY 없음)에서는 kakao.maps나
// services가 아예 없으므로 항상 null을 반환한다(호출부가 버튼 자체를 숨김).
export async function searchKakaoArea(query: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = query.trim()
  if (!trimmed) return null
  if (typeof kakao === 'undefined' || !kakao.maps?.services) return null

  return new Promise((resolve) => {
    const places = new kakao.maps.services.Places()
    places.keywordSearch(trimmed, (result, status) => {
      if (status === kakao.maps.services.Status.OK && result.length > 0) {
        resolve({ lat: Number(result[0].y), lng: Number(result[0].x) })
      } else {
        resolve(null)
      }
    })
  })
}
