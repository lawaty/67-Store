import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { FakePaymentsBar } from "./fake-payments-bar"

describe("FakePaymentsBar", () => {
  it("renders nothing when disabled", () => {
    expect(renderToStaticMarkup(<FakePaymentsBar locale="en" enabled={false} />)).toBe("")
  })

  it("renders Arabic warning when enabled with locale ar", () => {
    const html = renderToStaticMarkup(<FakePaymentsBar locale="ar" enabled={true} />)
    expect(html).toContain("الدفع التجريبي مفعّل")
    expect(html).toContain('role="status"')
  })

  it("renders English warning when enabled with locale en", () => {
    const html = renderToStaticMarkup(<FakePaymentsBar locale="en" enabled={true} />)
    expect(html).toContain("Fake payments are enabled")
    expect(html).toContain('role="status"')
  })
})
