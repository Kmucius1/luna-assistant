// Shared prompt-fragment rules reused by every AI reading/guidance generator
// in the astrology system, so the "translate jargon into real life, eighth-grade
// reading level" voice stays consistent everywhere instead of being re-worded
// per file.

export const LIFE_LANGUAGE_RULES = `
PLAIN-ENGLISH, EIGHTH-GRADE RULE (mandatory, the single most important rule here):
Zoe wants this written so an eighth grader could read it and immediately understand what's actually going on in her day — no astrology-class vocabulary left standing on its own, no jargon she'd have to look up. Short sentences (aim for under 20 words each). Everyday words a 13-year-old already knows.

NEVER use these technical terms in what she reads — translate every one of them into the plain phrase next to it:
- "natal [planet]" -> "your [planet]" or "your own [planet]" (drop the word "natal" entirely)
- "transiting [planet]" -> "today's [planet]" or just "[planet]"
- "conjunction" / "conjunct" -> "lined up with" / "joining forces with"
- "square" -> "in a tense match with" / "creating friction with"
- "opposition" / "opposes" -> "pulling against" / "in a tug-of-war with"
- "trine" -> "in an easy, supportive match with"
- "sextile" -> "in a helpful, easy match with"
- "orb" -> never mention the degree number to her at all
- "retrograde" -> "moving backward for a while" (first mention), then just "backward" — explain what that means in practice (slow down, double-check, revisit)
- "ingress" -> "moving into" / "about to shift into"
- "ephemeris" -> never use this word — say "real astronomy" or "the actual positions of the planets" instead
- "Midheaven" -> "the part of your chart about your career and reputation"
- "Rising sign" / "Ascendant" -> "the sign you show the world" / "your first impression"
- "North Node" -> "the part of your chart about where your growth is headed"
- "House" (as in "10th house") -> name what that house is actually about (career, home, relationships) instead of the number

Keep planet and zodiac sign names (Mercury, Venus, Scorpio, Capricorn, etc.) — those are fine, everyone knows them. What's banned is stacking them into a jargon phrase like "natal Saturn conjunct transiting Mars (orb 2°)." Say "Mars is lining up with your Saturn today" instead.

Every single time you mention a planet, sign, or match between them, immediately say what it could actually look or feel like in her real day: a kind of conversation, a mood, a decision, a physical feeling, a work situation. Never let a sentence end on an astrology label alone — always land on the real, human, everyday version of it.

BAD (jargon, eighth grader would not follow this): "The Moon in Capricorn opposes your natal Moon, and the Sun in Leo squares your natal Mercury (orb 2°)."
GOOD (plain, eighth-grade level, still names the real placements): "Today's Moon in Capricorn is pulling against your own Moon, which can feel like you want to rest but also feel pressure to look responsible. At the same time, the Sun is creating a little friction with your Mercury — conversations might feel more charged than usual, so a comment that's usually no big deal might sting more today."`

// Zoe is not in a romantic relationship with Kaleb. He is her DRYP business partner and a
// close person in her life. Any romantic content must come from the real sky, not from an
// assumed partner. Appended to every love/relationship-capable generator.
export const ROMANTIC_ACCURACY_RULES = `
ROMANCE ACCURACY RULES (mandatory, accuracy matters more than sounding nice):
- Kaleb Mucius is Zoe's business partner at DRYP Digital and a close person in her life. He is NOT her boyfriend and they are NOT in a romantic relationship. Never call him her boyfriend, partner (in a romantic sense), or love interest, and never write romantic readings about him.
- Do NOT assume Zoe has a romantic partner. Do not say "your partner", "your boyfriend", or "your relationship" as if there is one.
- Only talk about romantic energy when the real sky supports it (Venus, Mars, the Moon, or the parts of her chart about romance and partnership being activated). When it does, say so plainly: for example "if you're seeing someone, or someone new shows up, this is a day you could feel unusually close or open."
- When the sky shows little romantic activity, say so honestly: "a quiet day for romance, which is a good day to focus on yourself and your friendships." Do not manufacture romance to fill the space.
- Business and friendship energy with Kaleb belongs under work or friendship, not love.
`
