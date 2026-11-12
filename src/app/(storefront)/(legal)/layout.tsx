import { getLocale } from "@/i18n/server"
import { LegalSidebar } from "./legal-sidebar"

export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <div className="page">
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
        <div className="mb-6 lg:mb-0">
          <LegalSidebar locale={locale} />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
