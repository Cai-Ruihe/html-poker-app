import type {
  Card,
  CardCustody,
  CustodyState,
  Rank,
  Street,
} from "@html-poker/card-custody";
import type { AtomicTableStore, CommitResult } from "@html-poker/persistence";

export interface SeatDefinition {
  readonly displayName: string;
  readonly seatId: string;
}

type HostActor = { readonly actorId: string; readonly kind: "trusted-host" };
type SeatActor = { readonly kind: "seat"; readonly seatId: string };
export type Actor = HostActor | SeatActor;

export type CommandPayload =
  | {
      readonly dealerSeatId: string;
      readonly seats: readonly SeatDefinition[];
      readonly type: "CreateTable";
    }
  | { readonly type: "StartHand" }
  | { readonly street: Street; readonly type: "RevealStreet" }
  | { readonly type: "FoldCards" }
  | { readonly type: "RetractFold" }
  | { readonly type: "FinalizeFold" }
  | { readonly type: "ShowCards" }
  | { readonly type: "MuckCards" }
  | { readonly type: "EndHand" }
  | { readonly dealerSeatId: string; readonly type: "RelocateDealer" }
  | { readonly reason: string; readonly type: "VoidHand" }
  | { readonly seat: SeatDefinition; readonly type: "RegisterSeat" }
  | {
      readonly seatId: string;
      readonly sittingOut: boolean;
      readonly type: "SetSeatParticipation";
    }
  | {
      readonly correctedEventIds: readonly string[];
      readonly reason: string;
      readonly type: "RecordCorrection";
    };

export interface CommandEnvelope {
  readonly actor: Actor;
  readonly authorityEpoch: string;
  readonly commandId: string;
  readonly expectedRevision: number;
  readonly handId?: string;
  readonly payload: CommandPayload;
  readonly tableId: string;
}

export type RejectionCode =
  | "authority-mismatch"
  | "command-not-allowed"
  | "hand-mismatch"
  | "idempotency-conflict"
  | "persistence-failed"
  | "revision-conflict"
  | "table-mismatch";

export type EventType =
  | "TableCreated"
  | "HandStarted"
  | "StreetRevealed"
  | "FoldStarted"
  | "FoldRetracted"
  | "FoldFinalized"
  | "CardsShown"
  | "CardsMucked"
  | "HandEnded"
  | "DealerRelocated"
  | "HandVoided"
  | "CorrectionRecorded"
  | "SeatRegistered"
  | "SeatParticipationChanged";

export interface EventSummary {
  readonly type: EventType;
}

export interface TableEvent extends EventSummary {
  readonly commandId: string;
  readonly correctedEventIds?: readonly string[];
  readonly dealerSeatId?: string;
  readonly eventId: string;
  readonly handId?: string;
  readonly reason?: string;
  readonly revision: number;
  readonly seatId?: string;
  readonly sittingOut?: boolean;
}

export interface AcceptedReceipt {
  readonly events: readonly EventSummary[];
  readonly handId?: string;
  readonly revision: number;
  readonly status: "accepted";
}

export interface RejectedReceipt {
  readonly code: RejectionCode;
  readonly revision: number;
  readonly status: "rejected";
}

export type CommandReceipt = AcceptedReceipt | RejectedReceipt;
export type HandPhase =
  "lobby" | "preflop" | "flop" | "turn" | "river" | "complete";

export type SeatHandStatus =
  | "active"
  | "waiting"
  | "sitting-out"
  | "folded-provisional"
  | "folded"
  | "shown"
  | "mucked";

interface SeatState extends SeatDefinition {
  readonly sittingOutNextHand: boolean;
  readonly status: SeatHandStatus;
}

interface AcceptedCommand {
  readonly fingerprint: string;
  readonly receipt: AcceptedReceipt;
}

export interface PersistedAuthorityState {
  readonly acceptedCommands: Readonly<Record<string, AcceptedCommand>>;
  readonly authorityEpoch: string;
  readonly custody?: CustodyState;
  readonly dealerSeatId: string;
  readonly handId?: string;
  readonly history: readonly TableEvent[];
  readonly phase: HandPhase;
  readonly revision: number;
  readonly schemaVersion: 1;
  readonly seats: readonly SeatState[];
  readonly tableId: string;
}

