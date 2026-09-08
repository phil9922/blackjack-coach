import { useMemo } from 'react'

const SPARK_COLORS = ['#c9a227', '#faf7ee', '#e8b84a', '#6e2231', '#6fb3d9', '#2c6e54']

/**
 * A short celebration when the player's round settles in the black. Purely
 * decorative and never in the way: pointer events pass straight through it,
 * so "Next hand" is tappable the instant it appears, and GameScreen unmounts
 * it on a timer. The sparks are random on purpose — this is confetti, not the
 * shoe, so it stays well away from the game's seeded RNG.
 */
export function WinBurst({ net, blackjack }: { net: number; blackjack: boolean }) {
  const sparks = useMemo(() => {
    const n = blackjack ? 42 : 26
    return Array.from({ length: n }, (_, i) => ({
      angle: (360 / n) * i + Math.random() * 14,
      dist: (blackjack ? 120 : 90) + Math.random() * 120,
      delay: Math.random() * 140,
      size: 5 + Math.random() * 6,
      color: SPARK_COLORS[i % SPARK_COLORS.length],
    }))
  }, [blackjack])

  return (
    <div className={`win-burst ${blackjack ? 'win-burst--blackjack' : ''}`} aria-hidden="false">
      {sparks.map((s, i) => (
        <i
          key={i}
          className="win-burst__spark"
          style={
            {
              '--a': `${s.angle}deg`,
              '--d': `${s.dist}px`,
              '--dl': `${s.delay}ms`,
              '--s': `${s.size}px`,
              '--c': s.color,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="win-burst__card" role="status" aria-live="polite">
        <span className="win-burst__stamp">{blackjack ? '★ BLACKJACK ★' : 'WINNER'}</span>
        <span className="win-burst__net">+${net}</span>
      </div>
    </div>
  )
}
