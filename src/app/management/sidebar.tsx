"use client"
/**
 * Desktop admin sidebar with navigation links, embedded live stats, and a link back to the store.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@/app/icons"
import { ThemeToggle } from "@/app/theme-toggle"
import { SidebarStats } from "./sidebar-stats"
import { brand } from "@/shared/brand"

const links = [
  { href: "/management", label: "لوحة التحكم", icon: "dashboard" as const },
  { href: "/management/treasury", label: "عمليات الخزينة", icon: "coins" as const },
  { href: "/management/coins", label: "عمليات شراء العملات", icon: "coins" as const },
  { href: "/management/levels", label: "مستويات VIP", icon: "gem" as const },
  { href: "/management/users", label: "المستخدمين", icon: "users" as const },
  { href: "/management/orders", label: "الطلبات", icon: "receipt" as const },
  { href: "/management/products", label: "المنتجات", icon: "package" as const },
  { href: "/management/promos", label: "كوبونات الخصم", icon: "tag" as const },
  { href: "/management/achievements", label: "الإنجازات", icon: "star" as const },
  { href: "/management/settings", label: "الإعدادات", icon: "settings" as const },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <nav className="mg-sidebar" aria-label="إدارة">
      <div className="mb-4 flex items-center gap-2 border-b border-line px-2 pb-4">
        <img src={brand.logo64} srcSet={`${brand.logo64} 1x, ${brand.logo128} 2x`} alt="" width={53} height={36} decoding="async" className="h-9 w-auto" />
        <div className="min-w-0">
          <p className="text-xs text-muted">لوحة الإدارة</p>
        </div>
      </div>

      <SidebarStats />

      <p className="px-3 pb-2 font-mono text-xs uppercase tracking-normal text-muted">القائمة</p>

      {links.map((link) => {
        const active =
          link.href === "/management"
            ? pathname === "/management"
            : pathname === link.href || pathname.startsWith(link.href + "/")
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={link.icon} size={16} />
            <span>{link.label}</span>
          </Link>
        )
      })}

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-3">
        <Link href="/">
          <Icon name="globe" size={16} />
          <span>المتجر</span>
        </Link>
        <ThemeToggle label="تبديل المظهر" />
      </div>
    </nav>
  )
}
