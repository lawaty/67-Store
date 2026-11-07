/**
 * Sandbox implementation of the Distributor port for local sales testing,
 * accepting any non-empty player, completing orders immediately and reporting
 * an ample fixed USD balance so balance checks pass.
 */
import { Distributor } from "../ports/distributor"

const BALANCE_MINOR = 99_999_999

export function createFakeDistributor(): Distributor {
  return {
    async checkPlayer(input) {
      const valid = input.player.userId.trim() !== "" && input.player.serverId.trim() !== ""
      if (valid) {
        return { valid: true, name: "لاعب تجريبي" }
      }
      return { valid: false, name: null }
    },

    async placeOrder(input) {
      return { distributorOrderId: "fake-" + input.orderId, status: "COMPLETED" }
    },

    async getOrder(input) {
      return { distributorOrderId: input.distributorOrderId, status: "COMPLETED" }
    },

    async getBalance() {
      return { balanceMinor: BALANCE_MINOR }
    },
  }
}
