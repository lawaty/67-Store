"use client"

import { SubmitButton } from "@/app/submit-button"
import { saveGateways } from "./actions"

type GatewaySettingsFormProps = {
  readonly card: boolean
  readonly wallet: boolean
  readonly crypto: boolean
  readonly coins: boolean
  readonly fulfilmentEnabled: boolean
}

export function GatewaySettingsForm({
  card,
  wallet,
  crypto,
  coins,
  fulfilmentEnabled,
}: GatewaySettingsFormProps) {
  return (
    <form action={saveGateways} className="stack">
      <label className="flex items-start gap-3">
        <input type="checkbox" name="card" defaultChecked={card} className="mt-1" />
        <span>
          <span className="block font-medium text-ink">البطاقات</span>
          <span className="hint">مدفوعات البطاقات عبر Paymob</span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="wallet" defaultChecked={wallet} className="mt-1" />
        <span>
          <span className="block font-medium text-ink">المحافظ</span>
          <span className="hint">المحافظ المحمولة عبر Paymob</span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="crypto" defaultChecked={crypto} className="mt-1" />
        <span>
          <span className="block font-medium text-ink">العملات الرقمية</span>
          <span className="hint">بوابات العملات الرقمية (مؤجلة حاليًا)</span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input type="checkbox" name="coins" defaultChecked={coins} className="mt-1" />
        <span>
          <span className="block font-medium text-ink">عملات ٦٧</span>
          <span className="hint">الدفع من رصيد محفظة عملات ٦٧</span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="fulfilmentEnabled"
          defaultChecked={fulfilmentEnabled}
          className="mt-1"
        />
        <span>
          <span className="block font-medium text-ink">التنفيذ التلقائي</span>
          <span className="hint">تنفيذ الطلبات المدفوعة تلقائيًا</span>
        </span>
      </label>

      <p className="hint">
        إيقاف أي وسيلة دفع يزيلها من صفحة الدفع فورًا؛ وإيقاف التنفيذ التلقائي يترك الطلبات المدفوعة
        دون تنفيذ للمعالجة اليدوية.
      </p>

      <SubmitButton className="btn btn-primary">حفظ</SubmitButton>
    </form>
  )
}
