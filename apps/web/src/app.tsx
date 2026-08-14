import { useRef, useState, type FormEvent } from "react";

import { createCardCustody, type Street } from "@html-poker/card-custody";
import {
  createTrustedHostAuthority,
  type CommandEnvelope,
  type CommandReceipt,
  type ProjectionTarget,
  type PublicProjection,
  type SeatProjection,
  type TrustedHostAuthority,
} from "@html-poker/game-core";
import { createMemoryTableStore } from "@html-poker/persistence";
import { PokerTable } from "@html-poker/presentation";

interface Runtime {
  readonly authority: TrustedHostAuthority;
  readonly authorityEpoch: string;
  readonly seatNames: Readonly<Record<string, string>>;
  readonly tableId: string;
}

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function Setup({
  onCreate,
}: {
  readonly onCreate: (first: string, second: string) => Promise<void>;
}) {
  const [first, setFirst] = useState("Alice");
  const [second, setSecond] = useState("Bob");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await onCreate(first.trim(), second.trim());
    } finally {
      setBusy(false);
    }
  }

  const valid =
    first.trim().length > 0 &&
    second.trim().length > 0 &&
    first.trim() !== second.trim();

  return (
    <main className="setup-shell">
      <section className="setup-card" aria-labelledby="setup-title">
        <p className="eyebrow">Phase 1 · Trusted Host preview</p>
        <h1 id="setup-title">Deal the cards. Keep the table.</h1>
        <p className="setup-copy">
          A private digital deck for the people already around you. Bets and
          chips stay on the felt.
        </p>
        <form onSubmit={(event) => void submit(event)}>
          <div className="name-grid">
            <label>
              <span>First player</span>
              <input
                value={first}
                onChange={(event) => setFirst(event.target.value)}
                autoComplete="off"
              />
            </label>
            <label>
              <span>Second player</span>
              <input
                value={second}
                onChange={(event) => setSecond(event.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <button
            className="primary-button"
            type="submit"
            disabled={!valid || busy}
          >
            {busy ? "Shuffling…" : "Create table and deal"}
          </button>
        </form>
        <div className="trust-note">
          <span aria-hidden="true">◆</span>
          <p>
            Local preview. The active host deals; Public Table receives no
            hidden cards. Network joining arrives in the next slice.
          </p>
        </div>
      </section>
      <div className="setup-halo" aria-hidden="true" />
    </main>
  );
}

export function App() {
  const runtime = useRef<Runtime | undefined>(undefined);
  const actionLocked = useRef(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [projection, setProjection] = useState<
    PublicProjection | SeatProjection
  >();
  const [target, setTarget] = useState<ProjectionTarget>({ kind: "public" });

  async function createTable(firstName: string, secondName: string) {
    const tableId = makeId("table");
    const authorityEpoch = makeId("epoch");
    const firstSeatId = makeId("seat");
    const secondSeatId = makeId("seat");
    const authority = createTrustedHostAuthority({
      authorityEpoch,
      custody: createCardCustody(),
      handIdFactory: () => makeId("hand"),
      store: createMemoryTableStore(),
      tableId,
    });
    runtime.current = {
      authority,
      authorityEpoch,
      seatNames: { [firstSeatId]: firstName, [secondSeatId]: secondName },
      tableId,
    };

    await submit({
      actor: { actorId: "local-host", kind: "trusted-host" },
      payload: {
        dealerSeatId: firstSeatId,
        seats: [
          { displayName: firstName, seatId: firstSeatId },
          { displayName: secondName, seatId: secondSeatId },
        ],
        type: "CreateTable",
      },
    });
    await submit({
      actor: { actorId: "local-host", kind: "trusted-host" },
      payload: { type: "StartHand" },
    });
    selectTarget({ kind: "public" });
  }

  async function submit(
    input: Pick<CommandEnvelope, "actor" | "payload"> &
      Partial<Pick<CommandEnvelope, "handId">>,
  ): Promise<CommandReceipt> {
    const active = runtime.current;
    if (!active) throw new Error("The local table is not initialized.");
    const currentProjection = active.authority.project.bind(active.authority);
    const revision = (() => {
      try {
        return currentProjection({ kind: "public" }).revision;
      } catch {
        return 0;
      }
    })();
    const receipt = await active.authority.submit({
      actor: input.actor,
      authorityEpoch: active.authorityEpoch,
      commandId: makeId("command"),
      expectedRevision: revision,
      ...(input.handId ? { handId: input.handId } : {}),
      payload: input.payload,
      tableId: active.tableId,
    });
    if (receipt.status === "rejected")
      throw new Error(`Command rejected: ${receipt.code}`);
    return receipt;
  }

  function selectTarget(nextTarget: ProjectionTarget) {
    const active = runtime.current;
    if (!active) return;
    setTarget(nextTarget);
    setProjection(active.authority.project(nextTarget));
  }

  async function revealStreet(street: Street) {
    const active = runtime.current;
    if (!active) return;
    await submit({
      actor: { actorId: "local-host", kind: "trusted-host" },
      ...(projection?.handId ? { handId: projection.handId } : {}),
      payload: { street, type: "RevealStreet" },
    });
    selectTarget(target);
  }

  async function showCards() {
    if (target.kind !== "seat") return;
    await submit({
      actor: { kind: "seat", seatId: target.seatId },
      ...(projection?.handId ? { handId: projection.handId } : {}),
      payload: { type: "ShowCards" },
    });
    selectTarget(target);
  }

  async function endHand() {
    await submit({
      actor: { actorId: "local-host", kind: "trusted-host" },
      ...(projection?.handId ? { handId: projection.handId } : {}),
      payload: { type: "EndHand" },
    });
    selectTarget(target);
  }

  async function startNextHand() {
    await submit({
      actor: { actorId: "local-host", kind: "trusted-host" },
      payload: { type: "StartHand" },
    });
    selectTarget(target);
  }

  function perform(action: () => Promise<void>) {
    if (actionLocked.current) return;
    actionLocked.current = true;
    setActionBusy(true);
    setActionError(undefined);
    void action()
      .catch(() => {
        setActionError(
          "That action could not be committed. The table did not advance.",
        );
      })
      .finally(() => {
        actionLocked.current = false;
        setActionBusy(false);
      });
  }

  if (!projection || !runtime.current) return <Setup onCreate={createTable} />;

  return (
    <PokerTable
      activeTarget={target}
      controlsDisabled={actionBusy}
      errorMessage={actionError}
      onEndHand={() => perform(endHand)}
      onRevealStreet={(street) => perform(() => revealStreet(street))}
      onSelectTarget={selectTarget}
      onShowCards={() => perform(showCards)}
      onStartNextHand={() => perform(startNextHand)}
      projection={projection}
      seatNames={runtime.current.seatNames}
    />
  );
}
