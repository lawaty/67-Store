/**
 * /management/achievements route: renders the admin achievement list with
 * inline create, edit and delete controls.
 */

import { adminGet } from "@/frontend/admin"
import type { AdminAchievementDto } from "@/api/contracts"
import { ACHIEVEMENT_TYPE_LABELS } from "@/shared/achievement"
import { Icon } from "@/app/icons"
import { AchievementForm } from "./achievement-form"
import { AchievementDelete } from "./achievement-delete"

export const dynamic = "force-dynamic"

export default async function AchievementsPage() {
  const rows = await adminGet<AdminAchievementDto[]>("/api/admin/achievements")

  return (
    <main>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow"><Icon name="star" size={12} />الولاء</p>
          <h1 className="display-2 mt-3">الإنجازات</h1>
          <p className="lede mt-2 text-sm">
            إنجازات تُمنح عند بلوغ عدد الطلبات المحدد لكل نوع.
          </p>
        </div>
        <span className="hud-chip"><Icon name="star" size={12} />{rows.length} إنجاز</span>
      </header>

      <details className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-e1">
        <summary className="cursor-pointer list-none text-base font-bold text-ink">إضافة إنجاز</summary>
        <div className="mt-4 max-w-xl">
          <AchievementForm />
        </div>
      </details>

      <section className="mt-6">
        <h2 className="text-base font-bold text-ink">الإنجازات الحالية</h2>

        {rows.length === 0 ? (
          <p className="empty mt-3">لا توجد إنجازات بعد</p>
        ) : (
          <>
            <div className="table-desktop mt-3 overflow-hidden rounded-2xl border border-line">
              <table className="table">
                <thead>
                  <tr>
                    <th>العنوان</th>
                    <th>النوع</th>
                    <th>الهدف</th>
                    <th>الترتيب</th>
                    <th>الحالة</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="font-bold text-ink">{row.title}</span>
                        {row.description ? (
                          <p className="mt-1 text-xs text-muted">{row.description}</p>
                        ) : null}
                      </td>
                      <td>{ACHIEVEMENT_TYPE_LABELS[row.type]}</td>
                      <td><span className="num">{row.target}</span></td>
                      <td><span className="num">{row.sortOrder}</span></td>
                      <td>
                        <span className={row.active ? "badge badge-paid" : "badge badge-expired"}>
                          {row.active ? "مفعّل" : "معطّل"}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <details>
                            <summary className="btn btn-ghost btn-sm inline-flex cursor-pointer list-none">
                              تعديل
                            </summary>
                            <div className="mt-3 rounded-xl border border-line bg-raised/40 p-4">
                              <AchievementForm initial={row} />
                            </div>
                          </details>
                          <AchievementDelete id={row.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-cards mt-3">
              {rows.map((row) => (
                <article key={row.id} className="rounded-2xl border border-line bg-surface p-4 shadow-e1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{row.title}</p>
                      {row.description ? (
                        <p className="mt-1 text-xs text-muted">{row.description}</p>
                      ) : null}
                    </div>
                    <span className={row.active ? "badge badge-paid" : "badge badge-expired"}>
                      {row.active ? "مفعّل" : "معطّل"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                      <p className="card-kicker">النوع</p>
                      <p className="mt-1 text-sm font-bold text-ink">{ACHIEVEMENT_TYPE_LABELS[row.type]}</p>
                    </div>
                    <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                      <p className="card-kicker">الهدف</p>
                      <p className="num mt-1 font-bold text-ink">{row.target}</p>
                    </div>
                    <div className="rounded-xl border border-line bg-raised/50 p-2.5">
                      <p className="card-kicker">الترتيب</p>
                      <p className="num mt-1 font-bold text-ink">{row.sortOrder}</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <details>
                      <summary className="btn btn-ghost btn-sm inline-flex cursor-pointer list-none">
                        تعديل
                      </summary>
                      <div className="mt-3 rounded-xl border border-line bg-raised/40 p-4">
                        <AchievementForm initial={row} />
                      </div>
                    </details>
                    <AchievementDelete id={row.id} />
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
