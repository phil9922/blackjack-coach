/**
 * The real dealing order — two rounds to every seat, then the dealer's up
 * and hole card (see engine/game.ts's `deal`) — happens in one reducer call,
 * so every initial card mounts in the same React commit. This is what turns
 * that into a believable one-at-a-time deal instead of everything landing at
 * once: each card's position in the real order gets a delay before it slides.
 */
export const DEAL_STAGGER_MS = 110

/** Card index 0 or 1 within a hand's *initial* two cards; anything past that
 * (a hit, a double) is already dealt one at a time, so it needs no stagger. */
export function seatDealDelayMs(cardIndex: number, seatIndex: number, totalSeats: number): number {
  if (cardIndex > 1) return 0
  return (cardIndex * totalSeats + seatIndex) * DEAL_STAGGER_MS
}

export function dealerDealDelayMs(cardIndex: number, totalSeats: number): number {
  return (2 * totalSeats + cardIndex) * DEAL_STAGGER_MS
}
