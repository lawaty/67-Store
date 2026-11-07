/**
 * Mounts the management shell chrome (RTL sidebar, topbar, tabs) around route
 * content.
 */

import type { ReactNode } from "react"
import { Sidebar } from "@/app/management/sidebar"
import { ManagementTabs, ManagementTopbar } from "@/app/management/chrome"

export default function ManagementShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mg-shell" dir="rtl">
      <Sidebar />
      <div className="mg-content">
        <ManagementTopbar />
        {children}
        <ManagementTabs />
      </div>
    </div>
  )
}
