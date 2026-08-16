import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import type { Card, Street } from "@html-poker/card-custody";
import type {
  BettingActionIntent,
  HandPhase,
  PublicProjection,
  SeatProjection,
  TableTheme,
} from "@html-poker/game-core";

export type PresentationMode = "host" | "player" | "tablet" | "tv" | "public";

type ActionResult = boolean | void | Promise<boolean | void>;

export interface TableSurfaceProps {
  readonly busy: boolean;
  readonly connectionLabel: string;
  readonly developerMode?: boolean;
  readonly errorMessage?: string;
  readonly futureSittingOut?: boolean;
  readonly hostPlayerAdministrationOpen?: boolean;
  readonly hostPlayerCount?: number;
  readonly mode: PresentationMode;
  readonly onBettingAction?: (action: BettingActionIntent) => void;
  readonly onConfirmSettlement?: () => ActionResult;
  readonly onDownloadLog?: () => void;
  readonly onEndHand?: () => ActionResult;
  readonly onFinalizeFold?: () => void;
  readonly onFold?: () => void;
  readonly onHostControls?: () => void;
  readonly onManagePlayers?: () => void;
  readonly onMyHand?: () => void;
  readonly onPrepareSettlement?: () => ActionResult;
  readonly onReconnect?: () => ActionResult;
  readonly onRevealStreet?: (street: Street) => ActionResult;
  readonly onShowCards?: () => void;
  readonly onStartNextHand?: () => ActionResult;
  readonly onTableThemeChange?: (theme: TableTheme) => ActionResult;
  readonly onToggleSittingOut?: (sittingOut: boolean) => void;
  readonly onToggleDeveloperMode?: () => void;
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
      <span className="card__corner card__corner--top" aria-hidden="true">
        <span className="card__rank">{details.rank}</span>
        <span className="card__corner-suit">{details.suit}</span>
      </span>
      <span className="card__pip" aria-hidden="true">
        {details.suit}
      </span>
      <span className="card__corner card__corner--bottom" aria-hidden="true">
        <span className="card__rank">{details.rank}</span>
        <span className="card__corner-suit">{details.suit}</span>
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
    showdown: "Showdown",
    "settlement-pending": "Settlement review",
    turn: "Turn",
  };
  return labels[phase];
}

