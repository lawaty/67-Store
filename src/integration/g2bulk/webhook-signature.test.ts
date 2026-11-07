import { describe, expect, it } from "vitest"
import { verifyWebhookSignature } from "./webhook-signature"
import { createHmac } from "node:crypto"

describe("verifyWebhookSignature", () => {
  it("a correctly signed payload verifies", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = 1700000000 * 1000
    const key = Buffer.from(secret, "base64")
    const content = `${webhookId}.${timestamp}.${body}`
    const sig = createHmac("sha256", key).update(content).digest("base64")
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body, signature: sig, now })
    expect(res).toBe(true)
  })

  it("a v1, prefixed signature verifies", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = 1700000000 * 1000
    const key = Buffer.from(secret, "base64")
    const content = `${webhookId}.${timestamp}.${body}`
    const sig = createHmac("sha256", key).update(content).digest("base64")
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body, signature: `v1,${sig}`, now })
    expect(res).toBe(true)
  })

  it("a tampered body fails", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = 1700000000 * 1000
    const key = Buffer.from(secret, "base64")
    const content = `${webhookId}.${timestamp}.${body}`
    const sig = createHmac("sha256", key).update(content).digest("base64")
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body: '{"event":"failed"}', signature: sig, now })
    expect(res).toBe(false)
  })

  it("a timestamp older than 300 seconds fails", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = (1700000000 + 301) * 1000
    const key = Buffer.from(secret, "base64")
    const content = `${webhookId}.${timestamp}.${body}`
    const sig = createHmac("sha256", key).update(content).digest("base64")
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body, signature: sig, now })
    expect(res).toBe(false)
  })

  it("an empty signature fails", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = 1700000000 * 1000
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body, signature: "", now })
    expect(res).toBe(false)
  })

  it("accepts when one of several v1 signatures matches", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = 1700000000 * 1000
    const key = Buffer.from(secret, "base64")
    const content = `${webhookId}.${timestamp}.${body}`
    const goodSig = createHmac("sha256", key).update(content).digest("base64")
    const badSig = Buffer.from("not-a-valid-signature-but-same-length-padding-xxxxxxxx").toString("base64").slice(0, goodSig.length)
    // pad badSig to same length
    const badPadded = badSig.padEnd(goodSig.length, "A")
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body, signature: `v1,${badPadded},v1,${goodSig}`, now })
    expect(res).toBe(true)
  })

  it("a signature of the wrong length fails without throwing", () => {
    const secret = Buffer.from("supersecret").toString("base64")
    const webhookId = "wh_123"
    const timestamp = "1700000000"
    const body = '{"event":"paid"}'
    const now = 1700000000 * 1000
    const res = verifyWebhookSignature({ secret, webhookId, timestamp, body, signature: "AAAA", now })
    expect(res).toBe(false)
  })
})
