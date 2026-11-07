/**
 * Declares promo persistence and redemption capabilities, enforcing single-use accounting per redemption with money handled in integer minor units.
 */
import { PromoCode, PromoKind } from "./promo-code"

export type RedeemResult =
  | { readonly ok: true; readonly promo: PromoCode }
  | { readonly ok: false; readonly reason: "unknown" | "inactive" | "expired" | "exhausted" }

export interface PromoRepository {
  create(input: {
    id: string
    code: string
    kind: PromoKind
    basisPoints: number | null
    amountMinor: number | null
    maxUses: number | null
    expiresAt: string | null
  }): Promise<void>
  listAll(): Promise<PromoCode[]>
  setActive(id: string, active: boolean): Promise<void>
  redeem(input: { code: string; orderId: string; clientId: string | null; now: string }): Promise<RedeemResult>
}
