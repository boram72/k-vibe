import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/use-auth'
import { fetchKContentPersonas, fetchPersonaPlaces, type KContentPersona } from '@/api/personas'
import type { Place } from '@/types/place'
import type { Locale } from '@/i18n'

// 팀 태스크보드 1번(홈화면 수정, 수원 샘플 이미지 반영) — 그라데이션 배너.
// 우측 "OO 루트 미리보기"는 추천 페르소나 1명을 무작위로 뽑아서 보여주고,
// 홈 화면에 들어올 때마다(마운트마다) 다시 무작위로 바뀐다(로그인/게스트
// 구분 없음 — 대화로 확정). 미리보기 목록은 지도 스타별 필터(12번)에서 이미
// 붙인 fetchPersonaPlaces()를 그대로 재사용 — 페르소나 태그가 붙은 실제
// 장소(사진 포함)라 새 API 없이 바로 재사용 가능.
function pickRandomPersona(personas: KContentPersona[], placesByLabel: Map<string, Place[]>): KContentPersona | null {
  if (personas.length === 0) return null
  // 백엔드 데이터 갭(BACKEND_REQUESTS.md 2번) 대응 — 아직 /personas/places에
  // 장소가 없는 페르소나가 있어서, 있는 쪽을 우선 뽑는다. 전부 없으면 아무나.
  const withPlaces = personas.filter((p) => (placesByLabel.get(p.label)?.length ?? 0) > 0)
  const pool = withPlaces.length > 0 ? withPlaces : personas
  return pool[Math.floor(Math.random() * pool.length)]
}

// 배너 껍데기(그라데이션/인사말/헤드라인/CTA)는 데이터 없이도 바로 그릴 수
// 있어서 기다리지 않고 즉시 노출 — "루트 미리보기" 카드만 데이터가 필요하니
// 그 안쪽만 로딩 상태를 갖는다(대화로 확정, 배너 전체를 스켈레톤으로 가리지 않음).
function RoutePreviewSkeleton() {
  return (
    <div className="hidden w-full shrink-0 animate-pulse rounded-xl bg-black/20 p-3 md:block md:w-64">
      <div className="h-3 w-24 rounded bg-white/30" />
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-full rounded bg-white/20" />
        <div className="h-2.5 w-4/5 rounded bg-white/20" />
        <div className="h-2.5 w-3/5 rounded bg-white/20" />
      </div>
    </div>
  )
}

export function HomeBanner() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const locale = i18n.language as Locale

  const personasQuery = useQuery({
    queryKey: ['k-content-personas', locale],
    queryFn: () => fetchKContentPersonas(locale),
  })
  const placesQuery = useQuery({
    queryKey: ['persona-places', locale],
    queryFn: () => fetchPersonaPlaces(locale),
    staleTime: 30 * 60 * 1000,
  })

  const placesByLabel = useMemo(() => {
    const map = new Map<string, Place[]>()
    for (const place of placesQuery.data ?? []) {
      for (const tag of place.tags ?? []) {
        map.set(tag, [...(map.get(tag) ?? []), place])
      }
    }
    return map
  }, [placesQuery.data])

  // 버그 수정 — personasQuery만 의존성으로 뒀더니, persona-places가 아직 안
  // 온 시점(placesByLabel이 비어있음)에 먼저 뽑아버려서 "장소 있는 쪽 우선"
  // 필터가 무력화되고 장소 없는 페르소나가 뽑혀 설명 폴백만 뜨는 문제가
  // 있었음 → 두 쿼리가 전부 settle된 뒤 딱 한 번만 뽑도록 변경.
  const bothReady = !personasQuery.isPending && !placesQuery.isPending
  const randomPersona = useMemo(
    () => (bothReady ? pickRandomPersona(personasQuery.data ?? [], placesByLabel) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bothReady],
  )

  const previewPlaces = randomPersona ? (placesByLabel.get(randomPersona.label) ?? []).slice(0, 3) : []
  const greeting = user ? t('landing.greeting', { name: user.name }) : t('landing.greeting_guest')

  return (
    <section className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 p-5 text-white shadow-lg dark:from-rose-950 dark:via-pink-950 dark:to-neutral-900 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">{t('landing.banner_eyebrow')}</p>
          <p className="text-sm text-white/90">{greeting}</p>
          {/* 모바일에서 이상한 지점에서 줄바꿈되는 문제로 모바일 전용 강제
              줄바꿈 문구 사용(대화로 확정) — landing.subtitle_mobile은
              ko만 실제로 다르고 en/ja/zh는 subtitle과 동일한 값(변화 없음). */}
          <h1 className="whitespace-pre-line text-xl font-bold leading-snug md:whitespace-normal md:text-2xl">
            <span className="md:hidden">{t('landing.subtitle_mobile')}</span>
            <span className="hidden md:inline">{t('landing.subtitle')}</span>
          </h1>
          {/* 데스크탑은 텍스트 바로 아래, 모바일은 배너 우측 하단에 별도로
              배치(대화로 확정) — 아래 모바일 전용 버튼과 중복 렌더. */}
          <Button
            size="lg"
            className="mt-1 hidden bg-white text-rose-600 hover:bg-white/90 md:inline-flex"
            nativeButton={false}
            render={<Link to="route" />}
          >
            {t('landing.build_route_cta')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* 모바일에서는 루트 미리보기 카드를 숨김(대화로 확정) — 배너가
            세로로 너무 길어지는 걸 방지, 데스크탑에서만 노출. 데이터가 아직
            안 왔으면 스켈레톤, 왔으면 실제 미리보기로 교체. */}
        {!bothReady && <RoutePreviewSkeleton />}
        {bothReady && randomPersona && (
          <div className="hidden w-full shrink-0 rounded-xl bg-black/30 p-3 backdrop-blur dark:bg-black/45 md:block md:w-64">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-white/90">
              <Sparkles className="h-3.5 w-3.5" />
              {t('landing.route_preview_title', { persona: randomPersona.label })}
            </p>
            <div className="mt-1.5 border-t border-white/20" />
            {previewPlaces.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {previewPlaces.map((place) => (
                  <li key={place.id} className="flex items-start gap-2 text-xs">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/80" />
                    <span className="truncate text-white/90">{place.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/80">{randomPersona.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end md:hidden">
        <Button
          size="lg"
          className="bg-white text-rose-600 hover:bg-white/90"
          nativeButton={false}
          render={<Link to="route" />}
        >
          {t('landing.build_route_cta')}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}
