/**
 * Dashboard entry point to the VIP levels page.
 */

import Link from "next/link"

export function PricingControls() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link className="btn" href="/management/levels">
        مستويات VIP
      </Link>
    </div>
  )
}
