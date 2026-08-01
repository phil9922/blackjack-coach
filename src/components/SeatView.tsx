import type { Seat } from '../engine/game'
import { AI_PROFILES } from '../players/profiles'
import { HandView } from './HandView'

export function SeatView({
  seat,
  isActive,
  activeHandIndex,
}: {
  seat: Seat
  isActive: boolean
  activeHandIndex: number
}) {
  const profile = seat.profileId ? AI_PROFILES[seat.profileId] : null
  return (
    <div className={`seat ${seat.kind === 'user' ? 'seat--user' : ''} ${isActive ? 'seat--active' : ''}`}>
      <div className="seat__label">
        <span className="seat__name">{seat.name}</span>
        {profile && <span className="seat__profile">{profile.name}</span>}
        {seat.insurance !== null && seat.insurance > 0 && (
          <span className="seat__insurance">insured ${seat.insurance}</span>
        )}
      </div>
      <div className="seat__hands">
        {seat.hands.map((hand, i) => (
          <HandView key={i} hand={hand} active={isActive && i === activeHandIndex} />
        ))}
      </div>
    </div>
  )
}