function BoardRail({ board }: { readonly board: readonly Card[] }) {
  return (
    <section className="dealer-rail" aria-label="Community cards">
      <h2 className="visually-hidden">Community cards</h2>
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

function blindSeatIds(projection: PublicProjection | SeatProjection): {
  readonly bigBlindSeatId?: string;
  readonly smallBlindSeatId?: string;
} {
  const activeSeats = projection.seats.filter(
    (seat) => seat.status !== "sitting-out" && seat.status !== "waiting",
  );
  if (activeSeats.length < 2) return {};
  const dealerIndex = activeSeats.findIndex(
    (seat) => seat.seatId === projection.dealerSeatId,
  );
  if (dealerIndex < 0) return {};
  const smallBlindIndex =
    activeSeats.length === 2
      ? dealerIndex
      : (dealerIndex + 1) % activeSeats.length;
  const bigBlindIndex = (smallBlindIndex + 1) % activeSeats.length;
  const bigBlindSeatId = activeSeats[bigBlindIndex]?.seatId;
  const smallBlindSeatId = activeSeats[smallBlindIndex]?.seatId;
  return {
    ...(bigBlindSeatId ? { bigBlindSeatId } : {}),
    ...(smallBlindSeatId ? { smallBlindSeatId } : {}),
  };
}

function quietSeatPosition(index: number, count: number): number {
  if (count <= 1) return 5;
  return Math.round((index * 10) / count) % 10;
}

function SeatStateGlyph({
  connected,
  status,
  winner,
}: {
  readonly connected: boolean;
  readonly status: PublicProjection["seats"][number]["status"];
  readonly winner: boolean;
}) {
  if (!connected) {
    return (
      <span
        className="seat-state-glyph seat-state-glyph--offline"
        aria-hidden="true"
      >
        <span />
      </span>
    );
  }
  if (status === "sitting-out" || status === "waiting") {
    return (
      <span
        className="seat-state-glyph seat-state-glyph--sitting-out"
        aria-hidden="true"
      >
        <span />
      </span>
    );
  }
  const folded = ["folded", "folded-provisional", "mucked"].includes(status);
  return (
    <span
      className={`seat-state-glyph seat-state-glyph--cards${folded ? " seat-state-glyph--folded" : ""}${winner ? " seat-state-glyph--winner" : ""}`}
      aria-hidden="true"
    >
      <span />
      <span />
    </span>
  );
}

function QuietSeatGrid({
  projection,
}: {
  readonly projection: PublicProjection | SeatProjection;
}) {
  const { bigBlindSeatId, smallBlindSeatId } = blindSeatIds(projection);
  const winners = new Set(projection.showdown?.leaders ?? []);
  return (
    <section
      className="quiet-seat-grid"
      aria-label="Player status around table"
    >
      {projection.seats.map((seat, index) => {
        const connected = seat.connected !== false;
        const statusLabel = !connected
          ? "offline"
          : seat.status.replace("-", " ");
        const position = quietSeatPosition(index, projection.seats.length);
        return (
          <div
            aria-label={`${seat.displayName}, ${statusLabel}`}
            className={`seat-edge-status seat-edge-status--${position}`}
            data-seat-edge-status={statusLabel}
            key={seat.seatId}
          >
            <SeatStateGlyph
              connected={connected}
              status={seat.status}
              winner={winners.has(seat.seatId)}
            />
            <span className="seat-edge-status__roles" aria-hidden="true">
              {seat.seatId === projection.dealerSeatId ? (
                <span className="position-token position-token--dealer">D</span>
              ) : null}
              {seat.seatId === smallBlindSeatId ? (
                <span className="position-token position-token--small">SB</span>
              ) : null}
              {seat.seatId === bigBlindSeatId ? (
                <span className="position-token position-token--big">BB</span>
              ) : null}
            </span>
          </div>
        );
      })}
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
  if (["player", "public", "tablet", "tv"].includes(mode)) {
    return <QuietSeatGrid projection={projection} />;
  }
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
          {projection.accounting ? (
            <span
              className="seat-tile__stack"
              data-stack={
                projection.accounting.seats.find(
                  (accountingSeat) => accountingSeat.seatId === seat.seatId,
                )?.stack
              }
            >
              Stack{" "}
              {projection.accounting.seats.find(
                (accountingSeat) => accountingSeat.seatId === seat.seatId,
              )?.stack ?? "—"}
            </span>
          ) : null}
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

function ChipRail({
  projection,
}: {
  readonly projection: PublicProjection | SeatProjection;
}) {
  const accounting = projection.accounting;
  if (!accounting) return null;
  const actorName = projection.seats.find(
    (seat) => seat.seatId === accounting.currentActorSeatId,
  )?.displayName;
  return (
    <section className="chip-rail" aria-label="Digital chip accounting">
      <div>
        <span>In the middle</span>
        <strong>Pot {accounting.potTotal}</strong>
      </div>
      <div>
        <span>This street</span>
        <strong>Current bet {accounting.currentBet}</strong>
      </div>
      <p>{actorName ? `${actorName} to act` : "Betting round closed"}</p>
    </section>
  );
}

function SettlementPanel({
  projection,
}: {
  readonly projection: PublicProjection | SeatProjection;
}) {
  const settlement = projection.accounting?.settlement;
  if (!settlement) return null;
  const confirmed = projection.accounting?.phase === "complete";
  const displayName = (seatId: string) =>
    projection.seats.find((seat) => seat.seatId === seatId)?.displayName ??
    seatId;
  return (
    <section className="settlement-panel" aria-labelledby="settlement-title">
      <div>
        <span className="section-label">
          {confirmed ? "Confirmed result" : "Host confirmation gate"}
        </span>
        <h2 id="settlement-title">
          {confirmed ? "Settlement result" : "Settlement proposal"}
        </h2>
        <p>
          {confirmed
            ? "Stacks reflect this confirmed result."
            : "Stacks update only after confirmation."}
        </p>
      </div>
      <strong>Total pot {settlement.totalPot}</strong>
      <ol>
        {settlement.pots.map((pot, index) => (
          <li key={`${pot.amount}-${index}`}>
            <span>{pot.explanation}</span>
            <small>
              {pot.awards
                .map((award) => `${displayName(award.seatId)} +${award.amount}`)
                .join(" · ")}
            </small>
          </li>
        ))}
      </ol>
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

const nextStreetByPhase: Partial<
  Record<HandPhase, { readonly label: string; readonly street: Street }>
> = {
  flop: { label: "Deal the turn", street: "turn" },
  preflop: { label: "Deal the flop", street: "flop" },
  turn: { label: "Deal the river", street: "river" },
};

function DealerControls(props: TableSurfaceProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const progression = nextStreetByPhase[props.projection.phase];
  if (props.projection.phase === "complete") {
    if (props.projection.accounting) {
      return (
        <p className="dealer-guidance">
          This Phase 2 tracer ends after one hand.
        </p>
      );
    }
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
  if (props.projection.accounting) {
    if (props.projection.phase === "showdown") {
      return (
        <div className="dealer-actions">
          <ActionButton
            disabled={props.busy || !props.onPrepareSettlement}
            onClick={() => props.onPrepareSettlement?.()}
          >
            Review settlement
          </ActionButton>
        </div>
      );
    }
    if (props.projection.phase === "settlement-pending") {
      return (
        <div className="dealer-actions">
          <ActionButton
            disabled={props.busy || !props.onConfirmSettlement}
            onClick={() => props.onConfirmSettlement?.()}
          >
            Confirm settlement
          </ActionButton>
        </div>
      );
    }
    return <p className="dealer-guidance">Players act from their phones.</p>;
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

const tableThemeOptions: readonly {
  readonly id: TableTheme;
  readonly label: string;
}[] = [
  { id: "dark-green", label: "Dark Green" },
  { id: "black-gold", label: "Black Gold" },
  { id: "deep-navy", label: "Deep Navy" },
];

function TableThemeButtons(props: TableSurfaceProps) {
  if (!props.onTableThemeChange) return null;
  return (
    <div className="surface-theme-picker" role="group" aria-label="Table style">
      {tableThemeOptions.map((theme) => (
        <button
          aria-label={theme.label}
          aria-pressed={props.projection.tableTheme === theme.id}
          data-theme-choice={theme.id}
          disabled={props.busy}
          key={theme.id}
          onClick={() => void props.onTableThemeChange?.(theme.id)}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

function ReconnectAction({
  onReconnect,
}: {
  readonly onReconnect: (() => ActionResult) | undefined;
}) {
  return (
    <button
      className="reconnect-action"
      disabled={!onReconnect}
      onClick={() => void onReconnect?.()}
      type="button"
    >
      Reconnect to table
    </button>
  );
}

type TableCorner = "lower-left" | "lower-right" | "upper-left" | "upper-right";

function TabletControls(props: TableSurfaceProps) {
  const [corner, setCorner] = useState<TableCorner>();
  const [moreOpen, setMoreOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const sliderCommitting = useRef(false);
  const progression = nextStreetByPhase[props.projection.phase];
  const corners: readonly {
    readonly id: TableCorner;
    readonly label: string;
  }[] = [
    { id: "upper-left", label: "upper left" },
    { id: "upper-right", label: "upper right" },
    { id: "lower-left", label: "lower left" },
    { id: "lower-right", label: "lower right" },
  ];

  async function invoke(action?: () => ActionResult): Promise<boolean> {
    if (!action || props.busy) return false;
    try {
      const result = await action();
      if (result === false) return false;
      setCorner(undefined);
      setMoreOpen(false);
      return true;
    } catch {
      return false;
    }
  }

  async function commitNextHand(value: number): Promise<void> {
    setSliderValue(value);
    if (value < 92 || sliderCommitting.current) return;
    sliderCommitting.current = true;
    const action =
      props.projection.phase === "complete"
        ? props.onStartNextHand
        : props.onEndHand;
    await invoke(action);
    setSliderValue(0);
    sliderCommitting.current = false;
  }

  const facing = corner?.startsWith("upper") ? "upper" : "lower";
  return (
    <>
      {corners.map(({ id, label }) => (
        <button
          aria-label={`Open table controls from ${label}`}
          className={`table-corner table-corner--${id}`}
          data-table-corner={id}
          key={id}
          onClick={() => {
            setMoreOpen(false);
            setCorner(id);
          }}
          type="button"
        >
          <span aria-hidden="true" />
        </button>
      ))}

      {corner ? (
        <section
          aria-label="Table controls"
          className={`tablet-quick-panel tablet-quick-panel--${corner}`}
          data-control-facing={facing}
        >
          <div className="tablet-quick-panel__utilities">
            <button
              aria-label="More table controls"
              className="icon-action icon-action--more"
              onClick={() => setMoreOpen(true)}
              type="button"
            >
              <span aria-hidden="true">•••</span>
            </button>
            <button
              aria-label="Close table controls"
              className="icon-action icon-action--close"
              onClick={() => setCorner(undefined)}
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div className="tablet-quick-panel__actions">
            <button
              className="next-card-action"
              disabled={!progression || props.busy || !props.onRevealStreet}
              onClick={() =>
                void invoke(
                  progression
                    ? () => props.onRevealStreet?.(progression.street)
                    : undefined,
                )
              }
              type="button"
            >
              <span>Next card</span>
              <small>{progression?.label ?? "Board complete"}</small>
              <b aria-hidden="true">→</b>
            </button>
            <label className="next-hand-control">
              <input
                aria-label="Slide to deal next hand"
                disabled={
                  props.busy ||
                  (props.projection.phase === "complete"
                    ? !props.onStartNextHand
                    : !props.onEndHand)
                }
                max="100"
                min="0"
                onChange={(event) =>
                  void commitNextHand(event.currentTarget.valueAsNumber)
                }
                style={
                  {
                    "--slider-progress": `${sliderValue}%`,
                  } as CSSProperties
                }
                type="range"
                value={sliderValue}
              />
              <span>
                <strong>Next hand</strong>
                <small>
                  {props.projection.phase === "complete"
                    ? "Slide · deal now"
                    : "Slide · end this hand now"}
                </small>
              </span>
              <b aria-hidden="true">→</b>
            </label>
          </div>
        </section>
      ) : null}

      {moreOpen ? (
        <div className="secondary-controls-backdrop">
          <section
            aria-labelledby="secondary-controls-title"
            className="secondary-controls"
          >
            <header>
              <div>
                <span className="section-label">Table settings</span>
                <h2 id="secondary-controls-title">More controls</h2>
              </div>
              <button
                aria-label="Close more controls"
                className="icon-action icon-action--close"
                onClick={() => setMoreOpen(false)}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>
            {props.onTableThemeChange ? (
              <div className="secondary-control-row">
                <div>
                  <strong>Table style</strong>
                  <small>Synced to every screen</small>
                </div>
                <TableThemeButtons {...props} />
              </div>
            ) : null}
            {props.onReconnect ? (
              <div className="secondary-control-row">
                <div>
                  <strong>Connection</strong>
                  <small>{props.connectionLabel}</small>
                </div>
                <ReconnectAction onReconnect={props.onReconnect} />
              </div>
            ) : null}
            {props.onHostControls ? (
              <div className="secondary-control-row">
                <div>
                  <strong>This device</strong>
                  <small>Change the foreground view</small>
                </div>
                <div className="secondary-device-actions">
                  {props.onMyHand ? (
                    <button onClick={props.onMyHand} type="button">
                      My Hand
                    </button>
                  ) : null}
                  <button onClick={props.onHostControls} type="button">
                    Host Controls
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function BettingControls(props: {
  readonly busy: boolean;
  readonly onBettingAction?: (action: BettingActionIntent) => void;
  readonly projection: SeatProjection;
}) {
  const actions = props.projection.self.legalActions ?? [];
  const amountAction = actions.find(
    (action) => action.type === "bet-to" || action.type === "raise-to",
  );
  const [amount, setAmount] = useState(
    amountAction && "minTo" in amountAction ? amountAction.minTo : 0,
  );

  useEffect(() => {
    if (amountAction && "minTo" in amountAction) {
      setAmount(amountAction.minTo);
    }
  }, [
    amountAction && "maxTo" in amountAction ? amountAction.maxTo : undefined,
    amountAction && "minTo" in amountAction ? amountAction.minTo : undefined,
    amountAction?.type,
    props.projection.revision,
  ]);

  if (actions.length === 0) {
    const actorName = props.projection.seats.find(
      (seat) => seat.seatId === props.projection.accounting?.currentActorSeatId,
    )?.displayName;
    return (
      <p className="betting-wait">
        {actorName ? `Waiting for ${actorName}.` : "No action required."}
      </p>
    );
  }

  const fold = actions.find((action) => action.type === "fold");
  const check = actions.find((action) => action.type === "check");
  const call = actions.find((action) => action.type === "call");
  const allIn = actions.find((action) => action.type === "all-in");
  return (
    <div className="betting-actions" aria-label="Betting actions">
      {fold ? (
        <ActionButton
          danger
          disabled={props.busy || !props.onBettingAction}
          onClick={() => props.onBettingAction?.({ type: "fold" })}
          quiet
        >
          Fold
        </ActionButton>
      ) : null}
      {check ? (
        <ActionButton
          disabled={props.busy || !props.onBettingAction}
          onClick={() => props.onBettingAction?.({ type: "check" })}
        >
          Check
        </ActionButton>
      ) : null}
      {call && "amount" in call ? (
        <ActionButton
          disabled={props.busy || !props.onBettingAction}
          onClick={() => props.onBettingAction?.({ type: "call" })}
        >
          Call {call.amount}
        </ActionButton>
      ) : null}
      {amountAction && "minTo" in amountAction ? (
        <div className="bet-amount">
          <span>{amountAction.type === "bet-to" ? "Bet to" : "Raise to"}</span>
          <input
            aria-label={
              amountAction.type === "bet-to"
                ? "Bet to amount"
                : "Raise to amount"
            }
            inputMode="numeric"
            max={amountAction.maxTo}
            min={amountAction.minTo}
            onChange={(event) => setAmount(event.currentTarget.valueAsNumber)}
            step="1"
            type="number"
            value={amount}
          />
          <ActionButton
            disabled={
              props.busy ||
              !props.onBettingAction ||
              !Number.isSafeInteger(amount) ||
              amount < amountAction.minTo ||
              amount > amountAction.maxTo
            }
            onClick={() =>
              props.onBettingAction?.({
                to: amount,
                type: "bet-or-raise-to",
              })
            }
          >
            Commit
          </ActionButton>
        </div>
      ) : null}
      {allIn ? (
        <ActionButton
          disabled={props.busy || !props.onBettingAction}
          onClick={() => props.onBettingAction?.({ type: "all-in" })}
          quiet
        >
          All in {"to" in allIn ? allIn.to : ""}
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
        {props.projection.accounting ? (
          <BettingControls
            busy={props.busy}
            {...(props.onBettingAction
              ? { onBettingAction: props.onBettingAction }
              : {})}
            projection={props.projection}
          />
        ) : status === "folded-provisional" ? (
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
  const isPlayer = props.mode === "player" && props.projection.view === "seat";
  const isQuietPublic = ["public", "tablet", "tv"].includes(props.mode);
  const tableTheme = props.projection.tableTheme ?? "dark-green";
  return (
    <main
      className={`table-surface table-surface--${props.mode}`}
      data-theme={tableTheme}
    >
      {props.mode === "host" ? (
        <header className="table-bar">
          <div className="table-mark">
            <span aria-hidden="true">▰</span>
            <strong>HTML Poker</strong>
          </div>
          <div className="table-bar__right">
            <div className="table-status" aria-live="polite">
              <strong>{phaseLabel(props.projection.phase)}</strong>
              <span>r{props.projection.revision}</span>
              <span>{props.connectionLabel}</span>
            </div>
            {props.onManagePlayers || props.onToggleDeveloperMode ? (
              <nav className="host-tools" aria-label="Table tools">
                {props.onManagePlayers ? (
                  <button
                    aria-expanded={props.hostPlayerAdministrationOpen ?? false}
                    className="tool-button"
                    onClick={props.onManagePlayers}
                    type="button"
                  >
                    Players <span>{props.hostPlayerCount ?? 0}</span>
                  </button>
                ) : null}
                {props.onToggleDeveloperMode ? (
                  <button
                    aria-pressed={props.developerMode ?? false}
                    className="tool-button"
                    onClick={props.onToggleDeveloperMode}
                    type="button"
                  >
                    Developer
                  </button>
                ) : null}
              </nav>
            ) : null}
          </div>
        </header>
      ) : null}

      {isPlayer ? (
        <div className="player-status-bar">
          <span aria-live="polite">{props.connectionLabel}</span>
          <ReconnectAction onReconnect={props.onReconnect} />
        </div>
      ) : null}

      {isPlayer ? (
        <PrivateHand {...props} projection={props.projection} />
      ) : (
        <section
          className={`public-table${isQuietPublic ? " public-table--quiet" : ""}`}
          aria-label="Public Table"
        >
          <h1 className="visually-hidden">Public table</h1>
          <ChipRail projection={props.projection} />
          <BoardRail board={props.projection.board} />
          <SeatGrid mode={props.mode} projection={props.projection} />
          <SettlementPanel projection={props.projection} />
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
          <ChipRail projection={props.projection} />
          <BoardRail board={props.projection.board} />
          <SeatGrid mode="player" projection={props.projection} />
        </section>
      ) : null}

      {props.errorMessage ? (
        <div className="surface-error" role="alert">
          <span>{props.errorMessage}</span>
          {props.onReconnect ? (
            <ReconnectAction onReconnect={props.onReconnect} />
          ) : null}
        </div>
      ) : null}

      {props.mode === "host" ? (
        <footer className="dealer-dock" aria-label="Dealer controls">
          <div>
            <span className="section-label">Dealer controls</span>
            <strong>{phaseLabel(props.projection.phase)}</strong>
          </div>
          <DealerControls {...props} />
        </footer>
      ) : null}

      {props.mode === "tablet" ? <TabletControls {...props} /> : null}

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