export type HandCategory =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export interface HandEvaluation {
  readonly category: HandCategory;
  readonly label: string;
  readonly score: readonly number[];
}

export interface ProjectedSeat {
  readonly displayName: string;
  readonly evaluation?: HandEvaluation;
  readonly holeCards?: readonly Card[];
  readonly seatId: string;
  readonly status: SeatHandStatus;
}

export interface ShowdownProjection {
  readonly evaluatedSeatIds: readonly string[];
  readonly leaders: readonly string[];
  readonly status: "partial" | "complete";
}

export interface PublicProjection {
  readonly board: readonly Card[];
  readonly dealerSeatId: string;
  readonly handId?: string;
  readonly phase: HandPhase;
  readonly revision: number;
  readonly seats: readonly ProjectedSeat[];
  readonly showdown?: ShowdownProjection;
  readonly tableId: string;
  readonly view: "public";
}

export interface SeatProjection extends Omit<PublicProjection, "view"> {
  readonly self: {
    readonly holeCards: readonly Card[];
    readonly seatId: string;
    readonly status: SeatHandStatus;
  };
  readonly view: "seat";
}

export type ProjectionTarget =
  | { readonly kind: "public" }
  | { readonly kind: "seat"; readonly seatId: string };

export interface TrustedHostAuthority {
  history(): readonly TableEvent[];
  project(target: ProjectionTarget): PublicProjection | SeatProjection;
  recover(): Promise<RecoveryResult>;
  submit(command: CommandEnvelope): Promise<CommandReceipt>;
}

export type RecoveryResult =
  | { readonly status: "empty" }
  | { readonly revision: number; readonly status: "recovered" }
  | {
      readonly code: "already-active" | "corrupt-state";
      readonly status: "rejected";
    };

export interface TrustedHostAuthorityOptions {
  readonly authorityEpoch: string;
  readonly custody: CardCustody;
  readonly handIdFactory: () => string;
  readonly store: AtomicTableStore<PersistedAuthorityState>;
  readonly tableId: string;
}

const rankValue: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  A: 14,
  J: 11,
  K: 13,
  Q: 12,
  T: 10,
};

const categoryDetails: ReadonlyArray<
  readonly [category: HandCategory, label: string]
> = [
  ["high-card", "High card"],
  ["pair", "One pair"],
  ["two-pair", "Two pair"],
  ["three-of-a-kind", "Three of a kind"],
  ["straight", "Straight"],
  ["flush", "Flush"],
  ["full-house", "Full house"],
  ["four-of-a-kind", "Four of a kind"],
  ["straight-flush", "Straight flush"],
];

function isHost(actor: Actor): actor is HostActor {
  return actor.kind === "trusted-host";
}

function rejected(code: RejectionCode, revision: number): RejectedReceipt {
  return { code, revision, status: "rejected" };
}

function expectedStreet(phase: HandPhase): Street | undefined {
  if (phase === "preflop") return "flop";
  if (phase === "flop") return "turn";
  if (phase === "turn") return "river";
  return undefined;
}

function commandFingerprint(command: CommandEnvelope): string {
  return JSON.stringify({
    actor: command.actor,
    handId: command.handId ?? null,
    payload: command.payload,
  });
}

