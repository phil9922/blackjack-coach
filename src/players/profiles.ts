export type AiProfileId = 'book' | 'average' | 'tourist' | 'superstitious'

export interface AiProfile {
  id: AiProfileId
  name: string
  description: string
  /** chance of a random slip on any decision */
  slipRate: number
  /** probability of taking insurance when offered */
  insuranceRate: number
  neverSurrender: boolean
  neverDoubleSoft: boolean
  alwaysStandSoft18: boolean
  /** hit to 17 like the dealer; never double; split only aces */
  mimicDealer: boolean
  /** "never bust for the table": stand on every hard 12+ */
  neverBust: boolean
  /** probability of splitting tens when dealt a ten pair */
  splitTensRate: number
  /** bet range in units of the table minimum */
  betUnits: { min: number; max: number }
}

export const AI_PROFILES: Record<AiProfileId, AiProfile> = {
  book: {
    id: 'book',
    name: 'By-the-book',
    description: 'Plays near-perfect basic strategy with the odd slip.',
    slipRate: 0.02,
    insuranceRate: 0,
    neverSurrender: false,
    neverDoubleSoft: false,
    alwaysStandSoft18: false,
    mimicDealer: false,
    neverBust: false,
    splitTensRate: 0,
    betUnits: { min: 1, max: 3 },
  },
  average: {
    id: 'average',
    name: 'Average Joe',
    description: 'Knows the rough shape of the book but never surrenders, won\'t double soft hands, and always stands on soft 18.',
    slipRate: 0.08,
    insuranceRate: 0.25,
    neverSurrender: true,
    neverDoubleSoft: true,
    alwaysStandSoft18: true,
    mimicDealer: false,
    neverBust: false,
    splitTensRate: 0,
    betUnits: { min: 1, max: 4 },
  },
  tourist: {
    id: 'tourist',
    name: 'Tourist',
    description: 'Mimics the dealer: hits to 17, never doubles, splits only aces, loves insurance.',
    slipRate: 0.05,
    insuranceRate: 0.6,
    neverSurrender: true,
    neverDoubleSoft: true,
    alwaysStandSoft18: false,
    mimicDealer: true,
    neverBust: false,
    splitTensRate: 0,
    betUnits: { min: 1, max: 2 },
  },
  superstitious: {
    id: 'superstitious',
    name: 'Superstitious',
    description: 'Never "takes the dealer\'s bust card": stands on every stiff, and occasionally splits tens because they\'re "due".',
    slipRate: 0.05,
    insuranceRate: 0.4,
    neverSurrender: true,
    neverDoubleSoft: true,
    alwaysStandSoft18: true,
    mimicDealer: false,
    neverBust: true,
    splitTensRate: 0.15,
    betUnits: { min: 1, max: 5 },
  },
}

export const AI_NAMES = ['Marge', 'Sal', 'Deb', 'Ernie', 'Rosa', 'Chuck', 'Vinny', 'Pearl']
