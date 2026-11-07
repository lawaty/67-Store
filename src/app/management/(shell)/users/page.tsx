/**
 * Admin users list page that fetches paginated client accounts and renders per-user wallet adjustment forms.
 */
import { adminGet } from "@/frontend/admin"
import type { AdminUserPageDto } from "@/api/contracts"
import { Icon } from "@/app/icons"
import { adjustWallet } from "./actions"
import { SubmitButton } from "@/app/submit-button"

export const dynamic = "force-dynamic"

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString("ar-EG")
  } catch {
    return value
  }
}

function mapError(code: string) {
  switch (code) {
    case "insufficient":
      return "الرصيد ما يكفي."
    case "amount":
      return "عدد العملات مش صالح."
    case "reason":
      return "اكتب السبب."
    case "account":
      return "الحساب ما موجود."
    case "invalid":
      return "البيانات المدخلة مش صالحة."
    default:
      return "حصل خطأ أثناء تعديل الرصيد."
  }
}

function AdjustForm({ clientId, accountId }: { clientId: string; accountId: string }) {
  return (
    <form action={adjustWallet} className="mt-2 grid min-w-56 gap-2 rounded-xl border border-line bg-raised/50 p-3">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="accountId" value={accountId} />
      <input type="hidden" name="returnTo" value="users" />
      <input className="input" name="amount" type="number" min={1} step={1} required placeholder="عدد العملات" />
      <input className="input" name="reason" required placeholder="السبب" />
      <div className="flex gap-2">
        <SubmitButton name="direction" value="credit" className="btn btn-primary btn-sm flex-1">إضافة</SubmitButton>
        <SubmitButton name="direction" value="debit" className="btn btn-ghost btn-sm flex-1">خصم</SubmitButton>
      </div>
    </form>
  )
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; ok?: string; error?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page || "1") || 1)
  const { rows, total, skip } = await adminGet<AdminUserPageDto>(
    `/api/admin/users${page > 1 ? `?page=${page}` : ""}`,
  )

  const buildUrl = (target: number) =>
    target > 1 ? `/management/users?page=${target}` : "/management/users"

  return (
    <main dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Icon name="users" size={12} />الإدارة</p>
          <h1 className="display-2 mt-2">المستخدمين</h1>
        </div>
        <span className="hud-chip"><Icon name="users" size={12} />{total} مستخدم</span>
      </header>

      {params.ok === "1" ? <p className="notice mt-4">تم تعديل الرصيد بنجاح.</p> : null}
      {params.error ? <p className="alert mt-4">{mapError(params.error)}</p> : null}

      {rows.length === 0 ? (
        <p className="empty mt-4">مفيش حسابات بعد.</p>
      ) : (
        <>
          <div className="table-desktop mt-4 overflow-hidden rounded-2xl border border-line">
            <table className="table">
              <thead>
                <tr>
                  <th>البريد الإلكتروني</th>
                  <th>الرصيد</th>
                  <th>تاريخ الإنشاء</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <p className="font-semibold text-ink">{row.email}</p>
                      <p className="num text-xs text-muted">{row.clientId}</p>
                    </td>
                    <td><span className="num font-bold text-ink">{row.coinBalance}</span></td>
                    <td><span className="num text-sm text-muted">{formatDate(row.createdAt)}</span></td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <a className="btn btn-ghost btn-sm" href={`/management/users/${row.id}`}>إدارة</a>
                        <details>
                          <summary className="btn btn-ghost btn-sm cursor-pointer list-none">تعديل الرصيد</summary>
                          <AdjustForm clientId={row.clientId} accountId={row.id} />
                        </details>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-cards mt-4">
            {rows.map((row) => (
              <article key={row.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">{row.email}</p>
                  <p className="num text-xs text-muted">{row.clientId}</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                    <p className="card-kicker">الرصيد</p>
                    <p className="num mt-1 font-bold text-ink">{row.coinBalance}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                    <p className="card-kicker">تاريخ الإنشاء</p>
                    <p className="num mt-1 text-sm text-muted">{formatDate(row.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-start gap-2">
                  <a className="btn btn-ghost btn-sm" href={`/management/users/${row.id}`}>إدارة</a>
                  <details className="flex-1">
                    <summary className="btn btn-ghost btn-sm w-full cursor-pointer list-none">تعديل الرصيد</summary>
                    <AdjustForm clientId={row.clientId} accountId={row.id} />
                  </details>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          {page > 1 ? <a className="btn btn-ghost" href={buildUrl(page - 1)}>السابق</a> : null}
        </div>
        <span className="hud-chip">صفحة {page}</span>
        <div>
          {skip + rows.length < total ? <a className="btn btn-ghost" href={buildUrl(page + 1)}>التالي</a> : null}
        </div>
      </div>
    </main>
  )
}
