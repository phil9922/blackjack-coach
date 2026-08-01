import Anthropic from '@anthropic-ai/sdk'
import type { CoachDigest } from './summary'

/**
 * The optional AI coach. Everything else in this app is offline and
 * deterministic; this is the one feature that talks to a service, using the
 * user's own Claude API key, and only when they press the button.
 */

const MODEL = 'claude-opus-5'

const SYSTEM_PROMPT = `You are a blackjack coach reading a training app's record of one player's play. You are talking to that player.

The app already grades every decision against basic strategy for its rules (6 decks, dealer hits soft 17, double after split, blackjack pays 3:2; late surrender only when the player enables it) and, in card-counting mode, against Hi-Lo indices. Your job is not to re-grade decisions or restate the chart — it is to read the pattern across their whole record and tell them what it means.

How to read the data:
- **Group cells into concepts.** everyMissedSpot lists every hand they've misplayed, including one-offs. One miss each across eight soft-double cells is a real pattern even though no single cell repeats — that is a whole row of the chart, and it is far more useful to them than any individual cell. Look for those shapes before you look at counts.
- **Name the instinct, not the error.** The valuable output is the mental model producing the mistakes. "You protect hands that look decent instead of pressing them" explains a dozen missed soft doubles at once; listing the twelve does not.
- **Separate not-knowing from over-applying.** actionBreakdown distinguishes plays they failed to make from plays they made when they shouldn't have. A player who has just learned to double more will start doubling hands too weak to double — that is a half-learned rule, not a gap, and it needs the missing half of the condition, not more encouragement to double.
- **Take their strengths as seriously as their leaks**, with the same specificity. Where the data shows a genuinely solid part of their game, say what it is and what it means they can stop worrying about. Do not manufacture praise where the volume isn't there.
- **Raw accuracy is a weak signal.** Where the mistakes cluster matters far more than the percentage. Say so if the number is misleading.
- **Be honest about variance.** Losing hands is not the same as playing badly; worstMatchups includes what perfect play would expect, so use it and don't send them to fix something that isn't broken.
- Give them one concrete thing to work on next, and say why that one.
- If the data is thin or the patterns are weak, say so plainly instead of manufacturing insight.

The house rules are in the digest's own terms — this is an H17 game, so if you cite a specific correct play, be careful: 11 doubles against an ace, A,7 doubles against a 2, and A,8 doubles against a 6 here. When unsure of a specific cell, describe the pattern instead of quoting a rule.

Voice: direct, specific, and warm — a good coach who respects the player. Use the real hands and numbers from their record. No preamble, no flattery, no restating their stats back to them as a summary.

Format: 200-350 words of plain prose. Short paragraphs. You may use at most two "## " headings if the read genuinely splits in two. No bullet lists, no tables, no markdown emphasis. Keep it focused and readable — this is meant to be read once, at a glance, not studied.`

export type CoachError =
  | { kind: 'no-key' }
  | { kind: 'auth' }
  | { kind: 'rate-limit' }
  | { kind: 'network' }
  | { kind: 'refused' }
  | { kind: 'other'; message: string }

export type CoachResult = { ok: true; text: string } | { ok: false; error: CoachError }

export async function requestCoachRead(
  apiKey: string,
  digest: CoachDigest
): Promise<CoachResult> {
  if (!apiKey.trim()) return { ok: false, error: { kind: 'no-key' } }

  const client = new Anthropic({
    apiKey,
    // This app has no backend, so the call goes straight from the page.
    dangerouslyAllowBrowser: true,
  })

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      // Thinking is on by default on this model and shares the ceiling with
      // the response text, so leave room for both.
      max_tokens: 16000,
      // If safety classifiers decline the request, fall back automatically
      // rather than handing the player an error.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is my training record. Give me your read.\n\n${JSON.stringify(digest, null, 2)}`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: { kind: 'refused' } }
    }

    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim()

    if (!text) return { ok: false, error: { kind: 'other', message: 'Empty response.' } }
    return { ok: true, text }
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

export const COACH_ERROR_TEXT: Record<CoachError['kind'], string> = {
  'no-key': 'Add your Claude API key in Settings to use the AI coach.',
  auth: 'That API key was rejected. Check it in Settings — it should start with "sk-ant-".',
  'rate-limit': 'Claude is rate-limiting this key right now. Wait a moment and try again.',
  network:
    "Couldn't reach the Claude API. Check your connection — this feature is the one part of the app that needs it.",
  refused: 'Claude declined to answer this one. Nothing is wrong with your key or your stats.',
  other: '',
}
