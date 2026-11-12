/**
 * Composition root that wires real infrastructure adapters and application
 * services into a container handed to the API layer via dependency injection.
 */
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { Env } from "./env"
import { createPaymobClient } from "./integration/paymob/client"
import { createPaymobProvider } from "./integration/paymob/provider"
import { ProductRepository } from "@/catalogue"
import { Product } from "@/catalogue"
import { ClientRepository } from "@/accounts"
import { AccountRepository } from "@/accounts"
import { OrderRepository } from "@/ordering"
import { AchievementRepository } from "@/ordering"
import { ActivityRepository } from "@/ordering"
import { LevelAchievementRepository } from "@/ordering"
import { PaymentRepository } from "@/payments"
import { WebhookEventRepository } from "@/payments"
import { SettingsRepository } from "@/shared/settings-repository"
import { AlertRepository } from "@/alerts"

import { GamingProfileRepository } from "@/accounts"
import { WalletRepository } from "@/wallet"
import { DepositRepository } from "@/treasury"
import { createPrismaProductRepository } from "./infrastructure/prisma/product-repository"
import { createPrismaClientRepository } from "./infrastructure/prisma/client-repository"
import { createPrismaAccountRepository } from "./infrastructure/prisma/account-repository"
import { createPrismaOrderRepository } from "./infrastructure/prisma/order-repository"
import { createPrismaAchievementRepository } from "./infrastructure/prisma/achievement-repository"
import { createPrismaActivityRepository } from "./infrastructure/prisma/activity-repository"
import { createPrismaLevelAchievementRepository } from "./infrastructure/prisma/level-achievement-repository"
import { createPrismaPaymentRepository } from "./infrastructure/prisma/payment-repository"
import { createPrismaWebhookEventRepository } from "./infrastructure/prisma/webhook-event-repository"
import { createPrismaSettingsRepository } from "./infrastructure/prisma/settings-repository"

import { createPrismaGamingProfileRepository } from "./infrastructure/prisma/gaming-profile-repository"
import { createPrismaWalletRepository } from "./infrastructure/prisma/wallet-repository"
import { createPrismaDepositRepository } from "./infrastructure/prisma/deposit-repository"
import { createPrismaAlertRepository } from "./infrastructure/prisma/alert-repository"
import { createPrismaCoinSupplyRepository } from "./infrastructure/prisma/coin-supply-repository"
import { createPrismaTreasuryRepositories, createPrismaTreasuryUnitOfWork } from "./infrastructure/prisma/treasury-repository"
import { createPrismaTreasuryReportRepository } from "./infrastructure/prisma/treasury-report-repository"
import { CoinSupplyRepository } from "@/wallet"
import { FundingRepository } from "@/treasury"
import { ReconciliationRepository } from "@/treasury"
import { TreasuryReportRepository } from "@/treasury"
import { ConsumptionRepository } from "@/treasury"
import { createTreasuryService } from "@/treasury"
import { createRecordDeposit } from "@/treasury"
import { createQuoteDeposit } from "@/treasury"
import { WalletFundingRepository } from "@/treasury"
import { createPrismaWalletFundingRepository } from "./infrastructure/prisma/wallet-funding-repository"
import { createStartWalletFunding, createSettleWalletFunding } from "@/treasury"

import { isPriceGuardEnabled, readPriceGuardTolerance } from "@/catalogue"
import { readCoinValueMinor } from "@/treasury"
import { PromoRepository } from "@/promos"
import { createPrismaPromoRepository } from "./infrastructure/prisma/promo-repository"
import { createG2Bulk } from "./integration/g2bulk/client"
import { createG2BulkCatalogue } from "./integration/g2bulk/catalogue-source"
import { createCatalogueSync } from "@/catalogue"
import { createCoinIndexer } from "@/treasury"
import { createPriceCheck } from "@/catalogue"
import type { PriceCheckResult } from "@/catalogue"
import { createPlaceOrder } from "@/ordering"
import { createStartPayment } from "@/payments"
import { createConfirmPayment } from "@/payments"
import { createExpirePayments } from "@/payments"
import { createFakeProvider } from "@/payments"
import { createFakeDistributor } from "@/fulfilment"
import { CatalogueSource } from "@/catalogue"
import { createFulfilOrder } from "@/fulfilment"
import { createSyncFulfilment } from "@/fulfilment"
import { createRefundOrder } from "@/fulfilment"
import { createRetryFailedRefunds } from "@/fulfilment"
import { PaymentProviderName } from "@/payments"
import { PaymentProvider } from "@/payments"
import { Distributor } from "@/fulfilment"
import { createBinanceP2p } from "./integration/binance-p2p/client"
import { createP2pRateReader } from "@/treasury"
import { readRuntimeFlag } from "./shared/runtime-flag"
import { readGatewaySettings, type GatewaySettings } from "@/payments"

