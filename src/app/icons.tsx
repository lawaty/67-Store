/**
 * Defines the named SVG icon set and renders a stroke icon by `IconName`.
 * Icons are decorative, aria-hidden, and sized by the `size` prop.
 */
type IconName =
  | "gem"
  | "bolt"
  | "card"
  | "crypto"
  | "coins"
  | "user"
  | "grid"
  | "settings"
  | "tag"
  | "receipt"
  | "logout"
  | "save"
  | "check"
  | "alert"
  | "chat"
  | "send"
  | "close"
  | "plus"
  | "trash"
  | "shield"
  | "wallet"
  | "dashboard"
  | "users"
  | "package"
  | "sun"
  | "moon"
  | "menu"
  | "chevron-right"
  | "chevron-left"
  | "chevron-down"
  | "search"
  | "home"
  | "help"
  | "flame"
  | "gift"
  | "lock"
  | "clock"
  | "copy"
  | "arrow-right"
  | "globe"
  | "sparkles"
  | "refresh"
  | "check-circle"
  | "chart"
  | "star"
 
const paths: Record<IconName, string> = {
  gem: "M6 3h12l3 6-9 12L3 9l3-6Zm0 0 9 18M6 3l-3 6h18l-3-6M9 9h6",
  bolt: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  card: "M3 6h18v12H3zM3 10h18",
  crypto: "M12 2v20M8 6h6a3 3 0 0 1 0 6H8h7a3 3 0 0 1 0 6H8",
  coins: "M9 4a6 6 0 1 0 0 12A6 6 0 0 0 9 4Zm6 4a6 6 0 1 1 0 12",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 8a8 8 0 0 1 16 0",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3 2 1-2 5-2-1-2 1-1 2h-6l-1-2-2-1-2 1-2-5 2-1V9l-2-1 2-5 2 1 2-1 1-2h6l1 2 2 1 2-1 2 5-2 1Z",
  tag: "M3 12 12 3h9v9l-9 9-9-9Zm13-6h.01",
  receipt: "M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM9 8h6M9 12h6",
  logout: "M9 4H4v16h5M15 8l4 4-4 4M19 12H9",
  save: "M5 3h11l3 3v15H5zM8 3v6h8V3M8 21v-6h8v6",
  check: "M4 12l5 5L20 6",
  alert: "M12 3 2 21h20L12 3ZM12 9v5M12 17h.01",
  chat: "M21 12a8 8 0 0 1-8 8H4l2-4a8 8 0 1 1 15-4Z",
  send: "M4 12 21 4l-7 17-2-7-8-2Z",
  close: "M6 6l12 12M18 6 6 18",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  shield: "M12 3l8 3v6c0 5-3 8-8 9-5-1-8-4-8-9V6l8-3Z",
  wallet: "M3 7h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0 12-3v3M17 13h.01",
  dashboard: "M4 4h16v4H4zM4 10h10v10H4zM16 10h4v10h-4z",
  users: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0M17 12a3 3 0 1 0 0-6m-1 12a5 5 0 0 1 6 0",
  package: "M3 7l9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7M12 11v10",
  sun: "M12 4V2M12 22v-2M4 12H2M22 12h-2M6.3 6.3 4.9 4.9M19.1 19.1l-1.4-1.4M17.7 6.3l1.4-1.4M4.9 19.1l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  moon: "M21 12.8A8.5 8.5 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  "chevron-right": "M9 6l6 6-6 6",
  "chevron-left": "M15 6l-6 6 6 6",
  "chevron-down": "M6 9l6 6 6-6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3",
  home: "M3 11 12 3l9 8M5 9v12h14V9M9 21v-6h6v6",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4h.01M9.5 9a2.5 2.5 0 1 1 4 2c-.8.6-1.5 1-1.5 2v.5",
  flame: "M12 22c4 0 7-2.7 7-6.5 0-3-2-5-3.5-7C14 6 13 3 13 2c-1 3-3 4-4.5 6.5C7 10.5 5 12 5 15.5 5 19.3 8 22 12 22Zm0-3c-1.7 0-3-1.2-3-2.8 0-1.4 1-2.2 1.7-3.2.5-.7.8-1.3.8-2.2 1 1.5 3.5 3 3.5 5.4 0 1.6-1.3 2.8-3 2.8Z",
  gift: "M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7C9 7 7.5 5.8 7.5 4.5A2.5 2.5 0 0 1 12 3a2.5 2.5 0 0 1 4.5 1.5C16.5 5.8 15 7 12 7Z",
  lock: "M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  copy: "M8 8h11v13H8zM5 16H3V3h13v2",
  "arrow-right": "M4 12h16M14 6l6 6-6 6",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18",
  sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
  refresh: "M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M3 4v4h4M21 20v-4h-4",
  "check-circle": "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4l-10 10-3-3",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  star: "M12 3.2 14.7 8.7 20.7 9.6 16.3 13.8 17.4 19.8 12 16.9 6.6 19.8 7.7 13.8 3.3 9.6 9.3 8.7Z",
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export type { IconName }
