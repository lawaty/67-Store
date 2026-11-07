/**
 * /management/promos route: renders the admin promo code list and the form for
 * creating or toggling discount codes.
 */

import { adminGet } from "@/frontend/admin"
import type { AdminPromoDto } from "@/api/contracts"
import { createPromo, togglePromo } from "./actions"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"

export const dynamic = "force-dynamic"

const errorMessages: Record<string, string> = {
  percent: "تحقق من نسبة الخصم.",
  code: "أدخل كودًا غير فارغ.",
  kind: "نوع مش صالح.",
  amount: "المبلغ لازم يكون موجب.",
  maxuses: "عدد الاستخدامات لازم يكون رقم صحيح موجب.",
  date: "تاريخ مش صالح.",
  duplicate: "الكود مستخدم بالفعل.",
}

const okMessages: Record<string, string> = {
  created: "تم إنشاء الكوبون.",
  toggled: "تم تحديث الحالة.",
}

function promoValue(promo: AdminPromoDto) {
  return promo.kind === "PERCENT"
    ? `${((promo.basisPoints ?? 0) / 100).toFixed(2)}%`
    : `${((promo.amountEgpMinor ?? 0) / 100).toFixed(2)} ج.م`
}

function promoExpiry(promo: AdminPromoDto) {
  return promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString("ar") : "بلا انتهاء"
}

export default async function PromosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const query = await searchParams
  const promos = await adminGet<AdminPromoDto[]>("/api/admin/promos")

  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Icon name="tag" size={12} />التسويق</p>
          <h1 className="display-2 mt-3">كوبونات الخصم</h1>
          <p className="lede mt-2 text-sm">تُطبَّق الكوبونات عند إنشاء الطلب، ولا يخفض الخصم السعر دون تكلفة المورّد.</p>
        </div>
        <span className="hud-chip"><Icon name="tag" size={12} />{promos.length} كوبون</span>
      </header>

      {query.error && errorMessages[query.error] ? (
        <p className="alert mt-4">{errorMessages[query.error]}</p>
      ) : query.error ? (
        <p className="alert mt-4">تحقق من البيانات المدخلة.</p>
      ) : null}
      {query.ok && okMessages[query.ok] ? <p className="notice mt-4">{okMessages[query.ok]}</p> : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-e1">
          <h2 className="text-base font-bold text-ink">كوبون خصم جديد</h2>
          <form action={createPromo} className="mt-4 stack">
            <div className="field">
              <label htmlFor="code">الكود</label>
              <input id="code" type="text" name="code" dir="ltr" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="kind">النوع</label>
              <select id="kind" name="kind" defaultValue="PERCENT">
                <option value="PERCENT">نسبة مئوية</option>
                <option value="FIXED">مبلغ ثابت</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="value">القيمة</label>
              <input id="value" type="number" name="value" min={1} step="any" />
              <p className="hint">للنوع "مبلغ ثابت": يُدخل بالجنيه ويُخزَّن بالدولار (تحويل بسعر اليوم).</p>
            </div>
            <div className="field">
              <label htmlFor="maxUses">عدد الاستخدامات (فارغ = بلا حد)</label>
              <input id="maxUses" type="number" name="maxUses" min={1} step={1} />
            </div>
            <div className="field">
              <label htmlFor="expiresAt">تاريخ الانتهاء (فارغ = بلا انتهاء)</label>
              <input id="expiresAt" type="date" name="expiresAt" />
            </div>
            <SubmitButton className="btn btn-primary btn-block"><Icon name="plus" size={15} /> إنشاء الكوبون</SubmitButton>
          </form>
        </section>

        <section>
          <h2 className="text-base font-bold text-ink">الكوبونات الحالية</h2>

          {promos.length === 0 ? (
            <p className="empty mt-3">مفيش كوبونات خصم بعد.</p>
          ) : (
            <>
              <div className="table-desktop mt-3 overflow-hidden rounded-2xl border border-line">
                <table className="table">
                  <thead>
                    <tr>
                      <th>الكود</th>
                      <th>النوع</th>
                      <th>القيمة</th>
                      <th>الاستخدامات</th>
                      <th>الانتهاء</th>
                      <th>الحالة</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {promos.map((promo) => (
                      <tr key={promo.id}>
                        <td><span className="num font-bold text-ink" dir="ltr">{promo.code}</span></td>
                        <td>{promo.kind === "PERCENT" ? "نسبة" : "مبلغ ثابت"}</td>
                        <td><span className="num" dir="ltr">{promoValue(promo)}</span></td>
                        <td><span className="num">{promo.uses} / {promo.maxUses === null ? "بلا حد" : promo.maxUses}</span></td>
                        <td className="text-sm text-muted">{promoExpiry(promo)}</td>
                        <td>
                          <span className={promo.active ? "badge badge-paid" : "badge badge-expired"}>
                            {promo.active ? "نشط" : "معطّل"}
                          </span>
                        </td>
                        <td>
                          <form action={togglePromo}>
                            <input type="hidden" name="id" value={promo.id} />
                            <input type="hidden" name="active" value={String(promo.active)} />
                            <SubmitButton className="btn btn-ghost btn-sm">
                              {promo.active ? "تعطيل" : "تفعيل"}
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-cards mt-3">
                {promos.map((promo) => (
                  <article key={promo.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="num text-sm font-bold text-ink" dir="ltr">{promo.code}</span>
                      <span className={promo.active ? "badge badge-paid" : "badge badge-expired"}>
                        {promo.active ? "نشط" : "معطّل"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                        <p className="card-kicker">القيمة</p>
                        <p className="num mt-1 font-bold text-ink" dir="ltr">{promoValue(promo)}</p>
                      </div>
                      <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                        <p className="card-kicker">الاستخدامات</p>
                        <p className="num mt-1 font-bold text-ink">{promo.uses} / {promo.maxUses === null ? "∞" : promo.maxUses}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted">{promoExpiry(promo)} · {promo.kind === "PERCENT" ? "نسبة" : "مبلغ ثابت"}</p>
                    <form action={togglePromo} className="mt-3">
                      <input type="hidden" name="id" value={promo.id} />
                      <input type="hidden" name="active" value={String(promo.active)} />
                      <SubmitButton className="btn btn-ghost btn-sm btn-block">
                        {promo.active ? "تعطيل" : "تفعيل"}
                      </SubmitButton>
                    </form>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
