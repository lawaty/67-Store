/**
 * Public surface of the fulfilment module, re-exporting domain errors, ports,
 * and application use cases.
 */
export * from "./domain/fulfilment-error"
export * from "./ports/distributor"
export * from "./application/fake-distributor"
export * from "./application/fulfil-order"
export * from "./application/refund-order"
export * from "./application/sync-fulfilment"
