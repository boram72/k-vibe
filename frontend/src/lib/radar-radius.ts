export const RADAR_RADIUS_STEPS = [300, 500, 800, 1000, 1500] as const

export function getNextRadarRadius(value: number): number | null {
  return RADAR_RADIUS_STEPS.find((step) => step > value) ?? null
}
