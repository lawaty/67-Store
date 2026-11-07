/**
 * Management user detail route at /management/users/[id]: renders account
 * info, wallet history, and the wallet adjustment form.
 */
import { notFound } from "next/navigation"
import { adminGet } from "@/frontend/admin"
import { ApiError } from "@/frontend/api"
import type { AdminUserDetailDto } from "@/api/contracts"
import { adjustWallet, clearVipOverride, saveVipOverride } from "../actions"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"

export const dynamic = "force-dynamic"

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("ar-EG")
  } catch {
    return value
  }
}

function formatPercent(basisPoints: number): string {
  const percent = basisPoints / 100
  return Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2).replace(/\.?0+$/, "")}%`
}

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; error?: string; overrideOk?: string; overrideError?: string }>
}) {
  const { id } = await params
  const sp = await searchParams

  const data = await adminGet<AdminUserDetailDto>(`/api/admin/users/${encodeURIComponent(id)}`).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound()
      throw error
    },
  )

  return (
    <main dir="rtl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <a className="btn btn-ghost btn-sm" href="/management/users">
          <span className="rtl:-scale-x-100"><Icon name="chevron-left" size={15} /></span>
          رجوع للمستخدمين
        </a>
        <span className="hud-chip"><Icon name="user" size={12} />مستخدم</span>
      </div>

      <header>
        <p className="eyebrow"><Icon name="user" size={12} />ملف المستخدم</p>
        <h1 className="display-2 mt-3 break-all">{data.account.email}</h1>
        <p className="num mt-2 text-sm text-muted">{data.account.clientId}</p>
      </header>

      {sp.ok === "1" ? <p className="notice mt-4">تم تعديل المحفظة بنجاح.</p> : null}
      {sp.error === "insufficient" ? <p className="alert mt-4">الرصيد ما يكفي.</p> : null}
      {sp.error && sp.error !== "insufficient" ? <p className="alert mt-4">تحقق من البيانات المدخلة.</p> : null}
      {sp.overrideOk === "1" ? <p className="notice mt-4">تم حفظ هامش العميل.</p> : null}
      {sp.overrideError ? <p className="alert mt-4">ما قدرناش نحفظ هامش العميل. تحقق من النسبة.</p> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div>
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">المحفظة</p>
                <h2 className="display-2 mt-1">آخر الحركات</h2>
              </div>
              <span className="coin-chip">
                <Icon name="coins" size={16} />
                <span className="num">{data.wallet.coinBalance}</span>
              </span>
            </div>

            {data.entries.length === 0 ? (
              <p className="empty mt-4">مفيش حركات بعد.</p>
            ) : (
              <>
                <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>الحركة</th>
                        <th>السبب</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td>
                            <span className={entry.amount > 0 ? "num font-bold text-jade" : "num font-bold text-danger"} dir="ltr">
                              {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                            </span>
                          </td>
                          <td className="font-semibold">{entry.reason}</td>
                          <td><span className="num text-sm text-muted">{formatDate(entry.createdAt)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="table-cards mt-4">
                  {data.entries.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                      <div className="flex items-start justify-between gap-3">
                        <span className={entry.amount > 0 ? "num text-sm font-bold text-jade" : "num text-sm font-bold text-danger"} dir="ltr">
                          {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                        </span>
                        <span className="num text-xs text-muted">{formatDate(entry.createdAt)}</span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">{entry.reason}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <p className="eyebrow">VIP</p>
            <h2 className="mt-1 text-base font-bold text-ink">مستوى العميل</h2>
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">العملات المستهلكة (30 يوم)</dt>
                <dd className="num font-bold text-ink" dir="ltr">{data.coinsConsumed30d}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">الهامش الحالي (MLBB)</dt>
                <dd className="num font-bold text-ink" dir="ltr">{formatPercent(data.markupBasisPoints)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">الحد التالي</dt>
                <dd className="text-ink">
                  {data.nextBreakpoint === null ? (
                    "أعلى مستوى"
                  ) : (
                    <span>
                      <span className="num" dir="ltr">+{Math.max(0, data.nextBreakpoint.coins - data.coinsConsumed30d)}</span>{" "}
                      عملة → <span className="num" dir="ltr">{formatPercent(data.nextBreakpoint.basisPoints)}</span>
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">هامش مخصص</dt>
                <dd className={data.override ? "font-semibold text-amber-700" : "text-muted"}>
                  {data.override ? "مفعّل" : "غير مفعّل"}
                </dd>
              </div>
            </dl>
            {data.override ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-950">
                <p>
                  هامش مخصص: <span className="num font-bold" dir="ltr">{formatPercent(data.override.basisPoints)}</span>
                </p>
                {data.override.note ? <p className="mt-1 text-amber-900">{data.override.note}</p> : null}
                <p className="num mt-1 text-sm text-amber-800">{formatDate(data.override.updatedAt)}</p>
              </div>
            ) : null}

            <form action={saveVipOverride} className="mt-4 stack">
              <input type="hidden" name="accountId" value={data.account.id} />
              <div className="field">
                <label htmlFor="vipMarkupPercent">هامش مخصص (٪)</label>
                <input
                  id="vipMarkupPercent"
                  name="markupPercent"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={data.override ? data.override.basisPoints / 100 : data.markupBasisPoints / 100}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="vipNote">ملاحظة (اختياري)</label>
                <input id="vipNote" name="note" defaultValue={data.override?.note ?? ""} />
              </div>
              <div className="flex gap-2">
                <SubmitButton className="btn btn-primary btn-sm flex-1">
                  <Icon name="save" size={14} /> حفظ الهامش
                </SubmitButton>
                {data.override ? (
                  <button formAction={clearVipOverride} className="btn btn-ghost btn-sm" type="submit">
                    إزالة
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
            <h2 className="text-base font-bold text-ink">تعديل المحفظة</h2>
            <form action={adjustWallet} className="mt-4 stack">
              <input type="hidden" name="clientId" value={data.account.clientId} />
              <input type="hidden" name="accountId" value={data.account.id} />
              <div className="field">
                <label htmlFor="amount">عدد العملات</label>
                <input id="amount" name="amount" type="number" min={1} step={1} />
              </div>
              <div className="field">
                <label>الاتجاه</label>
                <div className="flex gap-4">
                  <label className="check"><input type="radio" name="direction" value="credit" defaultChecked /> إضافة</label>
                  <label className="check"><input type="radio" name="direction" value="debit" /> خصم</label>
                </div>
              </div>
              <div className="field">
                <label htmlFor="reason">السبب (مطلوب)</label>
                <input id="reason" name="reason" required />
              </div>
              <SubmitButton className="btn btn-primary btn-block">
                <Icon name="save" size={15} /> تطبيق
              </SubmitButton>
            </form>
          </section>
        </aside>
      </div>
    </main>
  )
}
