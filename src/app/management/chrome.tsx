"use client"
/**
 * Mobile management chrome with a top bar showing title/stats and bottom tab navigation for admin routes.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon, type IconName } from "@/app/icons"
import { ThemeToggle } from "@/app/theme-toggle"
import { t } from "@/i18n/dictionary"
import { SidebarStats } from "./sidebar-stats"
import { brand } from "@/shared/brand"

const tabs: { href: string; label: string; icon: IconName }[] = [
  { href: "/management", label: "اللوحة", icon: "dashboard" },
  { href: "/management/orders", label: "الطلبات", icon: "receipt" },
  { href: "/management/products", label: "المنتجات", icon: "package" },
  { href: "/management/users", label: "المستخدمين", icon: "users" },
  { href: "/management/coins", label: "عمليات شراء العملات", icon: "coins" },
  { href: "/management/settings", label: "الإعدادات", icon: "settings" },
]

function titleFor(pathname: string): string {
  if (pathname.startsWith("/management/users")) return "المستخدمين"
  if (pathname.startsWith("/management/orders")) return "الطلبات"
  if (pathname.startsWith("/management/products")) return "المنتجات"
  if (pathname.startsWith("/management/promos")) return "كوبونات الخصم"
  if (pathname.startsWith("/management/levels")) return "مستويات VIP"
  if (pathname.startsWith("/management/coins")) return "عمليات شراء العملات"
  if (pathname.startsWith("/management/treasury")) return "الخزينة"
  if (pathname.startsWith("/management/settings")) return "الإعدادات"
  return "لوحة التحكم"
}

export function ManagementTopbar() {
  const pathname = usePathname()
  return (
    <div className="lg:hidden">
      <header className="mg-topbar flex-col !h-auto !items-stretch gap-2 py-2">
        <div className="flex items-center gap-3">
          <Link href="/management" className="flex items-center gap-2 font-display text-sm font-extrabold text-ink">
            <img src={brand.logo64} srcSet={`${brand.logo64} 1x, ${brand.logo128} 2x`} alt="" width={47} height={32} decoding="async" className="h-8 w-auto" />
          </Link>
          <span className="hud-chip ms-auto max-w-[45%] truncate">{titleFor(pathname)}</span>
          <ThemeToggle label={t("ar", "theme.toggle")} />
        </div>
        <SidebarStats layout="bar" />
      </header>
    </div>
  )
}

export function ManagementTabs() {
  const pathname = usePathname()
  return (
    <nav className="mg-tabbar" aria-label="إدارة">
      {tabs.map((tab) => {
        const active = tab.href === "/management" ? pathname === "/management" : pathname === tab.href || pathname.startsWith(tab.href + "/")
        return (
          <Link key={tab.href} href={tab.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            <Icon name={tab.icon} size={18} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
