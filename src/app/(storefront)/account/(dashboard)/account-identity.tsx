import type { AccountIdentityDto } from "@/api/contracts/account"
import { Avatar } from "@/app/avatar"
import type { Locale } from "@/i18n/locale"

export function AccountIdentity({
  identity,
  locale: _locale,
  compact = false,
}: {
  readonly identity: AccountIdentityDto
  readonly locale: Locale
  readonly compact?: boolean
}) {
  return (
    <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3"}>
      <Avatar name={identity.username} size={compact ? "sm" : "md"} />
      <div className="min-w-0">
        <p className={compact ? "truncate text-sm font-bold text-ink" : "truncate font-bold text-ink"}>
          {identity.username}
        </p>
        <p className={compact ? "truncate text-xs text-muted" : "truncate text-sm text-muted"}>{identity.email}</p>
      </div>
    </div>
  )
}
