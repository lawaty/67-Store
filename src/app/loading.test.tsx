// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest"
import { render, cleanup } from "@testing-library/react"

import RootLoading from "./loading"
import StorefrontLoading from "./(storefront)/loading"
import ProductsLoading from "./(storefront)/products/loading"
import AccountLoading from "./(storefront)/account/loading"
import AccountProfilesLoading from "./(storefront)/account/profiles/loading"
import LoginLoading from "./(storefront)/account/login/loading"
import RegisterLoading from "./(storefront)/account/register/loading"
import MlbbLoading from "./(storefront)/mlbb/[product]/[method]/loading"
import OrderLoading from "./(storefront)/order/[token]/loading"
import FakeCheckoutLoading from "./(storefront)/checkout/fake/[reference]/loading"
import ManagementLoading from "./management/(shell)/loading"
import ManagementOrdersLoading from "./management/(shell)/orders/loading"
import ManagementProductsLoading from "./management/(shell)/products/loading"
import ManagementPromosLoading from "./management/(shell)/promos/loading"
import ManagementCoinsLoading from "./management/(shell)/coins/loading"
import ManagementTreasuryLoading from "./management/(shell)/treasury/loading"
import ManagementUsersLoading from "./management/(shell)/users/loading"
import ManagementUserLoading from "./management/(shell)/users/[id]/loading"

afterEach(() => {
  cleanup()
})

const loadingModules = [
  ["src/app/loading.tsx", RootLoading],
  ["src/app/(storefront)/loading.tsx", StorefrontLoading],
  ["src/app/(storefront)/products/loading.tsx", ProductsLoading],
  ["src/app/(storefront)/account/loading.tsx", AccountLoading],
  ["src/app/(storefront)/account/profiles/loading.tsx", AccountProfilesLoading],
  ["src/app/(storefront)/account/login/loading.tsx", LoginLoading],
  ["src/app/(storefront)/account/register/loading.tsx", RegisterLoading],
  ["src/app/(storefront)/mlbb/[product]/[method]/loading.tsx", MlbbLoading],
  ["src/app/(storefront)/order/[token]/loading.tsx", OrderLoading],
  ["src/app/(storefront)/checkout/fake/[reference]/loading.tsx", FakeCheckoutLoading],
  ["src/app/management/(shell)/loading.tsx", ManagementLoading],
  ["src/app/management/(shell)/orders/loading.tsx", ManagementOrdersLoading],
  ["src/app/management/(shell)/products/loading.tsx", ManagementProductsLoading],
  ["src/app/management/(shell)/promos/loading.tsx", ManagementPromosLoading],
  ["src/app/management/(shell)/coins/loading.tsx", ManagementCoinsLoading],
  ["src/app/management/(shell)/treasury/loading.tsx", ManagementTreasuryLoading],
  ["src/app/management/(shell)/users/loading.tsx", ManagementUsersLoading],
  ["src/app/management/(shell)/users/[id]/loading.tsx", ManagementUserLoading],
] as const

describe("loading fallbacks", () => {
  for (const [name, Component] of loadingModules) {
    it(`${name} renders a non-interactive busy skeleton`, () => {
      const { container } = render(<Component />)

      expect(container.firstChild).not.toBeNull()

      const status = container.querySelector('[role="status"]')
      expect(status).not.toBeNull()
      expect(status?.getAttribute("aria-busy")).toBe("true")

      expect(container.querySelectorAll(".skeleton").length).toBeGreaterThanOrEqual(2)

      expect(container.querySelector("a, input, select, textarea")).toBeNull()
    })
  }
})
