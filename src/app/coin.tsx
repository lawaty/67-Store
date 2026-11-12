/**
 * Renders the coin image icon at a configurable pixel size using responsive
 * source assets. Decorative only; it carries an empty alt text.
 */
import { brand } from "@/shared/brand"

export function Coin({ size = 16 }: { size?: number }) {
  return (
    <img
      className="coin"
      src={brand.coin128}
      srcSet={`${brand.coin64} 1x, ${brand.coin128} 2x, ${brand.coin256} 3x`}
      width={size}
      height={size}
      alt=""
      decoding="async"
    />
  )
}
