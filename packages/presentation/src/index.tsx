import type { CSSProperties, ReactNode } from "react";

import type {
  HandPhase,
  ProjectionTarget,
  PublicProjection,
  SeatProjection,
} from "@html-poker/game-core";
import type { Card, Street } from "@html-poker/card-custody";

export interface PokerTableProps {
  readonly activeTarget: ProjectionTarget;
  readonly controlsDisabled: boolean;
  readonly errorMessage: string | undefined;
  readonly onEndHand: () => void;
  readonly onRevealStreet: (street: Street) => void;
  readonly onSelectTarget: (target: ProjectionTarget) => void;
  readonly onShowCards: () => void;
  readonly onStartNextHand: () => void;
  readonly projection: PublicProjection | SeatProjection;
  readonly seatNames: Readonly<Record<string, string>>;
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

function PlayingCard({
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
      className={`playing-card${details.isRed ? " playing-card--red" : ""}`}
      data-card={card}
      role="img"
      {...markerProps}
    >
      <span className="playing-card__rank">{details.rank}</span>
      <span className="playing-card__suit" aria-hidden="true">
        {details.suit}
      </span>
    </span>
  );
}

function phaseLabel(phase: HandPhase): string {
  const labels: Record<HandPhase, string> = {
    complete: "Hand complete",
    flop: "Flop",
    lobby: "Ready",
    preflop: "Pre-flop",
    river: "River",
    turn: "Turn",
  };
  return labels[phase];
}

function TableAction({
  children,
  danger = false,
  disabled = false,
  onClick,
}: {
  readonly children: ReactNode;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      className={`table-action${danger ? " table-action--danger" : ""}`}
      disabled={disabled}
      onClick={(event) => {
        if (event.detail <= 1) onClick();
      }}
      type="button"
    >
      {children}
    </button>
  );
}

function PrimaryAction({
  phase,
  props,
}: {
  readonly phase: HandPhase;
  readonly props: PokerTableProps;
}) {
  if (phase === "preflop")
    return (
      <TableAction
        disabled={props.controlsDisabled}
        onClick={() => props.onRevealStreet("flop")}
      >
        Deal the flop
      </TableAction>
    );
  if (phase === "flop")
    return (
      <TableAction
        disabled={props.controlsDisabled}
        onClick={() => props.onRevealStreet("turn")}
      >
        Deal the turn
      </TableAction>
    );
  if (phase === "turn")
    return (
      <TableAction
        disabled={props.controlsDisabled}
        onClick={() => props.onRevealStreet("river")}
      >
        Deal the river
      </TableAction>
    );
  if (phase === "river")
    return (
      <TableAction disabled={props.controlsDisabled} onClick={props.onEndHand}>
        End hand
      </TableAction>
    );
  if (phase === "complete")
    return (
      <TableAction
        disabled={props.controlsDisabled}
        onClick={props.onStartNextHand}
      >
        Deal next hand
      </TableAction>
    );
  return null;
}

function seatPosition(index: number, count: number): CSSProperties {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    left: `${50 + Math.cos(angle) * 43}%`,
    top: `${50 + Math.sin(angle) * 40}%`,
  };
}