export type Container = {
  readonly products: ProductRepository
  readonly clients: ClientRepository
  readonly accounts: AccountRepository
  readonly orders: OrderRepository
  readonly achievements: AchievementRepository
  readonly activity: ActivityRepository
  readonly levelAchievements: LevelAchievementRepository
  readonly payments: PaymentRepository
  readonly webhookEvents: WebhookEventRepository
  readonly settings: SettingsRepository
  readonly gamingProfiles: GamingProfileRepository
  readonly wallets: WalletRepository
  readonly deposits: DepositRepository
  readonly alerts: AlertRepository
  readonly coinSupply: CoinSupplyRepository
  readonly fundings: FundingRepository
  readonly consumptions: ConsumptionRepository
  readonly reconciliations: ReconciliationRepository
  readonly orderReport: TreasuryReportRepository
  readonly promos: PromoRepository
  readonly treasury: ReturnType<typeof createTreasuryService>
  readonly syncCatalogue: (game: string) => Promise<{ synced: number; deactivated: number }>
  readonly checkPrice: (product: Product) => Promise<PriceCheckResult>
  readonly placeOrder: ReturnType<typeof createPlaceOrder>
  readonly startPayment: ReturnType<typeof createStartPayment>
  readonly confirmPayment: ReturnType<typeof createConfirmPayment>
  readonly expirePayments: ReturnType<typeof createExpirePayments>
  readonly fulfilOrder: ReturnType<typeof createFulfilOrder>
  readonly syncFulfilment: ReturnType<typeof createSyncFulfilment>
  readonly refundOrder: ReturnType<typeof createRefundOrder>
  readonly retryFailedRefunds: ReturnType<typeof createRetryFailedRefunds>
  readonly distributor: Distributor
  readonly recordDeposit: ReturnType<typeof createRecordDeposit>
  readonly quoteDeposit: ReturnType<typeof createQuoteDeposit>
  readonly walletFundings: WalletFundingRepository
  readonly startWalletFunding: ReturnType<typeof createStartWalletFunding>
  readonly settleWalletFunding: ReturnType<typeof createSettleWalletFunding>
  readonly p2pRate: ReturnType<typeof createP2pRateReader>
  readonly fakePaymentsEnabled: () => Promise<boolean>
  readonly fakeFulfilmentEnabled: () => boolean
  // Fake rails exist for development only; a real provider mode must not expose them.
  readonly fakeRailsEnabled: () => boolean
  readonly paymentProviderAvailable: (provider: PaymentProviderName) => Promise<boolean>
  readonly gatewaySettings: () => Promise<GatewaySettings>
  readonly liveReady: boolean
}