function compareScores(
  left: readonly number[],
  right: readonly number[],
): number {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function fiveCardScore(cards: readonly Card[]): readonly number[] {
  const values = cards.map((card) => rankValue[card[0] as Rank]);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || rightValue - leftValue,
  );
  const uniqueDescending = [...counts.keys()].sort((a, b) => b - a);
  const straightValues = uniqueDescending.includes(14)
    ? [...uniqueDescending, 1]
    : uniqueDescending;
  let straightHigh = 0;
  for (let index = 0; index <= straightValues.length - 5; index += 1) {
    const window = straightValues.slice(index, index + 5);
    const high = window[0] ?? 0;
    if (window.every((value, offset) => value === high - offset)) {
      straightHigh = high;
      break;
    }
  }
  const flush = new Set(cards.map((card) => card[1])).size === 1;
  if (flush && straightHigh) return [8, straightHigh];

  const four = groups.find(([, count]) => count === 4);
  if (four) {
    const fourValue = four[0];
    return [7, fourValue, ...uniqueDescending.filter((v) => v !== fourValue)];
  }
  const three = groups.find(([, count]) => count === 3);
  const pair = groups.find(([, count]) => count === 2);
  if (three && pair) return [6, three[0], pair[0]];
  if (flush) return [5, ...uniqueDescending];
  if (straightHigh) return [4, straightHigh];
  if (three) {
    return [
      3,
      three[0],
      ...uniqueDescending.filter((value) => value !== three[0]),
    ];
  }
  const pairs = groups
    .filter(([, count]) => count === 2)
    .map(([value]) => value)
    .sort((a, b) => b - a);
  if (pairs.length >= 2) {
    const highPair = pairs[0] ?? 0;
    const lowPair = pairs[1] ?? 0;
    const kicker = uniqueDescending.find(
      (value) => value !== highPair && value !== lowPair,
    );
    return [2, highPair, lowPair, kicker ?? 0];
  }
  if (pair) {
    return [
      1,
      pair[0],
      ...uniqueDescending.filter((value) => value !== pair[0]),
    ];
  }
  return [0, ...uniqueDescending];
}

function combinations<T>(values: readonly T[], count: number): readonly T[][] {
  const output: T[][] = [];
  function visit(start: number, selected: T[]): void {
    if (selected.length === count) {
      output.push([...selected]);
      return;
    }
    for (
      let index = start;
      index <= values.length - (count - selected.length);
      index += 1
    ) {
      const value = values[index];
      if (value === undefined) continue;
      selected.push(value);
      visit(index + 1, selected);
      selected.pop();
    }
  }
  visit(0, []);
  return output;
}

export function evaluateTexasHoldem(
  cards: readonly Card[],
): HandEvaluation | undefined {
  if (cards.length < 5 || cards.length > 7) return undefined;
  let best: readonly number[] | undefined;
  for (const candidate of combinations(cards, 5)) {
    const score = fiveCardScore(candidate);
    if (!best || compareScores(score, best) > 0) best = score;
  }
  if (!best) return undefined;
  const details = categoryDetails[best[0] ?? 0] ?? categoryDetails[0];
  if (!details) return undefined;
  return { category: details[0], label: details[1], score: [...best] };
}

function finalizeProvisionalSeats(seats: readonly SeatState[]): {
  readonly changed: boolean;
  readonly seats: readonly SeatState[];
} {
  let changed = false;
  const finalized = seats.map((seat) => {
    if (seat.status !== "folded-provisional") return seat;
    changed = true;
    return { ...seat, status: "folded" as const };
  });
  return { changed, seats: finalized };
}

function appendHistory(
  state: PersistedAuthorityState,
  command: CommandEnvelope,
  eventSummaries: readonly EventSummary[],
): PersistedAuthorityState {
  const entries = eventSummaries.map((event, index): TableEvent => {
    const correctionDetails =
      command.payload.type === "RecordCorrection" &&
      event.type === "CorrectionRecorded"
        ? {
            correctedEventIds: [...command.payload.correctedEventIds],
            reason: command.payload.reason.trim(),
          }
        : {};
    const relocationDetails =
      command.payload.type === "RelocateDealer" &&
      event.type === "DealerRelocated"
        ? { dealerSeatId: command.payload.dealerSeatId }
        : {};
    const voidDetails =
      command.payload.type === "VoidHand" && event.type === "HandVoided"
        ? { reason: command.payload.reason.trim() }
        : {};
    const seatDetails =
      command.payload.type === "RegisterSeat" && event.type === "SeatRegistered"
        ? { seatId: command.payload.seat.seatId }
        : command.payload.type === "SetSeatParticipation" &&
            event.type === "SeatParticipationChanged"
          ? {
              seatId: command.payload.seatId,
              sittingOut: command.payload.sittingOut,
            }
          : {};
    return {
      commandId: command.commandId,
      ...correctionDetails,
      ...relocationDetails,
      eventId: `${command.commandId}:${state.revision}:${index}`,
      ...(state.handId ? { handId: state.handId } : {}),
      revision: state.revision,
      ...seatDetails,
      type: event.type,
      ...voidDetails,
    };
  });
  return { ...state, history: [...state.history, ...entries] };
}

