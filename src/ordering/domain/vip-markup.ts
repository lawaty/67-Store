/**
 * A VIP markup curve: basis points as a non-increasing function of coins
 * consumed, defined by an ordered list of breakpoints.
 */
export type MarkupBreakpoint = { readonly coins: number; readonly basisPoints: number }

export type MarkupCurve = readonly MarkupBreakpoint[]

export function validateMarkupCurve(points: readonly MarkupBreakpoint[]): void {
  if (!Array.isArray(points)) {
    throw new RangeError("markup curve must be an array")
  }
  if (points.length < 2) {
    throw new RangeError("markup curve requires at least 2 breakpoints")
  }
  const first = points[0]
  if (!first || typeof first !== "object") {
    throw new RangeError("markup curve breakpoint must be an object")
  }
  if (first.coins !== 0) {
    throw new RangeError("first breakpoint coins must be 0")
  }
  let prevCoins: number | null = null
  let prevBasisPoints: number | null = null
  for (const point of points) {
    if (!point || typeof point !== "object") {
      throw new RangeError("markup curve breakpoint must be an object")
    }
    if (!Number.isSafeInteger(point.coins) || point.coins < 0) {
      throw new RangeError("breakpoint coins must be a non-negative safe integer")
    }
    if (prevCoins !== null && !(point.coins > prevCoins)) {
      throw new RangeError("breakpoint coins must be strictly increasing")
    }
    if (!Number.isSafeInteger(point.basisPoints) || point.basisPoints < 0) {
      throw new RangeError("breakpoint basisPoints must be a non-negative safe integer")
    }
    if (prevBasisPoints !== null && point.basisPoints > prevBasisPoints) {
      throw new RangeError("breakpoint basisPoints must not increase")
    }
    prevCoins = point.coins
    prevBasisPoints = point.basisPoints
  }
}

export function resolveMarkupBasisPoints(points: MarkupCurve, coinsConsumed: number): number {
  validateMarkupCurve(points)
  let consumed = coinsConsumed
  if (!Number.isFinite(consumed)) {
    consumed = 0
  }
  if (consumed < 0) {
    consumed = 0
  }
  const first = points[0]
  const last = points[points.length - 1]
  if (consumed <= first.coins) {
    return first.basisPoints
  }
  if (consumed >= last.coins) {
    return last.basisPoints
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (consumed >= a.coins && consumed <= b.coins) {
      const span = b.coins - a.coins
      if (span === 0) {
        return a.basisPoints
      }
      const interpolated = a.basisPoints + (b.basisPoints - a.basisPoints) * ((consumed - a.coins) / span)
      return Math.round(interpolated)
    }
  }
  return last.basisPoints
}

export function nextBreakpoint(points: MarkupCurve, coinsConsumed: number): MarkupBreakpoint | null {
  validateMarkupCurve(points)
  for (const point of points) {
    if (point.coins > coinsConsumed) {
      return point
    }
  }
  return null
}
