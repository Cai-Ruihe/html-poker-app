import { useEffect, useState, type ReactNode } from "react";

import type { Card, Street } from "@html-poker/card-custody";
import type {
  HandPhase,
  PublicProjection,
  SeatProjection,
} from "@html-poker/game-core";

export type PresentationMode = "host" | "player" | "tablet" | "tv" | "public";

export interface TableSurfaceProps {
  readonly busy: boolean;
  readonly connectionLabel: string;
  readonly developerMode?: boolean;
  readonly errorMessage?: string;
  readonly futureSittingOut?: boolean;
  readonly mode: PresentationMode;
  readonly onDownloadLog?: () => void;
  readonly onEndHand?: () => void;
  readonly onFinalizeFold?: () => void;
  readonly onFold?: () => void;
  readonly onRevealStreet?: (street: Street) => void;
  readonly onShowCards?: () => void;
  readonly onStartNextHand?: () => void;
  readonly onToggleSittingOut?: (sittingOut: boolean) => void;
  readonly onUndoFold?: () => void;
  readonly projection: PublicProjection | SeatProjection;
}

const suitDetails = {
  c: { label: "clubs", symbol: "♣" },
  d: { label: "diamonds", symbol: "♦" },
  h: { label: "hearts", symbol: "♥" },
  s: { label: "spades", symbol: "♠" },
} as const;

const rankNames: Record<string, string> = {
  A: "ace",
  J: "jack",
  K: "king",
  Q: "queen",
  T: "ten",
};

function cardDetails(card: Card) {
  const rank = card[0] ?? "";
  const suit = card[1] as keyof typeof suitDetails;
  return {
    accessibleName: `${rankNames[rank] ?? rank} of ${suitDetails[suit].label}`,
    isRed: suit === "d" || suit === "h",
    rank,
    suit: suitDetails[suit].symbol,
  };
}

export function PlayingCard({
  card,
  marker,
}: {
  readonly card: Card;
  readonly marker: "board" | "private" | "shown";
}) {
  const details = cardDetails(card);
  const markerProps =
    marker === "private"
      ? { "data-private-card": "true" }
      : marker === "board"
        ? { "data-board-card": "true" }
        : { "data-shown-card": "true" };
  return (
    <span
      aria-label={details.accessibleName}
      className={`card${details.isRed ? " card--red" : ""}`}
      data-card={card}
      role="img"
      {...markerProps}
    >
      <span className="card__rank">{details.rank}</span>
      <span className="card__suit" aria-hidden="true">
        {details.suit}
      </span>
    </span>
  );
}

function phaseLabel(phase: HandPhase): string {
  const labels: Record<HandPhase, string> = {
    complete: "Hand complete",
    flop: "Flop",
    lobby: "Table ready",
    preflop: "Pre-flop",
    river: "River",
    turn: "Turn",
  };
  return labels[phase];
}