export function createTrustedHostAuthority(
  options: TrustedHostAuthorityOptions,
): TrustedHostAuthority {
  let current: PersistedAuthorityState | undefined;

  function history(): readonly TableEvent[] {
    return current ? structuredClone(current.history) : [];
  }

  async function recover(): Promise<RecoveryResult> {
    if (current) return { code: "already-active", status: "rejected" };
    let loaded;
    try {
      loaded = await options.store.load();
    } catch {
      return { code: "corrupt-state", status: "rejected" };
    }
    if (!loaded) return { status: "empty" };
    const state = loaded.state;
    const valid =
      loaded.revision === state.revision &&
      state.schemaVersion === 1 &&
      state.tableId === options.tableId &&
      state.authorityEpoch === options.authorityEpoch &&
      state.seats.length >= 2 &&
      state.seats.length <= 10 &&
      state.history.every(
        (event) => event.revision >= 1 && event.revision <= state.revision,
      ) &&
      Object.values(state.acceptedCommands).every(
        (command) => command.receipt.revision <= state.revision,
      );
    if (!valid) return { code: "corrupt-state", status: "rejected" };
    current = structuredClone(state);
    return { revision: state.revision, status: "recovered" };
  }

  function project(
    target: ProjectionTarget,
  ): PublicProjection | SeatProjection {
    if (!current) throw new Error("The table has not been created.");
    const shownCards = current.custody
      ? options.custody.shownCards(current.custody)
      : {};
    const board = current.custody
      ? options.custody.boardCards(current.custody)
      : [];
    const projectedSeats: ProjectedSeat[] = current.seats.map((seat) => {
      const exposedCards = shownCards[seat.seatId];
      const evaluation = exposedCards
        ? evaluateTexasHoldem([...board, ...exposedCards])
        : undefined;
      return {
        displayName: seat.displayName,
        ...(evaluation ? { evaluation } : {}),
        ...(exposedCards ? { holeCards: [...exposedCards] } : {}),
        seatId: seat.seatId,
        status: seat.status,
      };
    });
    const evaluatedSeats = projectedSeats.filter(
      (seat): seat is ProjectedSeat & { readonly evaluation: HandEvaluation } =>
        seat.evaluation !== undefined,
    );
    let showdown: ShowdownProjection | undefined;
    if (evaluatedSeats.length > 0) {
      let leaders: string[] = [];
      let leadingScore: readonly number[] | undefined;
      for (const seat of evaluatedSeats) {
        if (
          !leadingScore ||
          compareScores(seat.evaluation.score, leadingScore) > 0
        ) {
          leaders = [seat.seatId];
          leadingScore = seat.evaluation.score;
        } else if (compareScores(seat.evaluation.score, leadingScore) === 0) {
          leaders.push(seat.seatId);
        }
      }
      const unresolvedContender = projectedSeats.some((seat) =>
        ["active", "folded-provisional"].includes(seat.status),
      );
      showdown = {
        evaluatedSeatIds: evaluatedSeats.map((seat) => seat.seatId),
        leaders,
        status: unresolvedContender ? "partial" : "complete",
      };
    }
    const publicProjection: PublicProjection = {
      board: [...board],
      dealerSeatId: current.dealerSeatId,
      ...(current.handId ? { handId: current.handId } : {}),
      phase: current.phase,
      revision: current.revision,
      seats: projectedSeats,
      ...(showdown ? { showdown } : {}),
      tableId: options.tableId,
      view: "public",
    };
    if (target.kind === "public") return publicProjection;
    const holeCards = current.custody
      ? options.custody.seatCards(current.custody, target.seatId)
      : undefined;
    const seat = current.seats.find(
      (candidate) => candidate.seatId === target.seatId,
    );
    if (!holeCards || !seat)
      throw new Error("The requested seat is not active in this hand.");
    return {
      ...publicProjection,
      self: {
        holeCards: [...holeCards],
        seatId: target.seatId,
        status: seat.status,
      },
      view: "seat",
    };
  }

  async function submit(command: CommandEnvelope): Promise<CommandReceipt> {
    const revision = current?.revision ?? 0;
    if (command.tableId !== options.tableId)
      return rejected("table-mismatch", revision);
    if (command.authorityEpoch !== options.authorityEpoch)
      return rejected("authority-mismatch", revision);
    const fingerprint = commandFingerprint(command);
    const previousCommand = current?.acceptedCommands[command.commandId];
    if (previousCommand) {
      return previousCommand.fingerprint === fingerprint
        ? previousCommand.receipt
        : rejected("idempotency-conflict", revision);
    }
    if (command.expectedRevision !== revision)
      return rejected("revision-conflict", revision);
    const isHandScoped = [
      "RevealStreet",
      "FoldCards",
      "RetractFold",
      "FinalizeFold",
      "ShowCards",
      "MuckCards",
      "EndHand",
      "VoidHand",
    ].includes(command.payload.type);
    if (isHandScoped && current?.handId !== command.handId) {
      return rejected("hand-mismatch", revision);
    }

    let next: PersistedAuthorityState | undefined;
    let events: readonly EventSummary[] = [];

    switch (command.payload.type) {
      case "CreateTable": {
        if (current || !isHost(command.actor))
          return rejected("command-not-allowed", revision);
        const uniqueSeats = new Set(
          command.payload.seats.map((seat) => seat.seatId),
        );
        if (
          command.payload.seats.length < 2 ||
          command.payload.seats.length > 10 ||
          uniqueSeats.size !== command.payload.seats.length ||
          !uniqueSeats.has(command.payload.dealerSeatId)
        ) {
          return rejected("command-not-allowed", revision);
        }
        next = {
          acceptedCommands: {},
          authorityEpoch: options.authorityEpoch,
          dealerSeatId: command.payload.dealerSeatId,
          history: [],
          phase: "lobby",
          revision: revision + 1,
          schemaVersion: 1,
          seats: command.payload.seats.map((seat) => ({
            ...seat,
            sittingOutNextHand: false,
            status: "waiting",
          })),
          tableId: options.tableId,
        };
        events = [{ type: "TableCreated" }];
        break;
      }
      case "StartHand": {
        if (
          !current ||
          !isHost(command.actor) ||
          !["lobby", "complete"].includes(current.phase)
        ) {
          return rejected("command-not-allowed", revision);
        }
        const playingSeats = current.seats.filter(
          (seat) => !seat.sittingOutNextHand,
        );
        if (playingSeats.length < 2)
          return rejected("command-not-allowed", revision);
        const handId = options.handIdFactory();
        next = {
          ...current,
          custody: options.custody.startHand(
            playingSeats.map((seat) => seat.seatId),
          ),
          handId,
          phase: "preflop",
          revision: revision + 1,
          seats: current.seats.map((seat) => ({
            ...seat,
            status: seat.sittingOutNextHand ? "sitting-out" : "active",
          })),
        };
        events = [{ type: "HandStarted" }];
        break;
      }
      case "RevealStreet": {
        if (
          !current?.custody ||
          !isHost(command.actor) ||
          expectedStreet(current.phase) !== command.payload.street
        ) {
          return rejected("command-not-allowed", revision);
        }
        const finalized = finalizeProvisionalSeats(current.seats);
        next = {
          ...current,
          custody: options.custody.revealStreet(
            current.custody,
            command.payload.street,
          ),
          phase: command.payload.street,
          revision: revision + 1,
          seats: finalized.seats,
        };
        events = [
          ...(finalized.changed ? [{ type: "FoldFinalized" as const }] : []),
          { type: "StreetRevealed" },
        ];
        break;
      }
      case "FoldCards": {
        if (!current?.custody || command.actor.kind !== "seat")
          return rejected("command-not-allowed", revision);
        const actingSeatId = command.actor.seatId;
        const seat = current.seats.find(
          (candidate) => candidate.seatId === actingSeatId,
        );
        if (!seat || seat.status !== "active" || current.phase === "complete")
          return rejected("command-not-allowed", revision);
        next = {
          ...current,
          revision: revision + 1,
          seats: current.seats.map((candidate) =>
            candidate.seatId === actingSeatId
              ? { ...candidate, status: "folded-provisional" }
              : candidate,
          ),
        };
        events = [{ type: "FoldStarted" }];
        break;
      }
      case "RetractFold": {
        if (!current?.custody || command.actor.kind !== "seat")
          return rejected("command-not-allowed", revision);
        const actingSeatId = command.actor.seatId;
        const seat = current.seats.find(
          (candidate) => candidate.seatId === actingSeatId,
        );
        if (!seat || seat.status !== "folded-provisional")
          return rejected("command-not-allowed", revision);
        next = {
          ...current,
          revision: revision + 1,
          seats: current.seats.map((candidate) =>
            candidate.seatId === actingSeatId
              ? { ...candidate, status: "active" }
              : candidate,
          ),
        };
        events = [{ type: "FoldRetracted" }];
        break;
      }
      case "FinalizeFold": {
        if (!current?.custody || command.actor.kind !== "seat")
          return rejected("command-not-allowed", revision);
        const actingSeatId = command.actor.seatId;
        const seat = current.seats.find(
          (candidate) => candidate.seatId === actingSeatId,
        );
        if (!seat || seat.status !== "folded-provisional")
          return rejected("command-not-allowed", revision);
        next = {
          ...current,
          revision: revision + 1,
          seats: current.seats.map((candidate) =>
            candidate.seatId === actingSeatId
              ? { ...candidate, status: "folded" }
              : candidate,
          ),
        };
        events = [{ type: "FoldFinalized" }];
        break;
      }
      case "ShowCards": {
        if (!current?.custody || command.actor.kind !== "seat") {
          return rejected("command-not-allowed", revision);
        }
        const actingSeatId = command.actor.seatId;
        const seat = current.seats.find(
          (candidate) => candidate.seatId === actingSeatId,
        );
        if (!seat || seat.status !== "active" || current.phase === "complete")
          return rejected("command-not-allowed", revision);
        const finalized = finalizeProvisionalSeats(current.seats);
        next = {
          ...current,
          custody: options.custody.showSeat(current.custody, seat.seatId),
          revision: revision + 1,
          seats: finalized.seats.map((candidate) =>
            candidate.seatId === actingSeatId
              ? { ...candidate, status: "shown" }
              : candidate,
          ),
        };
        events = [
          ...(finalized.changed ? [{ type: "FoldFinalized" as const }] : []),
          { type: "CardsShown" },
        ];
        break;
      }
      case "MuckCards": {
        if (!current?.custody || command.actor.kind !== "seat")
          return rejected("command-not-allowed", revision);
        const actingSeatId = command.actor.seatId;
        const seat = current.seats.find(
          (candidate) => candidate.seatId === actingSeatId,
        );
        if (
          !seat ||
          !["active", "folded-provisional", "folded"].includes(seat.status) ||
          current.phase === "complete"
        ) {
          return rejected("command-not-allowed", revision);
        }
        next = {
          ...current,
          revision: revision + 1,
          seats: current.seats.map((candidate) =>
            candidate.seatId === actingSeatId
              ? { ...candidate, status: "mucked" }
              : candidate,
          ),
        };
        events = [{ type: "CardsMucked" }];
        break;
      }
      case "EndHand": {
        if (
          !current?.custody ||
          !isHost(command.actor) ||
          current.phase === "complete"
        ) {
          return rejected("command-not-allowed", revision);
        }
        const finalized = finalizeProvisionalSeats(current.seats);
        next = {
          ...current,
          phase: "complete",
          revision: revision + 1,
          seats: finalized.seats,
        };
        events = [
          ...(finalized.changed ? [{ type: "FoldFinalized" as const }] : []),
          { type: "HandEnded" },
        ];
        break;
      }
      case "RelocateDealer": {
        const dealerSeatId = command.payload.dealerSeatId;
        if (
          !current ||
          !isHost(command.actor) ||
          !["lobby", "complete"].includes(current.phase) ||
          !current.seats.some((seat) => seat.seatId === dealerSeatId)
        ) {
          return rejected("command-not-allowed", revision);
        }
        next = {
          ...current,
          dealerSeatId,
          revision: revision + 1,
        };
        events = [{ type: "DealerRelocated" }];
        break;
      }
      case "VoidHand": {
        if (
          !current?.custody ||
          !isHost(command.actor) ||
          current.phase === "complete" ||
          command.payload.reason.trim().length === 0
        ) {
          return rejected("command-not-allowed", revision);
        }
        const finalized = finalizeProvisionalSeats(current.seats);
        next = {
          ...current,
          phase: "complete",
          revision: revision + 1,
          seats: finalized.seats,
        };
        events = [
          ...(finalized.changed ? [{ type: "FoldFinalized" as const }] : []),
          { type: "HandVoided" },
        ];
        break;
      }
      case "RecordCorrection": {
        const correctedIds = new Set(command.payload.correctedEventIds);
        const activeHistory = current?.history ?? [];
        if (
          !current ||
          !isHost(command.actor) ||
          command.payload.reason.trim().length === 0 ||
          correctedIds.size === 0 ||
          correctedIds.size !== command.payload.correctedEventIds.length ||
          command.payload.correctedEventIds.some(
            (eventId) =>
              !activeHistory.some((event) => event.eventId === eventId),
          )
        ) {
          return rejected("command-not-allowed", revision);
        }
        next = { ...current, revision: revision + 1 };
        events = [{ type: "CorrectionRecorded" }];
        break;
      }
      case "RegisterSeat": {
        const seatDefinition = command.payload.seat;
        if (
          !current ||
          !isHost(command.actor) ||
          current.seats.length >= 10 ||
          seatDefinition.displayName.trim().length === 0 ||
          current.seats.some((seat) => seat.seatId === seatDefinition.seatId)
        ) {
          return rejected("command-not-allowed", revision);
        }
        next = {
          ...current,
          revision: revision + 1,
          seats: [
            ...current.seats,
            {
              ...seatDefinition,
              sittingOutNextHand: false,
              status: "waiting",
            },
          ],
        };
        events = [{ type: "SeatRegistered" }];
        break;
      }
      case "SetSeatParticipation": {
        if (!current) return rejected("command-not-allowed", revision);
        const seatId = command.payload.seatId;
        const sittingOut = command.payload.sittingOut;
        const authorized =
          isHost(command.actor) ||
          (command.actor.kind === "seat" && command.actor.seatId === seatId);
        const seat = current.seats.find(
          (candidate) => candidate.seatId === seatId,
        );
        if (!authorized || !seat)
          return rejected("command-not-allowed", revision);
        const betweenHands = ["lobby", "complete"].includes(current.phase);
        next = {
          ...current,
          revision: revision + 1,
          seats: current.seats.map((candidate) =>
            candidate.seatId === seatId
              ? {
                  ...candidate,
                  sittingOutNextHand: sittingOut,
                  status: betweenHands
                    ? sittingOut
                      ? "sitting-out"
                      : "waiting"
                    : candidate.status,
                }
              : candidate,
          ),
        };
        events = [{ type: "SeatParticipationChanged" }];
        break;
      }
    }

    if (!next) return rejected("command-not-allowed", revision);
    next = appendHistory(next, command, events);
    const receipt: AcceptedReceipt = {
      events,
      ...(next.handId ? { handId: next.handId } : {}),
      revision: next.revision,
      status: "accepted",
    };
    const committedState: PersistedAuthorityState = {
      ...next,
      acceptedCommands: {
        ...next.acceptedCommands,
        [command.commandId]: { fingerprint, receipt },
      },
    };
    let commit: CommitResult;
    try {
      commit = await options.store.commit(revision, {
        revision: committedState.revision,
        state: committedState,
      });
    } catch {
      return rejected("persistence-failed", revision);
    }
    if (commit.status === "revision-conflict") {
      const concurrentCommand = current?.acceptedCommands[command.commandId];
      if (concurrentCommand) {
        return concurrentCommand.fingerprint === fingerprint
          ? concurrentCommand.receipt
          : rejected(
              "idempotency-conflict",
              current?.revision ?? commit.actualRevision,
            );
      }
      return rejected("revision-conflict", commit.actualRevision);
    }
    if (commit.status === "failed")
      return rejected("persistence-failed", revision);
    current = committedState;
    return receipt;
  }

  return { history, project, recover, submit };
}