export function createContainer(env: Env, db: PrismaClient, clock: () => string = () => randomUUID(), now: () => string = () => new Date().toISOString()): Container {
  const products = createPrismaProductRepository(db)
  const clients = createPrismaClientRepository(db)
  const accounts = createPrismaAccountRepository(db)
  const orders = createPrismaOrderRepository(db)
  const achievements = createPrismaAchievementRepository(db)
  const activity = createPrismaActivityRepository(db)
  const levelAchievements = createPrismaLevelAchievementRepository(db)
  const payments = createPrismaPaymentRepository(db)
  const webhookEvents = createPrismaWebhookEventRepository(db)
  const settings = createPrismaSettingsRepository(db)
  const gamingProfiles = createPrismaGamingProfileRepository(db)
  const wallets = createPrismaWalletRepository(db)
  const deposits = createPrismaDepositRepository(db)
  const walletFundings = createPrismaWalletFundingRepository(db)
  const alerts = createPrismaAlertRepository(db)
  const coinSupply = createPrismaCoinSupplyRepository(db)
  const promos = createPrismaPromoRepository(db)
  const treasuryRepos = createPrismaTreasuryRepositories(db)
  const treasuryUnitOfWork = createPrismaTreasuryUnitOfWork(db)
  const treasury = createTreasuryService({ ...treasuryRepos, newId: clock, now, runInTransaction: treasuryUnitOfWork.runInTransaction })
  const orderReport = createPrismaTreasuryReportRepository(db)
  // Two independent fakes. Everything else (catalogue, balance, player checks,
  // treasury, funding gates) uses the real adapters.
  const fakePayments = (): boolean => readRuntimeFlag("fake-payments", env.allowFakePayments)
  const fakeFulfilment = (): boolean => readRuntimeFlag("fake-fulfilment", env.allowFakeFulfilment)

  const fakePaymentsEnabled = async (): Promise<boolean> => fakePayments()
  // Fake payment routes are exposed only while the fake-payments flag is on.
  const fakeRailsEnabled = (): boolean => fakePayments()

  const liveDistributor = createG2Bulk({ baseUrl: env.g2bulkBaseUrl, apiKey: env.g2bulkApiKey })
  const fakeDistributor = createFakeDistributor()
  const pickFulfilmentDistributor = () => (fakeFulfilment() ? fakeDistributor : liveDistributor)
  const distributor: Distributor = {
    checkPlayer: async (input) => liveDistributor.checkPlayer(input),
    placeOrder: async (input) => pickFulfilmentDistributor().placeOrder(input),
    getOrder: async (input) => pickFulfilmentDistributor().getOrder(input),
    getBalance: async () => liveDistributor.getBalance(),
  }
  const liveCatalogueSource = createG2BulkCatalogue({
    baseUrl: env.g2bulkBaseUrl,
    apiKey: env.g2bulkApiKey,
  })
  const catalogueSource: CatalogueSource = async (game) => liveCatalogueSource(game)

  const binanceP2p = createBinanceP2p({ now })
  const p2pRate = createP2pRateReader({ provider: binanceP2p, settings, now })

  const updateCoinIndex = createCoinIndexer({ history: products, settings })
  const syncCatalogue = createCatalogueSync({
    products,
    fetchCatalogue: catalogueSource,
    afterHistory: async () => {
      await updateCoinIndex()
    },
  })
  const placeOrder = createPlaceOrder({ orders, newId: clock, newToken: clock, promos, now, wac: async () => (await treasury.snapshot()).wacEgpMinor })
  const fakeProviders: Record<PaymentProviderName, PaymentProvider> = {
    PAYMOB: createFakeProvider("PAYMOB"),
    CRYPTO: createFakeProvider("CRYPTO"),
    COINS: createFakeProvider("COINS"),
  }

  const parseConfiguredPaymobId = (value: string): number | null => {
    const trimmed = value.trim()
    if (trimmed === "") return null
    const parsed = Number(trimmed)
    return Number.isSafeInteger(parsed) ? parsed : null
  }
  const cardId = parseConfiguredPaymobId(env.paymobIntegrationIdCard)
  const walletId = parseConfiguredPaymobId(env.paymobIntegrationIdWallet)
  const gatewaySettings = (): Promise<GatewaySettings> => readGatewaySettings(settings)

  let liveProvidersCache: Partial<Record<PaymentProviderName, PaymentProvider>> | undefined
  const getLiveProviders = (): Partial<Record<PaymentProviderName, PaymentProvider>> => {
    if (liveProvidersCache) return liveProvidersCache
    if (env.paymentMode === "paymob") {
      if (env.paymobSecretKey.trim() === "" || env.appUrl.trim() === "" || (cardId === null && walletId === null)) {
        throw new Error("Payment provider paymob is not configured")
      }
      const client = createPaymobClient({
        baseUrl: env.paymobBaseUrl,
        secretKey: env.paymobSecretKey,
        publicKey: env.paymobPublicKey,
      })
      liveProvidersCache = {
        PAYMOB: createPaymobProvider({
          client,
          appUrl: env.appUrl,
          newReference: () => `paymob_${randomUUID()}`,
          paymentMethods: async () => {
            const g = await gatewaySettings()
            return [...(g.card && cardId !== null ? [cardId] : []), ...(g.wallet && walletId !== null ? [walletId] : [])]
          },
        }),
      }
      return liveProvidersCache
    }
    if (env.paymentMode === "fake") {
      throw new Error("Payment provider fake is not configured for live mode")
    }
    throw new Error(`Payment provider ${env.paymentMode} is not configured`)
  }

  const providersForMode = async (): Promise<Partial<Record<PaymentProviderName, PaymentProvider>>> =>
    (await fakePaymentsEnabled()) ? fakeProviders : getLiveProviders()

  const paymentProviderAvailable = async (provider: PaymentProviderName): Promise<boolean> => {
    try {
      if ((await providersForMode())[provider] === undefined) return false
      let g: GatewaySettings
      try {
        g = await gatewaySettings()
      } catch {
        return false
      }
      if (provider === "PAYMOB") return g.card || g.wallet
      if (provider === "CRYPTO") return g.crypto
      if (provider === "COINS") return g.coins
      return false
    } catch {
      return false
    }
  }
  function delegatingProvider(name: PaymentProviderName): PaymentProvider {
    return {
      name,
      charge: async (request) => {
        const provider = (await providersForMode())[name]
        if (provider === undefined) throw new Error(`Payment provider ${name} is not available`)
        return provider.charge(request)
      },
      verify: async (reference) => {
        const provider = (await providersForMode())[name]
        if (provider === undefined) throw new Error(`Payment provider ${name} is not available`)
        return provider.verify(reference)
      },
    }
  }
  const providers: Record<PaymentProviderName, PaymentProvider> = {
    PAYMOB: delegatingProvider("PAYMOB"),
    CRYPTO: delegatingProvider("CRYPTO"),
    COINS: delegatingProvider("COINS"),
  }

  const startPayment = createStartPayment({ providers, payments, newId: clock })
  // Serializes payment starts for the same order within this server process, so
  // two concurrent starts cannot both pass the "no pending payment" check and
  // create two provider charges. Multi-instance deployments would still need a
  // database-level lock; this closes the realistic double-submit case.
  const pendingStarts = new Map<string, Promise<unknown>>()
  const startPaymentQueued: ReturnType<typeof createStartPayment> = (input) => {
    const key = input.order.id
    const previous = pendingStarts.get(key) ?? Promise.resolve()
    const run = previous.catch(() => undefined).then(() => startPayment(input))
    const settled = run.then(
      () => undefined,
      () => undefined,
    )
    pendingStarts.set(key, settled)
    settled.then(() => {
      if (pendingStarts.get(key) === settled) pendingStarts.delete(key)
    })
    return run
  }
  const confirmPayment = createConfirmPayment({ payments, orders })
  const expirePayments = createExpirePayments({ payments, now: () => new Date() })
  const refundOrder = createRefundOrder({ orders, wallets, now })
  const retryFailedRefunds = createRetryFailedRefunds({ orders, refund: refundOrder })
  const fulfilOrderBase = createFulfilOrder({ orders, distributor, treasury, refund: refundOrder })
  const fulfilOrder: ReturnType<typeof createFulfilOrder> = async (input) => {
    const g = await gatewaySettings()
    if (!g.fulfilmentEnabled) return input
    return fulfilOrderBase(input)
  }
  const syncFulfilment = createSyncFulfilment({ orders, distributor, treasury, refund: refundOrder })

  const recordedUsdt = async (): Promise<number> => (await treasury.snapshot()).usdtMilli

  const recordDeposit = createRecordDeposit({
    deposits,
    treasury,
    wallets,
    coinSupply,
    recordedUsdt,
    settings,
    coinValueMinor: () => readCoinValueMinor(settings),
    newId: clock,
    now,
  })

  const quoteDeposit = createQuoteDeposit({
    treasury,
    coinSupply,
    recordedUsdt,
    settings,
    coinValueMinor: () => readCoinValueMinor(settings),
  })

  const startWalletFunding = createStartWalletFunding({
    quote: quoteDeposit,
    fundings: walletFundings,
    newId: clock,
    now,
  })

  const settleWalletFunding = createSettleWalletFunding({
    fundings: walletFundings,
    deposits,
    wallets,
    newId: clock,
    now,
  })

  const checkPrice = async (product: Product): Promise<PriceCheckResult> => {
    return createPriceCheck({
      fetchCatalogue: catalogueSource,
      toleranceBasisPoints: await readPriceGuardTolerance(settings),
      enabled: await isPriceGuardEnabled(settings),
      alerts,
    })(product)
  }

  // Fake rails and an empty g2bulk key mean live cannot start a payment/fulfilment.
  const liveReady = (env.allowFakePayments || env.paymentMode !== "fake") && env.g2bulkApiKey.trim() !== ""

  return {
    products,
    clients,
    accounts,
    orders,
    achievements,
    activity,
    levelAchievements,
    payments,
    webhookEvents,
    settings,
    gamingProfiles,
    wallets,
    deposits,
    alerts,
    coinSupply,
    fundings: treasuryRepos.fundings,
    consumptions: treasuryRepos.consumptions,
    reconciliations: treasuryRepos.reconciliations,
    orderReport,
    promos,
    treasury,
    syncCatalogue,
    checkPrice,
    placeOrder,
    startPayment: startPaymentQueued,
    confirmPayment,
    expirePayments,
    fulfilOrder,
    syncFulfilment,
    refundOrder,
    retryFailedRefunds,
    distributor,
    recordDeposit,
    quoteDeposit,
    walletFundings,
    startWalletFunding,
    settleWalletFunding,
    p2pRate,
    fakePaymentsEnabled,
    fakeFulfilmentEnabled: fakeFulfilment,
    fakeRailsEnabled,
    paymentProviderAvailable,
    gatewaySettings,
    liveReady,
  }
}