export function PokerTable(props: PokerTableProps) {
  const { activeTarget, onSelectTarget, projection, seatNames } = props;
  const ownSeat =
    projection.view === "seat" ? projection.self.seatId : undefined;
  const ownStatus = ownSeat
    ? projection.seats.find((seat) => seat.seatId === ownSeat)?.status
    : undefined;

  return (
    <main className="table-shell" aria-busy={props.controlsDisabled}>
      <header className="table-header">
        <div>
          <p className="eyebrow">Trusted Host · Local preview</p>
          <h1 className="wordmark">HTML Poker Table</h1>
        </div>
        <div className="hand-state" aria-live="polite">
          <span className="hand-state__dot" aria-hidden="true" />
          <span>{phaseLabel(projection.phase)}</span>
          <span className="hand-state__revision">r{projection.revision}</span>
        </div>
      </header>

      <nav className="view-switcher" aria-label="Preview projection">
        <button
          aria-pressed={activeTarget.kind === "public"}
          disabled={props.controlsDisabled}
          onClick={() => onSelectTarget({ kind: "public" })}
          type="button"
        >
          <span className="view-switcher__mark" aria-hidden="true">
            ◎
          </span>
          View Public Table
        </button>
        {Object.entries(seatNames).map(([seatId, name]) => (
          <button
            aria-pressed={
              activeTarget.kind === "seat" && activeTarget.seatId === seatId
            }
            disabled={props.controlsDisabled}
            key={seatId}
            onClick={() => onSelectTarget({ kind: "seat", seatId })}
            type="button"
          >
            <span className="view-switcher__mark" aria-hidden="true">
              ◐
            </span>
            View {name}&apos;s hand
          </button>
        ))}
      </nav>

      <section className="table-stage" aria-label="Poker table">
        <div className="table-halo" aria-hidden="true" />
        <div className="table-felt">
          <div className="table-felt__grain" aria-hidden="true" />
          <div className="board" aria-label="Community cards" role="group">
            {Array.from({ length: 5 }, (_, index) => {
              const card = projection.board[index];
              return card ? (
                <PlayingCard card={card} key={card} marker="board" />
              ) : (
                <span
                  className="card-slot"
                  aria-hidden="true"
                  key={`empty-${index}`}
                />
              );
            })}
          </div>
          <div className="table-inscription" aria-hidden="true">
            <span>DEAL ONLY</span>
            <span>PHYSICAL CHIPS</span>
          </div>
        </div>

        {projection.seats.map((seat, index) => (
          <article
            className={`seat-marker${seat.seatId === ownSeat ? " seat-marker--self" : ""}`}
            key={seat.seatId}
            style={seatPosition(index, projection.seats.length)}
          >
            <div className="seat-marker__name">
              <span>{seat.displayName}</span>
              {seat.seatId === projection.dealerSeatId ? (
                <span className="dealer-button" aria-label="Dealer">
                  D
                </span>
              ) : null}
            </div>
            {seat.holeCards ? (
              <div
                className="shown-cards"
                aria-label={`${seat.displayName}'s shown cards`}
                role="group"
              >
                {seat.holeCards.map((card) => (
                  <PlayingCard card={card} key={card} marker="shown" />
                ))}
              </div>
            ) : (
              <div
                className="card-backs"
                aria-label={`${seat.displayName}'s cards are private`}
                role="img"
              >
                <span />
                <span />
              </div>
            )}
          </article>
        ))}
      </section>

      {projection.view === "seat" ? (
        <section className="private-tray" aria-labelledby="private-hand-title">
          <div>
            <p className="eyebrow">Private to this player view</p>
            <h1 id="private-hand-title">
              {seatNames[projection.self.seatId]}&apos;s hand
            </h1>
          </div>
          <div className="private-tray__cards">
            {projection.self.holeCards.map((card) => (
              <PlayingCard card={card} key={card} marker="private" />
            ))}
          </div>
        </section>
      ) : (
        <p className="public-note">
          <span aria-hidden="true">◉</span> Public projection · no hidden cards
        </p>
      )}

      {props.errorMessage ? (
        <p className="action-error" role="alert">
          {props.errorMessage}
        </p>
      ) : null}

      <footer className="control-dock" aria-label="Hand controls">
        <div className="control-dock__context">
          <span>
            {projection.view === "public" ? "Public Table" : "Player view"}
          </span>
          <small>
            {projection.handId
              ? projection.handId.slice(0, 18)
              : "No active hand"}
          </small>
        </div>
        <div className="control-dock__actions">
          {projection.view === "seat" &&
          ownStatus !== "shown" &&
          projection.phase !== "complete" ? (
            <TableAction
              danger
              disabled={props.controlsDisabled}
              onClick={props.onShowCards}
            >
              Show cards
            </TableAction>
          ) : null}
          <PrimaryAction phase={projection.phase} props={props} />
        </div>
      </footer>
    </main>
  );
}
