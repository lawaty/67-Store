/**
 * Composition root that wires real infrastructure adapters and application
 * services into a container handed to the API layer via dependency injection.
 */
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "node:crypto"
import { Env } from "./env"
import { ProductRepository } from "@/catalogue"
import { Product } from "@/catalogue"
import { ClientRepository } from "@/accounts"
import { AccountRepository } from "@/accounts"
import { OrderRepository } from "@/ordering"
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
import { createPrismaTreasuryRepositories } from "./infrastructure/prisma/treasury-repository"
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
import { ReconciliationRecord } from "@/treasury"
import { createReconcileTreasury } from "@/jobs"
import { readTreasuryTolerance } from "@/treasury"
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
import { createFakeProvider } from "@/payments"
import { createFakeDistributor } from "@/fulfilment"
import { createFakeCatalogueSource } from "./integration/fake/catalogue-source"
import { CatalogueSource } from "@/catalogue"
import { createFulfilOrder } from "@/fulfilment"
import { createSyncFulfilment } from "@/fulfilment"
import { createRefundOrder } from "@/fulfilment"
import { PaymentProviderName } from "@/payments"
import { PaymentProvider } from "@/payments"
import { Distributor } from "@/fulfilment"
import { createBinanceP2p } from "./integration/binance-p2p/client"
import { createP2pRateReader } from "@/treasury"
import { readOperationsMode, type OperationsMode } from "./shared/operations-mode"

export type Container = {
  readonly products: ProductRepository
  readonly clients: ClientRepository
  readonly accounts: AccountRepository
  readonly orders: OrderRepository
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
  readonly fulfilOrder: ReturnType<typeof createFulfilOrder>
  readonly syncFulfilment: ReturnType<typeof createSyncFulfilment>
  readonly distributor: Distributor
  readonly reconcileTreasury: () => Promise<ReconciliationRecord>
  readonly recordDeposit: ReturnType<typeof createRecordDeposit>
  readonly quoteDeposit: ReturnType<typeof createQuoteDeposit>
  readonly walletFundings: WalletFundingRepository
  readonly startWalletFunding: ReturnType<typeof createStartWalletFunding>
  readonly settleWalletFunding: ReturnType<typeof createSettleWalletFunding>
  readonly p2pRate: ReturnType<typeof createP2pRateReader>
  readonly operationsMode: () => Promise<OperationsMode>
  readonly liveReady: boolean
}

export function createContainer(env: Env, db: PrismaClient, clock: () => string = () => randomUUID(), now: () => string = () => new Date().toISOString()): Container {
  const products = createPrismaProductRepository(db)
  const clients = createPrismaClientRepository(db)
  const accounts = createPrismaAccountRepository(db)
  const orders = createPrismaOrderRepository(db)
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
  const treasury = createTreasuryService({ fundings: treasuryRepos.fundings, consumptions: treasuryRepos.consumptions, reconciliations: treasuryRepos.reconciliations, newId: clock, now })
  const orderReport = createPrismaTreasuryReportRepository(db)
  // Single shared reader: later wiring should call this, not read settings directly.
  const operationsMode = (): Promise<OperationsMode> => readOperationsMode(settings, env.operationsMode)

  const liveDistributor = createG2Bulk({ baseUrl: env.g2bulkBaseUrl, apiKey: env.g2bulkApiKey })
  const fakeDistributor = createFakeDistributor()
  const pickDistributor = async () => ((await operationsMode()) === "sandbox" ? fakeDistributor : liveDistributor)
  const distributor: Distributor = {
    checkPlayer: async (input) => (await pickDistributor()).checkPlayer(input),
    placeOrder: async (input) => (await pickDistributor()).placeOrder(input),
    getOrder: async (input) => (await pickDistributor()).getOrder(input),
    getBalance: async () => (await pickDistributor()).getBalance(),
  }
  const liveCatalogueSource = createG2BulkCatalogue({
    baseUrl: env.g2bulkBaseUrl,
    apiKey: env.g2bulkApiKey,
  })
  const fakeCatalogueSource = createFakeCatalogueSource()
  const catalogueSource: CatalogueSource = async (game) =>
    (await operationsMode()) === "sandbox" ? fakeCatalogueSource(game) : liveCatalogueSource(game)

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
    INSTAPAY: createFakeProvider("INSTAPAY"),
    CRYPTO: createFakeProvider("CRYPTO"),
    COINS: createFakeProvider("COINS"),
  }
  let liveProvidersCache: Record<PaymentProviderName, PaymentProvider> | undefined
  const getLiveProviders = (): Record<PaymentProviderName, PaymentProvider> => {
    if (liveProvidersCache) return liveProvidersCache
    if (env.paymentMode === "fake") {
      throw new Error("Payment provider fake is not configured for live mode")
    }
    throw new Error(`Payment provider ${env.paymentMode} is not configured`)
  }
  const providersForMode = async (): Promise<Record<PaymentProviderName, PaymentProvider>> =>
    (await operationsMode()) === "sandbox" ? fakeProviders : getLiveProviders()
  function delegatingProvider(name: PaymentProviderName): PaymentProvider {
    return {
      name,
      charge: async (request) => (await providersForMode())[name].charge(request),
      verify: async (reference) => (await providersForMode())[name].verify(reference),
    }
  }
  const providers: Record<PaymentProviderName, PaymentProvider> = {
    INSTAPAY: delegatingProvider("INSTAPAY"),
    CRYPTO: delegatingProvider("CRYPTO"),
    COINS: delegatingProvider("COINS"),
  }

  const startPayment = createStartPayment({ providers, payments, newId: clock })
  const confirmPayment = createConfirmPayment({ payments, orders })
  const refundOrder = createRefundOrder({ orders, wallets, now })
  const fulfilOrder = createFulfilOrder({ orders, distributor, treasury, refund: refundOrder })
  const syncFulfilment = createSyncFulfilment({ orders, distributor, treasury, refund: refundOrder })
  const reconcileTreasury = async (): Promise<ReconciliationRecord> => {
    const tolerance = await readTreasuryTolerance(settings)
    return createReconcileTreasury({ treasury, distributor, toleranceUsdtMinor: tolerance })()
  }

  // The sandbox has no real treasury, so coverage checks must not block fake deposits.
  const recordedUsdt = async (): Promise<number> => {
    if ((await operationsMode()) === "sandbox") return 99_999_999_999
    return (await treasury.snapshot()).usdtMinor
  }

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
  const liveReady = env.paymentMode !== "fake" && env.g2bulkApiKey.trim() !== ""

  return {
    products,
    clients,
    accounts,
    orders,
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
    startPayment,
    confirmPayment,
    fulfilOrder,
    syncFulfilment,
    distributor,
    reconcileTreasury,
    recordDeposit,
    quoteDeposit,
    walletFundings,
    startWalletFunding,
    settleWalletFunding,
    p2pRate,
    operationsMode,
    liveReady,
  }
}
