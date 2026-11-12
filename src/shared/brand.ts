// Public, build-time branding values. Each instance sets these in its own .env and rebuilds.
// Next.js only inlines NEXT_PUBLIC_* when accessed as static member expressions (process.env.NEXT_PUBLIC_*).
export const brand = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "67 Store",
  nameAr: process.env.NEXT_PUBLIC_BRAND_NAME_AR || "٦٧ ستور",
  short: process.env.NEXT_PUBLIC_BRAND_SHORT || "67",
  // Component adds the separating space.
  suffix: process.env.NEXT_PUBLIC_BRAND_SUFFIX || "Store",
  coin: process.env.NEXT_PUBLIC_BRAND_COIN || "67 Coins",
  coinAr: process.env.NEXT_PUBLIC_BRAND_COIN_AR || "عملات ٦٧",
  help: process.env.NEXT_PUBLIC_BRAND_HELP || "67 Help",
  helpAr: process.env.NEXT_PUBLIC_BRAND_HELP_AR || "مساعدة ٦٧",
  adminLabel: process.env.NEXT_PUBLIC_BRAND_ADMIN_LABEL || "إدارة ٦٧",
  domain: process.env.NEXT_PUBLIC_BRAND_DOMAIN || "67.store",
  icon: process.env.NEXT_PUBLIC_BRAND_ICON || "/brand-67.png",
  logo64: process.env.NEXT_PUBLIC_BRAND_LOGO_64 || "/logo-64.png",
  logo128: process.env.NEXT_PUBLIC_BRAND_LOGO_128 || "/logo-128.png",
  logo256: process.env.NEXT_PUBLIC_BRAND_LOGO_256 || "/logo-256.png",
  coin64: process.env.NEXT_PUBLIC_BRAND_COIN_64 || "/coin-64.png",
  coin128: process.env.NEXT_PUBLIC_BRAND_COIN_128 || "/coin-128.png",
  coin256: process.env.NEXT_PUBLIC_BRAND_COIN_256 || "/coin-256.png",
} as const
