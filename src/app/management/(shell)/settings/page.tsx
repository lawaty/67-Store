import { adminGet } from "@/frontend/admin"
import { GatewaySettingsForm } from "./gateway-settings-form"

export const dynamic = "force-dynamic"

type GatewaySettings = {
  card: boolean
  wallet: boolean
  crypto: boolean
  coins: boolean
  fulfilmentEnabled: boolean
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const params = await searchParams
  const data = await adminGet<GatewaySettings>("/api/admin/settings/gateways")

  return (
    <main>
      <header>
        <p className="eyebrow">الإعدادات</p>
        <h1 className="display-2 mt-3">الإعدادات</h1>
        <p className="lede mt-2 text-sm">بوابات الدفع والتنفيذ التلقائي.</p>
      </header>

      {params.error === "gateways" ? (
        <p className="alert mt-4">تعذر حفظ الإعدادات. حاول مرة أخرى.</p>
      ) : null}
      {params.ok === "gateways" ? <p className="notice mt-4">تم حفظ الإعدادات</p> : null}

      <section className="mt-6 rounded-2xl border border-line bg-surface p-4 shadow-e1">
        <GatewaySettingsForm
          card={data.card}
          wallet={data.wallet}
          crypto={data.crypto}
          coins={data.coins}
          fulfilmentEnabled={data.fulfilmentEnabled}
        />
      </section>

    </main>
  )
}
