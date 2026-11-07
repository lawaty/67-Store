/**
 * Renders the coin image icon at a configurable pixel size using responsive
 * source assets. Decorative only; it carries an empty alt text.
 */
export function Coin({ size = 16 }: { size?: number }) {
  return (
    <img
      className="coin"
      src="/coin-128.png"
      srcSet="/coin-64.png 1x, /coin-128.png 2x, /coin-256.png 3x"
      width={size}
      height={size}
      alt=""
      decoding="async"
    />
  )
}
