export type Rank =
  "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K" | "A";
export type Suit = "c" | "d" | "h" | "s";
export type Card = `${Rank}${Suit}`;
export type Street = "flop" | "turn" | "river";

export type DeckShuffler = (unshuffledDeck: readonly Card[]) => readonly Card[];

declare const custodyStateBrand: unique symbol;

export type CustodyState = {
  readonly [custodyStateBrand]: "CardCustodyState";
};

interface InternalCustodyState {
  readonly board: readonly Card[];
  readonly deck: readonly Card[];
  readonly holeCardsBySeat: Readonly<Record<string, readonly Card[]>>;
  readonly nextCardIndex: number;
  readonly shownSeatIds: readonly string[];
}

export interface CardCustody {
  boardCards(state: CustodyState): readonly Card[];
  revealStreet(state: CustodyState, street: Street): CustodyState;
  seatCards(state: CustodyState, seatId: string): readonly Card[] | undefined;
  shownCards(state: CustodyState): Readonly<Record<string, readonly Card[]>>;
  showSeat(state: CustodyState, seatId: string): CustodyState;
  startHand(seatIds: readonly string[]): CustodyState;
}

const ranks: readonly Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];
const suits: readonly Suit[] = ["c", "d", "h", "s"];

const standardDeck: readonly Card[] = suits.flatMap((suit) =>
  ranks.map((rank) => `${rank}${suit}` as Card),
);
const standardDeckSet = new Set(standardDeck);

function randomIndex(maxExclusive: number): number {
  const rejectionLimit = 256 - (256 % maxExclusive);
  const byte = new Uint8Array(1);
  do {
    globalThis.crypto.getRandomValues(byte);
  } while ((byte[0] ?? 256) >= rejectionLimit);
  return (byte[0] ?? 0) % maxExclusive;
}

function secureShuffle(unshuffledDeck: readonly Card[]): readonly Card[] {
  const deck = [...unshuffledDeck];
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [deck[index], deck[swapIndex]] = [
      deck[swapIndex] as Card,
      deck[index] as Card,
    ];
  }
  return deck;
}

function validateDeck(deck: readonly Card[]): void {
  if (deck.length !== standardDeck.length)
    throw new Error("A shuffled deck must contain exactly 52 cards.");
  const unique = new Set(deck);
  if (
    unique.size !== deck.length ||
    deck.some((card) => !standardDeckSet.has(card))
  ) {
    throw new Error(
      "A shuffled deck must be a permutation of the standard deck.",
    );
  }
}

function takeCards(
  state: InternalCustodyState,
  count: number,
): [readonly Card[], number] {
  const cards = state.deck.slice(
    state.nextCardIndex,
    state.nextCardIndex + count,
  );
  if (cards.length !== count)
    throw new Error("The deck does not contain enough cards.");
  return [cards, state.nextCardIndex + count];
}

function toInternal(state: CustodyState): InternalCustodyState {
  return state as unknown as InternalCustodyState;
}

function toOpaque(state: InternalCustodyState): CustodyState {
  return state as unknown as CustodyState;
}

export function createCardCustody(
  options: { readonly shuffler?: DeckShuffler } = {},
): CardCustody {
  const shuffler = options.shuffler ?? secureShuffle;

  return {
    boardCards(state) {
      return [...toInternal(state).board];
    },
    revealStreet(state, street) {
      const current = toInternal(state);
      const revealCount = street === "flop" ? 3 : 1;
      const [, afterBurn] = takeCards(current, 1);
      const withBurn = { ...current, nextCardIndex: afterBurn };
      const [revealed, nextCardIndex] = takeCards(withBurn, revealCount);
      return toOpaque({
        ...current,
        board: [...current.board, ...revealed],
        nextCardIndex,
      });
    },
    seatCards(state, seatId) {
      const cards = toInternal(state).holeCardsBySeat[seatId];
      return cards ? [...cards] : undefined;
    },
    shownCards(state) {
      const current = toInternal(state);
      return Object.fromEntries(
        current.shownSeatIds.map((seatId) => [
          seatId,
          [...(current.holeCardsBySeat[seatId] ?? [])],
        ]),
      );
    },
    showSeat(state, seatId) {
      const current = toInternal(state);
      if (!current.holeCardsBySeat[seatId])
        throw new Error("Cannot show cards for a seat outside this hand.");
      if (current.shownSeatIds.includes(seatId)) return state;
      return toOpaque({
        ...current,
        shownSeatIds: [...current.shownSeatIds, seatId],
      });
    },
    startHand(seatIds) {
      if (seatIds.length < 2 || seatIds.length > 10)
        throw new Error("A hand requires 2–10 seats.");
      if (new Set(seatIds).size !== seatIds.length)
        throw new Error("Seat IDs must be unique.");
      const deck = [...shuffler(standardDeck)];
      validateDeck(deck);
      const holeCardsBySeat: Record<string, Card[]> = Object.fromEntries(
        seatIds.map((seatId) => [seatId, []]),
      );
      let nextCardIndex = 0;
      for (let round = 0; round < 2; round += 1) {
        for (const seatId of seatIds) {
          const card = deck[nextCardIndex];
          if (!card)
            throw new Error("The deck ended while dealing hole cards.");
          holeCardsBySeat[seatId]?.push(card);
          nextCardIndex += 1;
        }
      }
      return toOpaque({
        board: [],
        deck,
        holeCardsBySeat,
        nextCardIndex,
        shownSeatIds: [],
      });
    },
  };
}
