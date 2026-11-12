/**
 * Management route group layout that passes through children with admin metadata and no indexing.
 */
import type { ReactNode } from "react"

export const metadata = {
  title: "الإدارة",
  robots: { index: false, follow: false },
}

export default function ManagementLayout({ children }: { children: ReactNode }) {
  return children
}
