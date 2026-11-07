/**
 * /management/levels route: renders the admin VIP level editor for coin
 * thresholds, margins, titles, icons and colours.
 */

import { adminGet } from "@/frontend/admin"
import type { AdminSettingsDto } from "@/api/contracts"
import { Icon } from "@/app/icons"
import { VipCurveEditor } from "../vip-curve-editor"

export const dynamic = "force-dynamic"

export default async function LevelsPage() {
  const settings = await adminGet<AdminSettingsDto>("/api/admin/settings")

  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">
            <Icon name="gem" size={12} />
            الولاء
          </p>
          <h1 className="display-2 mt-3">مستويات VIP</h1>
          <p className="lede mt-2 text-sm">
            حجم العملات المستهلكة خلال آخر 30 يومًا يحدد مستواك، والهامش هو
            الخصم في الاتجاه المعاكس.
          </p>
        </div>
        <span className="hud-chip">
          <Icon name="gem" size={12} />
          {settings.vipLevels.length} مستوى
        </span>
      </header>

      {settings.vipLevels.length === 0 ? (
        <p className="notice mt-4">لا توجد مستويات محفوظة بعد.</p>
      ) : null}

      <VipCurveEditor initial={settings.vipLevels} />
    </main>
  )
}
