import Anthropic from '@anthropic-ai/sdk'
import type { CoachDigest } from './summary'
import type { CoachError } from './client'

/**
 * The live coach. While the on-demand read (client.ts) writes prose when the
 * player asks for it, this runs quietly every N hands and maintains a running
 * assessment: what's working, what isn't, and what to do about it.
 *
 * Each run is handed the PREVIOUS list plus fresh stats and returns an updated
 * one — so items disappear when the player fixes them instead of piling up.
 */

const MODEL = 'claude-opus-5'

export interface AiCoachItem {
  title: string
  detail: string
}

export interface AiCoachAssessment {
  doingWell: AiCoachItem[]
  needsWork: AiCoachItem[]
  tips: AiCoachItem[]
  /** one sentence worth interrupting play for, or '' */
  alert: string
}

export interface AiCoachState extends AiCoachAssessment {
  updatedAt: number
  handsAtLastRun: number
  decisionsAtLastRun: number
}

const ITEM_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    detail: { type: 'string' },
  },
  required: ['title', 'detail'],
  additionalProperties: false,
}

const ASSESSMENT_SCHEMA = {
  type: 'object',
  properties: {
    doingWell: { type: 'array', items: ITEM_SCHEMA },
    needsWork: { type: 'array', items: ITEM_SCHEMA },
    tips: { type: 'array', items: ITEM_SCHEMA },
    alert: { type: 'string' },
  },
  required: ['doingWell', 'needsWork', 'tips', 'alert'],
  additionalProperties: false,
}

const SYSTEM_PROMPT = `You are a blackjack coach watching one player train, and maintaining a running assessment of their game that updates as they play.

The app grades every decision against basic strategy for its rules (6 decks, dealer hits soft 17, double after split, 3:2 blackjack; late surrender only if the player enabled it) and, in counting mode, against Hi-Lo indices. You are given the player's current stats plus your own previous assessment. Return the updated assessment.

Fill three lists:
- doingWell: parts of their game that are genuinely solid, with the evidence. Only include what the data supports over real volume — do not manufacture encouragement.
- needsWork: patterns that are costing them. A pattern means it repeats — one bad hand is not a pattern. Name the habit, not the individual errors.
- tips: concrete, specific things to do differently, each tied to something in needsWork. A tip they can act on next hand beats a principle.

Rules for maintaining the list across updates:
- Keep it short and stable: at most 4 items per list, ideally 2-3. This is a dashboard they glance at, not a report.
- Carry forward items that are still true, with the same title, so the list doesn't churn between updates. Update the detail if the numbers moved.
- REMOVE items that the recent data shows are fixed. Promote a resolved weakness to doingWell only if the improvement holds up over enough hands.
- Titles are 2-5 words. Details are one or two sentences, plain and specific, using their real hands and numbers.
- Speak to the player as "you".

The alert field interrupts their game, so it has a high bar. Set it to a single sentence ONLY when something is newly worth stopping for — a leak you have just detected that is actively costing them, or a pattern that has clearly worsened. If the assessment is merely an update of what they already saw, return an empty string. Most updates should return an empty string.`

export type LiveResult =
  | { ok: true; assessment: AiCoachAssessment }
  | { ok: false; error: CoachError }

export async function runLiveAnalysis(
  apiKey: string,
  digest: CoachDigest,
  previous: AiCoachAssessment | null
): Promise<LiveResult> {
  if (!apiKey.trim()) return { ok: false, error: { kind: 'no-key' } }

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

  const previousBlock = previous
    ? `Your previous assessment:\n${JSON.stringify(
        { doingWell: previous.doingWell, needsWork: previous.needsWork, tips: previous.tips },
        null,
        2
      )}`
    : 'You have not assessed this player before — this is the first assessment.'

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: 'json_schema', schema: ASSESSMENT_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: `${previousBlock}\n\nTheir stats now:\n${JSON.stringify(digest, null, 2)}`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: { kind: 'refused' } }
    }

    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()

    const parsed = parseAssessment(text)
    if (!parsed) {
      return { ok: false, error: { kind: 'other', message: 'Could not read the coach response.' } }
    }
    return { ok: true, assessment: parsed }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { ok: false, error: { kind: 'auth' } }
    if (err instanceof Anthropic.PermissionDeniedError) return { ok: false, error: { kind: 'auth' } }
    if (err instanceof Anthropic.RateLimitError) return { ok: false, error: { kind: 'rate-limit' } }
    if (err instanceof Anthropic.APIConnectionError) return { ok: false, error: { kind: 'network' } }
    if (err instanceof Anthropic.APIError) {
      return { ok: false, error: { kind: 'other', message: `${err.status}: ${err.message}` } }
    }
    return {
      ok: false,
      error: { kind: 'other', message: err instanceof Error ? err.message : String(err) },
    }
  }
}

/** Defensive parse — the schema constrains the model, but never trust it blindly. */
export function parseAssessment(text: string): AiCoachAssessment | null {
  try {
    const raw = JSON.parse(text) as Partial<AiCoachAssessment>
    const list = (v: unknown): AiCoachItem[] =>
      Array.isArray(v)
        ? v
            .filter(
              (x): x is AiCoachItem =>
                !!x && typeof x === 'object' &&
                typeof (x as AiCoachItem).title === 'string' &&
                typeof (x as AiCoachItem).detail === 'string'
            )
            .slice(0, 4)
        : []
    return {
      doingWell: list(raw.doingWell),
      needsWork: list(raw.needsWork),
      tips: list(raw.tips),
      alert: typeof raw.alert === 'string' ? raw.alert : '',
    }
  } catch {
    return null
  }
}

// --- when to run -------------------------------------------------------------

export type LiveFrequency = 'off' | 'normal' | 'often'

const INTERVAL: Record<Exclude<LiveFrequency, 'off'>, number> = {
  normal: 15,
  often: 8,
}

/** Minimum graded decisions before the coach has anything worth saying. */
export const MIN_DECISIONS = 20

export function shouldRunLive(input: {
  frequency: LiveFrequency
  hasKey: boolean
  handsPlayed: number
  gradedDecisions: number
  busy: boolean
  previous: AiCoachState | null
}): boolean {
  if (input.frequency === 'off' || !input.hasKey || input.busy) return false
  if (input.gradedDecisions < MIN_DECISIONS) return false
  if (!input.previous) return true
  // Needs both new hands AND new graded decisions — idle rounds shouldn't
  // trigger a paid call that has nothing new to look at.
  const newHands = input.handsPlayed - input.previous.handsAtLastRun
  const newDecisions = input.gradedDecisions - input.previous.decisionsAtLastRun
  return newHands >= INTERVAL[input.frequency] && newDecisions > 0
}
