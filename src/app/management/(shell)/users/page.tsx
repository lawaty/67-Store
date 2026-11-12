/**
 * Admin users list page that fetches paginated client accounts and renders per-user wallet adjustment forms.
 */
import { adminGet } from "@/frontend/admin"
import type { AdminUserPageDto } from "@/api/contracts"
import { Icon } from "@/app/icons"
import { ClickableCard, ClickableRow } from "../../clickable-row"
import { WalletAdjustModal } from "./wallet-adjust-modal"
import { Avatar } from "@/app/avatar"

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
                  <th>المستخدم</th>
                  <th>الرصيد</th>
                  <th>تاريخ الإنشاء</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ClickableRow key={row.id} href={`/management/users/${row.id}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Avatar name={row.username} size="sm" />
                        <div>
                          <p className="font-semibold text-ink">{row.username}</p>
                          <p className="text-sm text-muted">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="num font-bold text-ink">{row.coinBalance}</span></td>
                    <td><span className="num text-sm text-muted">{formatDate(row.createdAt)}</span></td>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <WalletAdjustModal clientId={row.clientId} accountId={row.id} returnTo="users" />
                      </div>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-cards mt-4">
            {rows.map((row) => (
              <ClickableCard key={row.id} href={`/management/users/${row.id}`} className="block cursor-pointer rounded-2xl border border-line bg-surface p-4 shadow-e1">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={row.username} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{row.username}</p>
                    <p className="truncate text-sm text-muted">{row.email}</p>
                  </div>
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
                  <WalletAdjustModal clientId={row.clientId} accountId={row.id} returnTo="users" />
                </div>
              </ClickableCard>
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
