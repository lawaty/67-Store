/**
 * Root document shell: sets locale metadata, `lang`/`dir`, fonts, and a theme
 * bootstrap script that every route inherits. Renders no page content itself.
 */
import type { ReactNode } from "react"
import "@fontsource-variable/cairo"
import "@fontsource-variable/noto-sans-arabic"
import "@fontsource-variable/space-grotesk"
import "./globals.css"
import { brand } from "@/shared/brand"
import { getLocale } from "@/i18n/server"
import { dirOf, htmlLang } from "@/i18n/locale"
import { t } from "@/i18n/dictionary"
import { FakePaymentsBar } from "./fake-payments-bar"

export async function generateMetadata() {
  const locale = await getLocale()
  return {
    title: brand.name,
    description: t(locale, "meta.description"),
    icons: { icon: brand.icon },
  }
}

const themeScript = `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(dark|light)/);var d=m?m[1]==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()
  const fakePayments = process.env.ALLOW_FAKE_PAYMENTS?.trim().toLowerCase() === "true"
  return (
    <html lang={htmlLang(locale)} dir={dirOf(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={fakePayments ? "has-fake-payments-bar" : undefined}>
        <FakePaymentsBar locale={locale} enabled={fakePayments} />
        {children}
      </body>
    </html>
  )
}