function BoardRail({ board }: { readonly board: readonly Card[] }) {
  return (
    <section className="dealer-rail" aria-label="Community cards">
      <div className="dealer-rail__label">
        <span>Board</span>
        <small>{board.length}/5 cards</small>
      </div>
      <div className="dealer-rail__cards">
        {Array.from({ length: 5 }, (_, index) => {
          const card = board[index];
          return card ? (
            <PlayingCard card={card} key={card} marker="board" />
          ) : (
            <span
              className="card-space"
              key={`space-${index}`}
              aria-hidden="true"
            >
              <span>{index + 1}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}

function SeatGrid({
  projection,
  mode,
}: {
  readonly mode: PresentationMode;
  readonly projection: PublicProjection | SeatProjection;
}) {
  const selfSeatId =
    projection.view === "seat" ? projection.self.seatId : undefined;
  return (
    <section className={`seat-grid seat-grid--${mode}`} aria-label="Seats">
      {projection.seats.map((seat, index) => (
        <article
          className={`seat-tile${seat.seatId === selfSeatId ? " seat-tile--self" : ""}`}
          data-seat-status={seat.status}
          key={seat.seatId}
        >
          <header>
            <span className="seat-tile__number">Seat {index + 1}</span>
            {seat.seatId === projection.dealerSeatId ? (
              <span className="dealer-chip" aria-label="Dealer">
                D
              </span>
            ) : null}
          </header>
          <strong>{seat.displayName}</strong>
          <span className="seat-tile__status">
            {seat.status.replace("-", " ")}
          </span>
          {seat.holeCards ? (
            <div
              className="mini-hand"
              aria-label={`${seat.displayName}'s shown cards`}
            >
              {seat.holeCards.map((card) => (
                <PlayingCard card={card} key={card} marker="shown" />
              ))}
            </div>
          ) : seat.status === "active" ||
            seat.status === "folded-provisional" ? (
            <div
              className="card-back-pair"
              aria-label="Cards not shown"
              role="img"
            >
              <span />
              <span />
            </div>
          ) : null}
          {seat.evaluation ? (
            <span className="hand-label">{seat.evaluation.label}</span>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function ActionButton({
  children,
  danger = false,
  disabled,
  onClick,
  quiet = false,
}: {
  readonly children: ReactNode;
  readonly danger?: boolean;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly quiet?: boolean;
}) {
  return (
    <button
      className={`action${danger ? " action--danger" : ""}${quiet ? " action--quiet" : ""}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function DealerControls(props: TableSurfaceProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const nextStreet: Partial<
    Record<HandPhase, { label: string; street: Street }>
  > = {
    flop: { label: "Deal the turn", street: "turn" },
    preflop: { label: "Deal the flop", street: "flop" },
    turn: { label: "Deal the river", street: "river" },
  };
  const progression = nextStreet[props.projection.phase];
  if (props.projection.phase === "complete") {
    return (
      <div className="dealer-actions">
        <ActionButton
          disabled={props.busy || !props.onStartNextHand}
          onClick={() => props.onStartNextHand?.()}
        >
          Deal next hand
        </ActionButton>
      </div>
    );
  }
  if (confirmEnd) {
    return (
      <div className="end-confirm" role="group" aria-label="Confirm end hand">
        <span>Physical chips settled?</span>
        <ActionButton
          disabled={props.busy}
          onClick={() => setConfirmEnd(false)}
          quiet
        >
          Keep playing
        </ActionButton>
        <ActionButton
          danger
          disabled={props.busy || !props.onEndHand}
          onClick={() => {
            setConfirmEnd(false);
            props.onEndHand?.();
          }}
        >
          End this hand
        </ActionButton>
      </div>
    );
  }
  return (
    <div className="dealer-actions">
      <ActionButton
        disabled={props.busy || !props.onEndHand}
        onClick={() => setConfirmEnd(true)}
        quiet
      >
        End hand
      </ActionButton>
      {progression ? (
        <ActionButton
          disabled={props.busy || !props.onRevealStreet}
          onClick={() => props.onRevealStreet?.(progression.street)}
        >
          {progression.label}
        </ActionButton>
      ) : null}
    </div>
  );
}

function PrivateHand(
  props: TableSurfaceProps & { readonly projection: SeatProjection },
) {
  const [cardsVisibleOnDevice, setCardsVisibleOnDevice] = useState(false);
  const status = props.projection.self.status;
  const handId = props.projection.handId;
  const privateCards = props.projection.self.holeCards.join(",");

  useEffect(() => {
    setCardsVisibleOnDevice(false);
  }, [handId, privateCards]);

  useEffect(() => {
    function coverWhenHidden() {
      if (document.visibilityState === "hidden") setCardsVisibleOnDevice(false);
    }
    document.addEventListener("visibilitychange", coverWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", coverWhenHidden);
  }, []);

  return (
    <section className="private-hand" aria-labelledby="private-title">
      <div className="private-hand__heading">
        <span className="section-label">Private hand</span>
        <h1 id="private-title">Your cards</h1>
        <p>
          {status === "shown"
            ? "Shown to the table. Covering them here does not undo the show."
            : cardsVisibleOnDevice
              ? "Visible only on this phone until you choose a table action."
              : "Reveal them privately, then hide them before passing the phone."}
        </p>
      </div>
      <div className="private-hand__cards">
        {props.projection.self.holeCards.map((card) => (
          <PlayingCard card={card} key={card} marker="private" />
        ))}
        {!cardsVisibleOnDevice ? (
          <button
            aria-label="Reveal my cards privately"
            className="card-cover"
            onClick={() => setCardsVisibleOnDevice(true)}
            type="button"
          >
            <span>Reveal my cards privately</span>
            <small>Only visible on this phone.</small>
          </button>
        ) : null}
      </div>
      <div className="player-actions">
        {cardsVisibleOnDevice ? (
          <ActionButton
            disabled={false}
            onClick={() => setCardsVisibleOnDevice(false)}
            quiet
          >
            Hide my cards
          </ActionButton>
        ) : null}
        {status === "folded-provisional" ? (
          <>
            <div className="undo-window" aria-label="Fold undo window">
              <span />
            </div>
            <ActionButton
              disabled={props.busy}
              onClick={() => props.onUndoFold?.()}
            >
              Undo fold
            </ActionButton>
          </>
        ) : status === "active" ? (
          <>
            <ActionButton
              danger
              disabled={props.busy || !props.onFold}
              onClick={() => props.onFold?.()}
              quiet
            >
              Fold
            </ActionButton>
            <ActionButton
              disabled={props.busy || !props.onShowCards}
              onClick={() => props.onShowCards?.()}
            >
              Show cards to table
            </ActionButton>
          </>
        ) : null}
      </div>
      <label className="sit-out-control">
        <input
          checked={props.futureSittingOut ?? false}
          disabled={props.busy}
          onChange={(event) => props.onToggleSittingOut?.(event.target.checked)}
          type="checkbox"
        />
        <span>Sit out next hand</span>
      </label>
    </section>
  );
}

export function TableSurface(props: TableSurfaceProps) {
  const isDealerSurface = props.mode === "host" || props.mode === "tablet";
  const isPlayer = props.mode === "player" && props.projection.view === "seat";
  return (
    <main className={`table-surface table-surface--${props.mode}`}>
      <header className="table-bar">
        <div className="table-mark">
          <span aria-hidden="true">▰</span>
          <strong>HTML Poker</strong>
        </div>
        <div className="table-status" aria-live="polite">
          <strong>{phaseLabel(props.projection.phase)}</strong>
          <span>r{props.projection.revision}</span>
          <span>{props.connectionLabel}</span>
        </div>
      </header>

      {isPlayer ? (
        <PrivateHand {...props} projection={props.projection} />
      ) : (
        <section className="public-table" aria-label="Public Table">
          <h1 className="visually-hidden">Public table</h1>
          <BoardRail board={props.projection.board} />
          <SeatGrid mode={props.mode} projection={props.projection} />
          {props.projection.showdown ? (
            <p className="showdown-note" aria-live="polite">
              {props.projection.showdown.leaders.length > 1
                ? "Shown hands are tied."
                : "Best available shown hand is marked."}
            </p>
          ) : null}
        </section>
      )}

      {isPlayer ? (
        <section className="player-board">
          <BoardRail board={props.projection.board} />
          <SeatGrid mode="player" projection={props.projection} />
        </section>
      ) : null}

      {props.errorMessage ? (
        <p className="surface-error" role="alert">
          {props.errorMessage}
        </p>
      ) : null}

      {isDealerSurface ? (
        <footer className="dealer-dock" aria-label="Dealer controls">
          <div>
            <span className="section-label">Dealer controls</span>
            <strong>{phaseLabel(props.projection.phase)}</strong>
          </div>
          <DealerControls {...props} />
        </footer>
      ) : null}

      {props.developerMode ? (
        <aside className="developer-strip" aria-label="Developer diagnostics">
          <span>Hand ID</span>
          <code>{props.projection.handId ?? "No active hand"}</code>
          {props.onDownloadLog ? (
            <button onClick={props.onDownloadLog} type="button">
              Save log
            </button>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
}
