import tarotDeckData from '@/data/tarot/tarot-deck.json'

export interface TarotCard {
  name: string
  number: number
  suit: 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'
  emoji: string
  keywords: string[]
  upright_meaning: string
  reversed_meaning: string
}

export interface DrawnCard extends TarotCard {
  reversed: boolean
  position?: string
}

export const TAROT_DECK: TarotCard[] = tarotDeckData as TarotCard[]

export function drawCards(n: number): DrawnCard[] {
  const deck = [...TAROT_DECK]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck.slice(0, n).map(card => ({
    ...card,
    reversed: Math.random() < 0.3,
  }))
}
