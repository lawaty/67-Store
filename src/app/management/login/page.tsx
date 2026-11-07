/**
 * Admin login page that renders the password form and displays an authentication error when present.
 */
import { signInAdmin } from "./actions"
import { Icon } from "@/app/icons"
import { SubmitButton } from "@/app/submit-button"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10" dir="rtl">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-surface shadow-e2">
        <div className="ember-seam h-1" />
        <div className="p-6 sm:p-8">
          <img src="/logo-64.png" srcSet="/logo-64.png 1x, /logo-128.png 2x" alt="" width={70} height={48} decoding="async" className="h-12 w-auto" />
          <p className="eyebrow mt-5"><Icon name="lock" size={12} />إدارة ٦٧</p>
          <h1 className="display-2 mt-2">دخول لوحة التحكم</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">المنطقة دي لفريق المتجر بس.</p>

          {error ? <div className="alert mt-4">الباسورد غلط.</div> : null}

          <form action={signInAdmin} className="mt-6 stack">
            <div className="field">
              <label htmlFor="password">الباسورد</label>
              <input id="password" type="password" name="password" required autoComplete="current-password" />
            </div>
            <SubmitButton className="btn btn-primary btn-block min-h-12">
              <Icon name="logout" size={15} /> دخول
            </SubmitButton>
          </form>
        </div>
      </div>
    </main>
  )
}
