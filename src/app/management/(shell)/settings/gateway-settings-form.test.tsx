// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

const formStatus = vi.hoisted(() => ({ pending: false }))

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-dom")>()
  return { ...actual, useFormStatus: () => ({ pending: formStatus.pending }) }
})

vi.mock("./actions", () => ({ saveGateways: vi.fn() }))

import { GatewaySettingsForm } from "./gateway-settings-form"

afterEach(() => {
  cleanup()
  formStatus.pending = false
})

describe("GatewaySettingsForm", () => {
  it("renders all five checkbox names with defaultChecked from props and submit label", () => {
    const { container } = render(
      <GatewaySettingsForm
        card={true}
        wallet={false}
        crypto={true}
        coins={false}
        fulfilmentEnabled={true}
      />,
    )

    const names = ["card", "wallet", "crypto", "coins", "fulfilmentEnabled"]
    for (const name of names) {
      const input = container.querySelector<HTMLInputElement>(`input[name="${name}"]`)
      expect(input).not.toBeNull()
      expect(input?.type).toBe("checkbox")
    }

    expect((container.querySelector('input[name="card"]') as HTMLInputElement).defaultChecked).toBe(true)
    expect((container.querySelector('input[name="wallet"]') as HTMLInputElement).defaultChecked).toBe(false)
    expect((container.querySelector('input[name="crypto"]') as HTMLInputElement).defaultChecked).toBe(true)
    expect((container.querySelector('input[name="coins"]') as HTMLInputElement).defaultChecked).toBe(false)
    expect((container.querySelector('input[name="fulfilmentEnabled"]') as HTMLInputElement).defaultChecked).toBe(true)

    expect(screen.getByRole("button", { name: "حفظ" })).toBeTruthy()
  })
})
