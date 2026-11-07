/**
 * Composes the customer quote from cost and markup, enforcing a floor so the
 * quoted price never drops below cost in the same currency regime.
 */
import { Money } from "../../shared/money"
import { Markup, sellPrice } from "./pricing"

export function quote(cost: Money, m: Markup): Money {
  const marked = sellPrice(cost, m)
  return marked.minor < cost.minor ? cost : marked
}
