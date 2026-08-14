import type {
  Card,
  CardCustody,
  CustodyState,
  Street,
} from "@html-poker/card-custody";
import type { AtomicTableStore, CommitResult } from "@html-poker/persistence";

export interface SeatDefinition {
  readonly displayName: string;
  readonly seatId: string;
}

type HostActor = { readonly actorId: string; readonly kind: "trusted-host" };
type SeatActor = { readonly kind: "seat"; readonly seatId: string };
type Actor = HostActor | SeatActor;

type CommandPayload =
  | {
      readonly dealerSeatId: string;
      readonly seats: readonly SeatDefinition[];
      readonly type: "CreateTable";
    }
  | { readonly type: "StartHand" }
  | { readonly street: Street; readonly type: "RevealStreet" }
  | { readonly type: "ShowCards" }
  | { readonly type: "EndHand" };

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

export interface EventSummary {
  readonly type:
    | "TableCreated"
    | "HandStarted"
    | "StreetRevealed"
    | "CardsShown"
    | "HandEnded";
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

interface SeatState extends SeatDefinition {
  readonly status: "active" | "shown";
}

interface AcceptedCommand {
  readonly fingerprint: string;
  readonly receipt: AcceptedReceipt;
}

interface AuthorityState {
  readonly acceptedCommands: Readonly<Record<string, AcceptedCommand>>;
  readonly custody?: CustodyState;
  readonly dealerSeatId: string;
  readonly handId?: string;
  readonly phase: HandPhase;
  readonly revision: number;
  readonly seats: readonly SeatState[];
}

export interface ProjectedSeat {
  readonly displayName: string;
  readonly holeCards?: readonly Card[];
  readonly seatId: string;
  readonly status: "active" | "shown";
}

export interface PublicProjection {
  readonly board: readonly Card[];
  readonly dealerSeatId: string;
  readonly handId?: string;
  readonly phase: HandPhase;
  readonly revision: number;
  readonly seats: readonly ProjectedSeat[];
  readonly tableId: string;
  readonly view: "public";
}

export interface SeatProjection extends Omit<PublicProjection, "view"> {
  readonly self: {
    readonly holeCards: readonly Card[];
    readonly seatId: string;
  };
  readonly view: "seat";
}

export type ProjectionTarget =
  | { readonly kind: "public" }
  | { readonly kind: "seat"; readonly seatId: string };

export interface TrustedHostAuthority {
  project(target: ProjectionTarget): PublicProjection | SeatProjection;
  submit(command: CommandEnvelope): Promise<CommandReceipt>;
}

export interface TrustedHostAuthorityOptions {
  readonly authorityEpoch: string;
  readonly custody: CardCustody;
  readonly handIdFactory: () => string;
  readonly store: AtomicTableStore<AuthorityState>;
  readonly tableId: string;
}

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

export function createTrustedHostAuthority(
  options: TrustedHostAuthorityOptions,
): TrustedHostAuthority {
  let current: AuthorityState | undefined;

  function project(
    target: ProjectionTarget,
  ): PublicProjection | SeatProjection {
    if (!current) throw new Error("The table has not been created.");
    const shownCards = current.custody
      ? options.custody.shownCards(current.custody)
      : {};
    const publicProjection: PublicProjection = {
      board: current.custody ? options.custody.boardCards(current.custody) : [],
      dealerSeatId: current.dealerSeatId,
      ...(current.handId ? { handId: current.handId } : {}),
      phase: current.phase,
      revision: current.revision,
      seats: current.seats.map((seat) => {
        const exposedCards = shownCards[seat.seatId];
        return {
          displayName: seat.displayName,
          ...(exposedCards ? { holeCards: [...exposedCards] } : {}),
          seatId: seat.seatId,
          status: seat.status,
        };
      }),
      tableId: options.tableId,
      view: "public",
    };
    if (target.kind === "public") return publicProjection;
    const holeCards = current.custody
      ? options.custody.seatCards(current.custody, target.seatId)
      : undefined;
    if (!holeCards)
      throw new Error("The requested seat is not active in this hand.");
    return {
      ...publicProjection,
      self: { holeCards: [...holeCards], seatId: target.seatId },
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
    const isHandScoped = ["RevealStreet", "ShowCards", "EndHand"].includes(
      command.payload.type,
    );
    if (isHandScoped && current?.handId !== command.handId) {
      return rejected("hand-mismatch", revision);
    }

    let next: AuthorityState | undefined;
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
          dealerSeatId: command.payload.dealerSeatId,
          phase: "lobby",
          revision: revision + 1,
          seats: command.payload.seats.map((seat) => ({
            ...seat,
            status: "active",
          })),
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
        const handId = options.handIdFactory();
        next = {
          ...current,
          custody: options.custody.startHand(
            current.seats.map((seat) => seat.seatId),
          ),
          handId,
          phase: "preflop",
          revision: revision + 1,
          seats: current.seats.map((seat) => ({ ...seat, status: "active" })),
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
        next = {
          ...current,
          custody: options.custody.revealStreet(
            current.custody,
            command.payload.street,
          ),
          phase: command.payload.street,
          revision: revision + 1,
        };
        events = [{ type: "StreetRevealed" }];
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
        if (!seat || seat.status === "shown" || current.phase === "complete")
          return rejected("command-not-allowed", revision);
        next = {
          ...current,
          custody: options.custody.showSeat(current.custody, seat.seatId),
          revision: revision + 1,
          seats: current.seats.map((candidate) =>
            candidate.seatId === actingSeatId
              ? { ...candidate, status: "shown" }
              : candidate,
          ),
        };
        events = [{ type: "CardsShown" }];
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
        next = { ...current, phase: "complete", revision: revision + 1 };
        events = [{ type: "HandEnded" }];
        break;
      }
    }

    if (!next) return rejected("command-not-allowed", revision);
    const receipt: AcceptedReceipt = {
      events,
      ...(next.handId ? { handId: next.handId } : {}),
      revision: next.revision,
      status: "accepted",
    };
    const committedState: AuthorityState = {
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

  return { project, submit };
}
