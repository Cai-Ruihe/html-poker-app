import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import QRCode from "qrcode";
import { BrowserQRCodeReader } from "@zxing/browser";

import type { CapabilityRole } from "@html-poker/identity-capabilities";
import { TableSurface } from "@html-poker/presentation";

import {
  BUILD_VERSION,
  createNormalDisplayPairingRequest,
  HostTableRuntime,
  TableClientRuntime,
  invitationUrl,
  isAirplaneMode,
  normalDisplayPairingIsConfigured,
  normalRelayRequiresOperatorToken,
  parseClientRecovery,
  parseHostRecovery,
  parseInvitation,
  replaceWithHostRecoveryUrl,
  type ClientRuntimeSnapshot,
  type AirplaneOfferDetails,
  type HostRuntimeSnapshot,
  type NormalDisplayPairingRequest,
  type PlayerAction,
} from "./runtime";

interface CapabilityCheck {
  readonly available: boolean;
  readonly label: string;
}

interface ScreenWakeLockSentinel {
  readonly released: boolean;
  release(): Promise<void>;
}

interface ScreenWakeLockManager {
  request(type: "screen"): Promise<ScreenWakeLockSentinel>;
}

function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let sentinel: ScreenWakeLockSentinel | undefined;
    const manager = (
      globalThis.navigator as Navigator & {
        readonly wakeLock?: ScreenWakeLockManager;
      }
    ).wakeLock;
    if (!manager) return;

    async function request() {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        sentinel = await manager.request("screen");
      } catch {
        // Best effort: browser or power policy may refuse the request.
      }
    }

    function restoreWhenVisible() {
      if (
        document.visibilityState === "visible" &&
        sentinel?.released !== false
      ) {
        void request();
      }
    }

    void request();
    document.addEventListener("visibilitychange", restoreWhenVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", restoreWhenVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}

function capabilityChecks(): readonly CapabilityCheck[] {
  return [
    {
      available:
        typeof globalThis.crypto?.randomUUID === "function" &&
        typeof globalThis.crypto?.subtle === "object",
      label: "Secure card and message cryptography",
    },
    {
      available: "indexedDB" in globalThis,
      label: "Durable table recovery",
    },
    {
      available: "BroadcastChannel" in globalThis,
      label: "Nearby browser channel",
    },
    {
      available: "structuredClone" in globalThis,
      label: "Isolated state projections",
    },
    {
      available: "locks" in globalThis.navigator || "indexedDB" in globalThis,
      label: "Exclusive Trusted Host recovery",
    },
  ];
}

function BrandBar({ aside }: { readonly aside?: ReactNode }) {
  return (
    <header className="brand-bar">
      <div className="brand-lockup">
        <span className="brand-glyph" aria-hidden="true">
          ▰
        </span>
        <div>
          <strong>HTML Poker</strong>
          <span>Digital dealer · physical chips</span>
        </div>
      </div>
      {aside}
    </header>
  );
}

function Home({
  onCreate,
  onJoinAirplane,
  onPairDisplay,
}: {
  readonly onCreate: (operatorToken?: string) => Promise<void>;
  readonly onJoinAirplane?: () => void;
  readonly onPairDisplay?: () => void;
}) {
  const checks = useMemo(capabilityChecks, []);
  const ready = checks.every((check) => check.available);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [operatorToken, setOperatorToken] = useState("");
  const relayRequiresOperatorToken = normalRelayRequiresOperatorToken();

  async function create() {
    setBusy(true);
    setError(undefined);
    try {
      await onCreate(operatorToken);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The table could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="home-shell">
      <BrandBar
        aside={<span className="build-label">Build {BUILD_VERSION}</span>}
      />
      <div className="home-layout">
        <section className="home-intro" aria-labelledby="home-title">
          <p className="section-label">For the table already in front of you</p>
          <h1 id="home-title">Deal cards. Keep poker physical.</h1>
          <p className="home-intro__copy">
            Phones hold private cards. A tablet or TV shows the board. Bets,
            chips, and conversation stay on the table.
          </p>
          <div className="deck-statement" aria-hidden="true">
            <span>52</span>
            <div>
              <strong>cards</strong>
              <small>one trusted browser</small>
            </div>
          </div>
        </section>

        <section className="start-panel" aria-labelledby="start-title">
          <div>
            <p className="section-label">Trusted Host</p>
            <h2 id="start-title">Create a table</h2>
            <p>
              This browser will shuffle, deal, and keep the authoritative hand
              history. It can read the active deck by design.
            </p>
          </div>
          <ul className="preflight-list" aria-label="Browser capability check">
            {checks.map((check) => (
              <li key={check.label} data-ready={check.available}>
                <span aria-hidden="true">{check.available ? "✓" : "×"}</span>
                {check.label}
              </li>
            ))}
          </ul>
          {!ready ? (
            <p className="inline-warning" role="alert">
              This browser cannot safely host a table. Open the HTTPS local
              preview in a current browser.
            </p>
          ) : null}
          {error ? (
            <p className="inline-warning" role="alert">
              {error}
            </p>
          ) : null}
          {relayRequiresOperatorToken ? (
            <label className="relay-token-field">
              <span>Private relay host token</span>
              <input
                autoComplete="off"
                onChange={(event) => setOperatorToken(event.target.value)}
                type="password"
                value={operatorToken}
              />
              <small>
                Used once to mint a table-limited relay ticket. It is not sent
                in player links.
              </small>
            </label>
          ) : null}
          <button
            className="button button--primary button--wide"
            disabled={
              !ready ||
              busy ||
              (relayRequiresOperatorToken && !operatorToken.trim())
            }
            onClick={() => void create()}
            type="button"
          >
            {busy ? "Preparing table…" : "Create table"}
          </button>
          <p className="privacy-line">
            No account · no analytics · no digital chip values
          </p>
          {onJoinAirplane ? (
            <button
              className="button button--quiet button--wide airplane-join-button"
              onClick={onJoinAirplane}
              type="button"
            >
              Join an Airplane table
            </button>
          ) : null}
          {onPairDisplay ? (
            <button
              className="button button--quiet button--wide airplane-join-button"
              onClick={onPairDisplay}
              type="button"
            >
              Pair this display
            </button>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function QrImage({
  label = "Player invitation QR code",
  value,
}: {
  readonly label?: string;
  readonly value: string;
}) {
  const [source, setSource] = useState<string>();
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setSource(undefined);
    setError(false);
    void QRCode.toDataURL(value, {
      color: { dark: "#19211f", light: "#ffffff" },
      errorCorrectionLevel: "L",
      margin: value.startsWith("HTMLPOKER-AIRPLANE-1:") ? 4 : 2,
      width: value.startsWith("HTMLPOKER-AIRPLANE-1:") ? 1_024 : 360,
    }).then(
      (dataUrl) => {
        if (active) setSource(dataUrl);
      },
      () => {
        if (active) setError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [value]);
  if (error) {
    return <span className="qr-error">Pairing QR could not be rendered.</span>;
  }
  return source ? <img alt={label} src={source} /> : null;
}

async function scanQrImage(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = document.createElement("img");
    await new Promise<void>((resolve, reject) => {
      const timeout = globalThis.setTimeout(
        () => reject(new Error("The QR image did not load.")),
        5_000,
      );
      image.addEventListener(
        "load",
        () => {
          globalThis.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
      image.addEventListener(
        "error",
        () => {
          globalThis.clearTimeout(timeout);
          reject(new Error("The selected QR image is unreadable."));
        },
        { once: true },
      );
      image.src = objectUrl;
    });
    const nativeDetector = (
      globalThis as typeof globalThis & {
        BarcodeDetector?: new (options: { formats: string[] }) => {
          detect(
            source: ImageBitmapSource,
          ): Promise<ReadonlyArray<{ readonly rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (nativeDetector) {
      try {
        const detected = await new nativeDetector({
          formats: ["qr_code"],
        }).detect(image);
        if (detected[0]?.rawValue) return detected[0].rawValue;
      } catch {
        // The bundled decoder below is the cross-browser fallback.
      }
    }
    const result = await new BrowserQRCodeReader().decodeFromImageElement(
      image,
    );
    return result.getText();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function cameraFailureMessage(caught: unknown): string {
  if (!globalThis.navigator.mediaDevices?.getUserMedia) {
    return "This browser cannot open a camera from this file. Use a saved QR image instead.";
  }
  if (caught instanceof DOMException) {
    if (caught.name === "NotAllowedError") {
      return "Camera access was blocked. Allow camera access, then open the scanner again.";
    }
    if (caught.name === "NotFoundError") {
      return "No camera was found on this device. Use a saved QR image instead.";
    }
    if (caught.name === "NotReadableError") {
      return "The camera is already in use by another app. Close that app, then try again.";
    }
  }
  return "The camera could not start. Use a saved QR image instead.";
}

function QrCameraScanner({
  label,
  onClose,
  onCode,
}: {
  readonly label: string;
  readonly onClose: () => void;
  readonly onCode: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop(): void } | null>(null);
  const handledRef = useRef(false);
  const onCodeRef = useRef(onCode);
  const [cameraError, setCameraError] = useState<string>();
  const [imageError, setImageError] = useState<string>();

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 500,
    });
    let active = true;
    void reader
      .decodeFromConstraints(
        {
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        },
        video,
        (result, _error, controls) => {
          if (!active || handledRef.current || !result) return;
          handledRef.current = true;
          controls.stop();
          onCodeRef.current(result.getText());
        },
      )
      .then((controls) => {
        if (!active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch((caught: unknown) => {
        if (active) setCameraError(cameraFailureMessage(caught));
      });
    return () => {
      active = false;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", closeOnEscape);
    return () => globalThis.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  async function readSavedImage(file: File) {
    setImageError(undefined);
    try {
      onCode(await scanQrImage(file));
    } catch (caught) {
      setImageError(
        caught instanceof Error
          ? caught.message
          : "The selected image does not contain a readable QR code.",
      );
    }
  }

  return (
    <div
      aria-labelledby="qr-camera-title"
      aria-modal="true"
      className="qr-camera-backdrop"
      role="dialog"
    >
      <section className="qr-camera-sheet">
        <header className="qr-camera-header">
          <div>
            <p className="section-label">Live camera</p>
            <h2 id="qr-camera-title">{label}</h2>
          </div>
          <button
            aria-label="Close camera"
            autoFocus
            className="qr-camera-close"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </header>
        <div className="qr-camera-viewfinder">
          <video autoPlay muted playsInline ref={videoRef} />
          <span className="qr-camera-corners" aria-hidden="true" />
          <p aria-live="polite">
            {cameraError ?? "Hold the QR inside the four corners."}
          </p>
        </div>
        {imageError ? (
          <p className="inline-warning" role="alert">
            {imageError}
          </p>
        ) : null}
        <div className="qr-camera-actions">
          <label className="button button--quiet qr-file-button">
            <span>Use a saved QR image</span>
            <input
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readSavedImage(file);
                event.target.value = "";
              }}
              type="file"
            />
          </label>
          <small>Nothing from the camera leaves this device.</small>
        </div>
      </section>
    </div>
  );
}

function AirplaneHostPairingCard({
  compact = false,
  label,
  role,
  runtime,
}: {
  readonly compact?: boolean;
  readonly label: string;
  readonly role: CapabilityRole;
  readonly runtime: HostTableRuntime;
}) {
  const [offer, setOffer] = useState<AirplaneOfferDetails>();
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>();
  const [scannerOpen, setScannerOpen] = useState(false);

  async function prepare() {
    setBusy(true);
    setConnected(false);
    setError(undefined);
    try {
      setOffer(await runtime.createAirplaneOffer(role));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The local pairing offer could not be created.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function accept(code: string) {
    setBusy(true);
    setError(undefined);
    try {
      await runtime.acceptAirplaneAnswer(code);
      setConnected(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The local pairing answer was rejected.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={`airplane-pairing-card${compact ? " airplane-pairing-card--compact" : ""}`}
    >
      <div className="airplane-pairing-card__qr">
        {offer ? (
          <QrImage
            label={`${label} Airplane offer QR code`}
            value={offer.code}
          />
        ) : (
          <span className="airplane-pairing-placeholder" aria-hidden="true">
            ↔
          </span>
        )}
      </div>
      <div className="airplane-pairing-card__content">
        <p className="section-label">Airplane · {label}</p>
        <h2>{offer ? "Scan this offer" : "Prepare local pairing"}</h2>
        <p>
          {offer
            ? "On the other device, open this same downloaded HTML file and choose Join an Airplane table. Use its in-page camera—not the phone's standalone Camera app—then scan the answer here."
            : "Creates a one-use, no-internet WebRTC offer. Both devices must use private Wi-Fi without client isolation."}
        </p>
        {error ? (
          <p className="inline-warning" role="alert">
            {error}
          </p>
        ) : null}
        {connected ? (
          <p className="pairing-ready" role="status">
            Direct channel paired. The other device can now join.
          </p>
        ) : null}
        <div className="button-row">
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => void prepare()}
            type="button"
          >
            {busy ? "Preparing…" : offer ? "New offer" : `Pair ${label}`}
          </button>
          {offer ? (
            <button
              className="button button--quiet"
              disabled={busy}
              onClick={() => setScannerOpen(true)}
              type="button"
            >
              {`Scan ${label} answer QR`}
            </button>
          ) : null}
        </div>
      </div>
      {scannerOpen ? (
        <QrCameraScanner
          label={`Scan ${label} answer QR`}
          onClose={() => setScannerOpen(false)}
          onCode={(code) => {
            setScannerOpen(false);
            void accept(code);
          }}
        />
      ) : null}
    </section>
  );
}

function InvitePanel({
  compact = false,
  runtime,
  snapshot,
}: {
  readonly compact?: boolean;
  readonly runtime: HostTableRuntime;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  const invitation = snapshot.invitations.player;
  const replacementSeat = invitation?.seatId
    ? snapshot.roster.seats.find((seat) => seat.seatId === invitation.seatId)
    : undefined;
  if (!snapshot.roster.joinWindowOpen && !replacementSeat) {
    return (
      <section
        className={`invite-panel${compact ? " invite-panel--compact" : ""}`}
      >
        <div className="invite-panel__content">
          <p className="section-label">Join window</p>
          <h2>New seats are paused</h2>
          <p>Existing seat recovery and device replacement still work.</p>
          <button
            className="button button--quiet"
            onClick={() => void runtime.setJoinWindow(true)}
            type="button"
          >
            Open join window
          </button>
        </div>
      </section>
    );
  }
  if (isAirplaneMode()) {
    return (
      <AirplaneHostPairingCard
        compact={compact}
        label={
          replacementSeat
            ? `Replacement for ${replacementSeat.displayName}`
            : "Player"
        }
        role="player"
        runtime={runtime}
      />
    );
  }
  if (!invitation) {
    return (
      <section
        className={`invite-panel${compact ? " invite-panel--compact" : ""}`}
      >
        <div className="invite-panel__content">
          <p className="section-label">Player invitation</p>
          <h2>All ten seats are allocated</h2>
          <p>Use player replacement from the roster if a phone changes.</p>
        </div>
      </section>
    );
  }
  const invitationLink = invitationUrl(
    globalThis.location,
    runtime,
    invitation,
  );
  const [copied, setCopied] = useState(false);

  async function copy() {
    await globalThis.navigator.clipboard.writeText(invitationLink);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <section
      className={`invite-panel${compact ? " invite-panel--compact" : ""}`}
    >
      <div className="invite-panel__qr">
        <QrImage value={invitationLink} />
      </div>
      <div className="invite-panel__content">
        <p className="section-label">
          {replacementSeat ? "Device replacement" : "Player invitation"}
        </p>
        <h2>
          {replacementSeat
            ? `Replace ${replacementSeat.displayName}'s device`
            : "Scan to take a seat"}
        </h2>
        <p>
          {replacementSeat
            ? "This one-use link keeps the seat and revokes its previous device when redeemed."
            : "Each QR works once. A player chooses their display name after opening it; no account or host approval prompt follows."}
        </p>
        <label className="invite-link">
          <span>
            {replacementSeat
              ? "Player replacement link"
              : "Player invitation link"}
          </span>
          <input readOnly value={invitationLink} />
        </label>
        <div className="button-row">
          <button
            className="button button--primary"
            onClick={() => void copy()}
            type="button"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            className="button button--quiet"
            onClick={() => void runtime.issueInvitation("player")}
            type="button"
          >
            {replacementSeat ? "Return to new seats" : "New invitation"}
          </button>
        </div>
      </div>
    </section>
  );
}

const roleInvitationDetails = [
  {
    button: "Create Public Table link",
    label: "Public Table",
    role: "public-table",
  },
  { button: "Create TV link", label: "TV", role: "tv" },
  {
    button: "Create Tablet Control link",
    label: "Tablet Control",
    role: "table-control",
  },
] as const;

function RoleInvitationCard({
  button,
  label,
  role,
  runtime,
  snapshot,
}: {
  readonly button: string;
  readonly label: string;
  readonly role: Exclude<CapabilityRole, "player">;
  readonly runtime: HostTableRuntime;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  const invitation = snapshot.invitations[role];
  const [copied, setCopied] = useState(false);
  if (!invitation) {
    return (
      <article className="role-invite-card">
        <div>
          <strong>{label}</strong>
          <small>
            {role === "table-control"
              ? "Dealer controls, never private cards"
              : "Public board and shown cards only"}
          </small>
        </div>
        <button
          className="button button--quiet"
          onClick={() => void runtime.issueInvitation(role)}
          type="button"
        >
          {button}
        </button>
      </article>
    );
  }
  const link = invitationUrl(globalThis.location, runtime, invitation);
  return (
    <article className="role-invite-card role-invite-card--ready">
      <QrImage label={`${label} invitation QR code`} value={link} />
      <div>
        <strong>{label}</strong>
        <label>
          <span>{label} invitation link</span>
          <input readOnly value={link} />
        </label>
        <div className="button-row">
          <button
            className="button button--primary"
            onClick={() => {
              void globalThis.navigator.clipboard.writeText(link).then(() => {
                setCopied(true);
                globalThis.setTimeout(() => setCopied(false), 1_500);
              });
            }}
            type="button"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            className="button button--quiet"
            onClick={() => void runtime.issueInvitation(role)}
            type="button"
          >
            Replace link
          </button>
        </div>
      </div>
    </article>
  );
}

function NormalDisplayPairingCard({
  runtime,
}: {
  readonly runtime: HostTableRuntime;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [pairedRole, setPairedRole] = useState<"public-table" | "tv">();

  async function pair(file: File) {
    setBusy(true);
    setError(undefined);
    setPairedRole(undefined);
    try {
      setPairedRole(await runtime.pairNormalDisplay(await scanQrImage(file)));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The display pairing QR could not be accepted.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="normal-display-pairing"
      aria-labelledby="normal-pair-title"
    >
      <header>
        <p className="section-label">Awkward-input display</p>
        <h3 id="normal-pair-title">Scan-pair a TV or public table</h3>
      </header>
      <p>
        The display chooses TV or Public Table first. Its one-use request QR
        grants nothing until you scan it here.
      </p>
      {error ? (
        <p className="inline-warning" role="alert">
          {error}
        </p>
      ) : null}
      {pairedRole ? (
        <p className="pairing-ready" role="status">
          {pairedRole === "tv" ? "TV" : "Public Table"} paired
        </p>
      ) : null}
      <label className="button button--quiet qr-file-button">
        <span>{busy ? "Reading QR…" : "Scan display pairing QR"}</span>
        <input
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void pair(file);
            event.target.value = "";
          }}
          type="file"
        />
      </label>
    </section>
  );
}

function RelaySessionCard({
  runtime,
  snapshot,
}: {
  readonly runtime: HostTableRuntime;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  const [operatorToken, setOperatorToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [refreshed, setRefreshed] = useState(false);
  const relaySession = snapshot.relaySession;

  if (!relaySession || isAirplaneMode()) return null;
  const minutesRemaining = Math.ceil(
    (relaySession.expiresAt - Date.now()) / 60_000,
  );
  const sessionStatus =
    minutesRemaining <= 0
      ? "Relay ticket expired"
      : `Relay ticket expires in ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"}`;

  async function refresh() {
    setBusy(true);
    setError(undefined);
    setRefreshed(false);
    try {
      await runtime.refreshRelaySession(operatorToken);
      setOperatorToken("");
      setRefreshed(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The relay ticket could not be refreshed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="relay-session-card"
      aria-labelledby="relay-session-title"
    >
      <header>
        <p className="section-label">Connection Service</p>
        <h3 id="relay-session-title">
          {relaySession.route === "private-relay"
            ? "Private relay"
            : "Cloud relay"}
        </h3>
      </header>
      <p>
        {sessionStatus}. Refresh it before reconnecting a remote player after a
        long break.
      </p>
      {error ? (
        <p className="inline-warning" role="alert">
          {error}
        </p>
      ) : null}
      {refreshed ? (
        <p className="pairing-ready" role="status">
          Relay ticket refreshed
        </p>
      ) : null}
      <label className="relay-token-field">
        <span>Private relay host token</span>
        <input
          autoComplete="off"
          onChange={(event) => setOperatorToken(event.target.value)}
          type="password"
          value={operatorToken}
        />
        <small>
          Used only to renew this table ticket. It is not saved in table
          recovery or exposed in player links.
        </small>
      </label>
      <button
        className="button button--quiet"
        disabled={busy || !operatorToken.trim()}
        onClick={() => void refresh()}
        type="button"
      >
        {busy ? "Refreshing…" : "Refresh relay ticket"}
      </button>
    </section>
  );
}

function RoleInvitations({
  runtime,
  snapshot,
}: {
  readonly runtime: HostTableRuntime;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  return (
    <section className="role-invitations" aria-labelledby="surfaces-title">
      <header>
        <p className="section-label">Room surfaces</p>
        <h3 id="surfaces-title">Displays and dealer tablet</h3>
      </header>
      {!isAirplaneMode() && normalDisplayPairingIsConfigured() ? (
        <NormalDisplayPairingCard runtime={runtime} />
      ) : null}
      {roleInvitationDetails.map((details) =>
        isAirplaneMode() ? (
          <AirplaneHostPairingCard
            compact
            key={details.role}
            label={details.label}
            role={details.role}
            runtime={runtime}
          />
        ) : (
          <RoleInvitationCard
            {...details}
            key={details.role}
            runtime={runtime}
            snapshot={snapshot}
          />
        ),
      )}
    </section>
  );
}

function SeatRoster({
  onMove,
  onRelocateDealer,
  onReplace,
  runtime,
  snapshot,
}: {
  readonly onMove?: (seatId: string, position: number) => void;
  readonly onRelocateDealer?: (seatId: string) => void;
  readonly onReplace?: (seatId: string) => void;
  readonly runtime?: HostTableRuntime;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  const orderedSeats = [...snapshot.roster.seats].sort(
    (left, right) => left.displayPosition - right.displayPosition,
  );
  return (
    <section className="roster" aria-labelledby="roster-title">
      <header>
        <div>
          <p className="section-label">Seats</p>
          <h2 id="roster-title">{snapshot.roster.seats.length} of 10 joined</h2>
        </div>
        <div className="join-window-tools">
          <span className="join-window-status">
            <i aria-hidden="true" /> Join window{" "}
            {snapshot.roster.joinWindowOpen ? "open" : "closed"}
          </span>
          {runtime ? (
            <button
              className="text-button"
              onClick={() =>
                void runtime.setJoinWindow(!snapshot.roster.joinWindowOpen)
              }
              type="button"
            >
              {snapshot.roster.joinWindowOpen
                ? "Close join window"
                : "Open join window"}
            </button>
          ) : null}
        </div>
      </header>
      {snapshot.roster.seats.length === 0 ? (
        <div className="empty-roster">
          <span aria-hidden="true">↳</span>
          <p>The first player appears here as soon as the QR is redeemed.</p>
        </div>
      ) : (
        <ol>
          {orderedSeats.map((seat, index) => (
            <li key={seat.seatId}>
              <span>{index + 1}</span>
              <div className="roster-seat-copy">
                <strong>{seat.displayName}</strong>
                <small>
                  {seat.connected
                    ? seat.state.replace("-", " ")
                    : `${seat.state.replace("-", " ")} · offline`}
                </small>
              </div>
              {onMove || onReplace || onRelocateDealer ? (
                <div className="roster-seat-actions">
                  {onMove ? (
                    <>
                      <button
                        aria-label={`Move ${seat.displayName} up`}
                        disabled={index === 0}
                        onClick={() => onMove(seat.seatId, index - 1)}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`Move ${seat.displayName} down`}
                        disabled={index === orderedSeats.length - 1}
                        onClick={() => onMove(seat.seatId, index + 1)}
                        type="button"
                      >
                        ↓
                      </button>
                    </>
                  ) : null}
                  {onRelocateDealer &&
                  snapshot.projection?.phase === "complete" &&
                  snapshot.projection.dealerSeatId !== seat.seatId ? (
                    <button
                      onClick={() => onRelocateDealer(seat.seatId)}
                      type="button"
                    >
                      Make dealer
                    </button>
                  ) : null}
                  {onReplace ? (
                    <button
                      onClick={() => onReplace(seat.seatId)}
                      type="button"
                    >
                      Replace device
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CapabilityAdministration({
  onRevoke,
  snapshot,
}: {
  readonly onRevoke: (capabilityId: string) => void;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  const activeSurfaces = snapshot.roster.capabilities.filter(
    (capability) => capability.role !== "player" && !capability.revoked,
  );
  return (
    <section className="admin-section" aria-labelledby="capabilities-title">
      <header>
        <p className="section-label">Active capabilities</p>
        <h3 id="capabilities-title">Displays and controls</h3>
      </header>
      {activeSurfaces.length === 0 ? (
        <p className="admin-section__empty">No display or tablet is paired.</p>
      ) : (
        <ul className="capability-list">
          {activeSurfaces.map((capability) => (
            <li key={capability.capabilityId}>
              <span>{capability.role.replaceAll("-", " ")}</span>
              <button
                className="text-button text-button--danger"
                onClick={() => onRevoke(capability.capabilityId)}
                type="button"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecoveryAdministration({
  onCorrect,
  onVoid,
  snapshot,
}: {
  readonly onCorrect: (eventId: string, reason: string) => void;
  readonly onVoid: (reason: string) => void;
  readonly snapshot: HostRuntimeSnapshot;
}) {
  const [correctionEventId, setCorrectionEventId] = useState(
    snapshot.history.at(-1)?.eventId ?? "",
  );
  const [correctionReason, setCorrectionReason] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const handActive = Boolean(
    snapshot.projection && snapshot.projection.phase !== "complete",
  );

  return (
    <section className="admin-section" aria-labelledby="recovery-title">
      <header>
        <p className="section-label">Append-only repair</p>
        <h3 id="recovery-title">Void and correction</h3>
      </header>
      {handActive ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            onVoid(voidReason);
            setVoidReason("");
          }}
        >
          <label>
            <span>Reason to void the active hand</span>
            <input
              maxLength={240}
              onChange={(event) => setVoidReason(event.target.value)}
              value={voidReason}
            />
          </label>
          <button
            className="button button--danger button--small"
            disabled={!voidReason.trim()}
            type="submit"
          >
            Void active hand
          </button>
        </form>
      ) : null}
      {snapshot.history.length > 0 ? (
        <form
          className="admin-form"
          onSubmit={(event) => {
            event.preventDefault();
            onCorrect(correctionEventId, correctionReason);
            setCorrectionReason("");
          }}
        >
          <label>
            <span>Event to annotate</span>
            <select
              onChange={(event) => setCorrectionEventId(event.target.value)}
              value={correctionEventId}
            >
              {[...snapshot.history].reverse().map((entry) => (
                <option key={entry.eventId} value={entry.eventId}>
                  r{entry.revision} · {entry.type}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Correction note</span>
            <input
              maxLength={240}
              onChange={(event) => setCorrectionReason(event.target.value)}
              value={correctionReason}
            />
          </label>
          <button
            className="button button--quiet button--small"
            disabled={!correctionEventId || !correctionReason.trim()}
            type="submit"
          >
            Append correction
          </button>
        </form>
      ) : null}
    </section>
  );
}

function useHostSnapshot(runtime: HostTableRuntime): HostRuntimeSnapshot {
  const [snapshot, setSnapshot] = useState(() => runtime.snapshot());
  useEffect(
    () => runtime.subscribe(() => setSnapshot(runtime.snapshot())),
    [runtime],
  );
  return snapshot;
}

function HostLobby({ runtime }: { readonly runtime: HostTableRuntime }) {
  const snapshot = useHostSnapshot(runtime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function start() {
    setBusy(true);
    setError(undefined);
    try {
      await runtime.startTable();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The first hand could not start.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (snapshot.stage === "table" && snapshot.projection) {
    return <HostTable runtime={runtime} />;
  }
  return (
    <main className="lobby-shell">
      <BrandBar
        aside={
          <div className="room-id">
            <span>Table</span>
            <code>{runtime.tableId.slice(-8)}</code>
          </div>
        }
      />
      <header className="lobby-heading">
        <p className="section-label">Join window</p>
        <h1>Waiting for players</h1>
        <p>Deal when at least two player devices have joined.</p>
      </header>
      <div className="lobby-grid">
        <InvitePanel runtime={runtime} snapshot={snapshot} />
        <SeatRoster runtime={runtime} snapshot={snapshot} />
      </div>
      <RoleInvitations runtime={runtime} snapshot={snapshot} />
      <RelaySessionCard runtime={runtime} snapshot={snapshot} />
      {error || snapshot.error ? (
        <p className="inline-warning" role="alert">
          {error ?? snapshot.error}
        </p>
      ) : null}
      <footer className="lobby-footer">
        <p>
          New players who join after dealing wait for the next hand. Keep this
          browser open as the Trusted Host.
        </p>
        <button
          className="button button--primary"
          disabled={snapshot.roster.seats.length < 2 || busy}
          onClick={() => void start()}
          type="button"
        >
          {busy ? "Committing first hand…" : "Deal first hand"}
        </button>
      </footer>
    </main>
  );
}

function downloadText(filename: string, value: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: "application/json;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.download = filename;
  anchor.href = url;
  anchor.click();
  URL.revokeObjectURL(url);
}

function HostTable({ runtime }: { readonly runtime: HostTableRuntime }) {
  const snapshot = useHostSnapshot(runtime);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [adminOpen, setAdminOpen] = useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  useScreenWakeLock(true);
  const projection = snapshot.projection;
  if (!projection) return null;

  function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    void action()
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "The table did not advance.",
        );
      })
      .finally(() => setBusy(false));
  }

  return (
    <div className="host-table-shell">
      <nav className="host-tools" aria-label="Table tools">
        <button
          aria-expanded={adminOpen}
          className="tool-button"
          onClick={() => setAdminOpen(!adminOpen)}
          type="button"
        >
          Players <span>{snapshot.roster.seats.length}</span>
        </button>
        <button
          aria-pressed={developerMode}
          className="tool-button"
          onClick={() => setDeveloperMode(!developerMode)}
          type="button"
        >
          Developer
        </button>
      </nav>
      <TableSurface
        busy={busy}
        connectionLabel={snapshot.connectionLabel}
        developerMode={developerMode}
        {...((error ?? snapshot.error)
          ? { errorMessage: error ?? snapshot.error }
          : {})}
        mode="host"
        onDownloadLog={() =>
          downloadText(
            `html-poker-${runtime.tableId}-diagnostics.json`,
            runtime.exportDiagnostics(),
          )
        }
        onEndHand={() => perform(() => runtime.endHand())}
        onRevealStreet={(street) => perform(() => runtime.revealStreet(street))}
        onStartNextHand={() => perform(() => runtime.startNextHand())}
        projection={projection}
      />
      {adminOpen ? (
        <aside className="admin-drawer" aria-label="Player administration">
          <header>
            <div>
              <p className="section-label">Off-table controls</p>
              <h2>Players</h2>
            </div>
            <button
              aria-label="Close player administration"
              onClick={() => setAdminOpen(false)}
              type="button"
            >
              ×
            </button>
          </header>
          <InvitePanel compact runtime={runtime} snapshot={snapshot} />
          <RoleInvitations runtime={runtime} snapshot={snapshot} />
          <RelaySessionCard runtime={runtime} snapshot={snapshot} />
          <SeatRoster
            onMove={(seatId, position) =>
              perform(() => runtime.setDisplayPosition(seatId, position))
            }
            onRelocateDealer={(seatId) =>
              perform(() => runtime.relocateDealer(seatId))
            }
            onReplace={(seatId) =>
              perform(() => runtime.issuePlayerReplacement(seatId))
            }
            runtime={runtime}
            snapshot={snapshot}
          />
          <CapabilityAdministration
            onRevoke={(capabilityId) =>
              perform(() => runtime.revokeCapability(capabilityId))
            }
            snapshot={snapshot}
          />
          <RecoveryAdministration
            onCorrect={(eventId, reason) =>
              perform(() => runtime.recordCorrection(eventId, reason))
            }
            onVoid={(reason) => perform(() => runtime.voidHand(reason))}
            snapshot={snapshot}
          />
        </aside>
      ) : null}
    </div>
  );
}

function useClientSnapshot(runtime: TableClientRuntime): ClientRuntimeSnapshot {
  const [snapshot, setSnapshot] = useState(() => runtime.snapshot());
  useEffect(
    () => runtime.subscribe(() => setSnapshot(runtime.snapshot())),
    [runtime],
  );
  return snapshot;
}

function PlayerExperience({
  runtime,
}: {
  readonly runtime: TableClientRuntime;
}) {
  const snapshot = useClientSnapshot(runtime);
  const playerProjection =
    snapshot.projection?.view === "seat" ? snapshot.projection : undefined;
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useScreenWakeLock(snapshot.status === "playing");

  useEffect(() => {
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      // Browsers may terminate a page before this best-effort signal reaches
      // the host. Do not close the endpoint here: pagehide also covers a
      // restorable back-forward-cache or mobile suspension.
      void runtime.setPresence(false).catch(() => undefined);
    };
    const show = () => {
      if (!hidden) return;
      hidden = false;
      setError(undefined);
      void runtime.setPresence(true).catch(() => {
        setError(
          isAirplaneMode()
            ? "Connection did not resume. Ask the host to replace this device from Players."
            : "Connection did not resume. Check the network and try the saved table again.",
        );
      });
    };
    globalThis.addEventListener("pagehide", hide);
    globalThis.addEventListener("pageshow", show);
    return () => {
      globalThis.removeEventListener("pagehide", hide);
      globalThis.removeEventListener("pageshow", show);
    };
  }, [runtime]);

  useEffect(() => {
    if (playerProjection?.self.status !== "folded-provisional") return;
    const timer = globalThis.setTimeout(() => {
      void runtime
        .performPlayer({ type: "finalize-fold" })
        .catch(() => undefined);
    }, 5_000);
    return () => globalThis.clearTimeout(timer);
  }, [runtime, playerProjection?.revision, playerProjection?.self.status]);

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await runtime.join(displayName);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "The table did not respond.",
      );
    } finally {
      setBusy(false);
    }
  }

  function perform(action: PlayerAction) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    void runtime
      .performPlayer(action)
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "The action was not accepted.",
        );
      })
      .finally(() => setBusy(false));
  }

  if (!snapshot.seat && snapshot.status !== "rejected") {
    return (
      <main className="join-shell">
        <BrandBar
          aside={<span className="secure-label">Encrypted invitation</span>}
        />
        <section className="join-card" aria-labelledby="join-title">
          <p className="section-label">Player seat</p>
          <h1 id="join-title">Join this table</h1>
          <p>Your name is only a label at this table. It is not an account.</p>
          <form onSubmit={(event) => void join(event)}>
            <label>
              <span>Display name</span>
              <input
                autoComplete="nickname"
                autoFocus
                maxLength={40}
                onChange={(event) => setDisplayName(event.target.value)}
                value={displayName}
              />
            </label>
            {error ? (
              <p className="inline-warning" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="button button--primary button--wide"
              disabled={!displayName.trim() || busy}
              type="submit"
            >
              {busy ? "Taking seat…" : "Join table"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (snapshot.status === "rejected") {
    return (
      <main className="message-shell">
        <section>
          <p className="section-label">Invitation unavailable</p>
          <h1>This seat could not be opened</h1>
          <p>
            {snapshot.error ?? "Ask the host for a fresh player invitation."}
          </p>
        </section>
      </main>
    );
  }

  if (snapshot.status === "waiting" || !playerProjection) {
    return (
      <main className="message-shell">
        <section>
          <p className="section-label">
            Seat{" "}
            {snapshot.seat?.displayPosition !== undefined
              ? snapshot.seat.displayPosition + 1
              : ""}
          </p>
          <h1>You have a seat</h1>
          <p>
            {snapshot.seat?.displayName}, keep this page open. Your cards arrive
            when the Trusted Host deals the next hand.
          </p>
          <span className="waiting-line">
            <i /> Waiting for the deal
          </span>
        </section>
      </main>
    );
  }

  return (
    <TableSurface
      busy={busy}
      connectionLabel={snapshot.connectionLabel}
      {...((error ?? snapshot.error)
        ? { errorMessage: error ?? snapshot.error }
        : {})}
      futureSittingOut={snapshot.futureSittingOut}
      mode="player"
      onFinalizeFold={() => perform({ type: "finalize-fold" })}
      onFold={() => perform({ type: "fold" })}
      onMuck={() => perform({ type: "muck" })}
      onShowCards={() => perform({ type: "show" })}
      onToggleSittingOut={(sittingOut) =>
        perform({ sittingOut, type: "set-sitting-out" })
      }
      onUndoFold={() => perform({ type: "undo-fold" })}
      projection={playerProjection}
    />
  );
}

function RoleExperience({ runtime }: { readonly runtime: TableClientRuntime }) {
  const snapshot = useClientSnapshot(runtime);
  const joinStarted = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (snapshot.status !== "joining" || joinStarted.current) return;
    joinStarted.current = true;
    void runtime.join().catch((caught: unknown) => {
      setError(
        caught instanceof Error
          ? caught.message
          : "The display could not join.",
      );
    });
  }, [runtime, snapshot.status]);

  const label =
    runtime.role === "public-table"
      ? "Public Table"
      : runtime.role === "tv"
        ? "TV"
        : "Tablet Control";

  if (snapshot.status === "rejected" || error) {
    return (
      <main className="message-shell">
        <section>
          <p className="section-label">{label}</p>
          <h1>This room surface could not be opened</h1>
          <p>{error ?? snapshot.error ?? "Ask the host for a fresh link."}</p>
        </section>
      </main>
    );
  }

  if (snapshot.status !== "playing" || !snapshot.projection) {
    return (
      <main className="message-shell">
        <section>
          <p className="section-label">{label}</p>
          <h1>Connecting to the table</h1>
          <p>The public board will appear when the Trusted Host responds.</p>
          <span className="waiting-line">
            <i /> Waiting for the host
          </span>
        </section>
      </main>
    );
  }

  function perform(action: Parameters<TableClientRuntime["performDealer"]>[0]) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    void runtime
      .performDealer(action)
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error
            ? caught.message
            : "The dealer action was not accepted.",
        );
      })
      .finally(() => setBusy(false));
  }

  return (
    <TableSurface
      busy={busy}
      connectionLabel={snapshot.connectionLabel}
      {...((error ?? snapshot.error)
        ? { errorMessage: error ?? snapshot.error }
        : {})}
      mode={
        runtime.role === "public-table"
          ? "public"
          : runtime.role === "tv"
            ? "tv"
            : "tablet"
      }
      onEndHand={() => perform({ type: "end-hand" })}
      onRevealStreet={(street) => perform({ street, type: "reveal-street" })}
      onStartNextHand={() => perform({ type: "start-next-hand" })}
      projection={snapshot.projection}
    />
  );
}

function AirplaneJoin({
  onCancel,
  onReady,
}: {
  readonly onCancel: () => void;
  readonly onReady: (runtime: TableClientRuntime) => void;
}) {
  const [pairing, setPairing] = useState<{
    readonly answerCode: string;
    readonly runtime: TableClientRuntime;
  }>();
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [scannerOpen, setScannerOpen] = useState(false);

  async function readOffer(code: string) {
    pairing?.runtime.close();
    setPairing(undefined);
    setBusy(true);
    setError(undefined);
    try {
      setPairing(await TableClientRuntime.fromAirplaneOffer(code));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The Airplane offer could not be opened.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!pairing) return;
    setBusy(true);
    setError(undefined);
    try {
      await pairing.runtime.join(
        pairing.runtime.role === "player" ? displayName : undefined,
      );
      onReady(pairing.runtime);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The direct Airplane channel did not open.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="airplane-join-shell">
      <BrandBar
        aside={<span className="secure-label">No internet mode</span>}
      />
      <section className="airplane-join-card">
        <div>
          <p className="section-label">Airplane pairing</p>
          <h1>
            {pairing ? "Show the answer to the host" : "Scan the host offer"}
          </h1>
          <p>
            {pairing
              ? "The host scans this answer on their device. Then join over the direct local WebRTC channel."
              : "Point this device's camera at the offer QR shown by the Trusted Host. It is decoded only on this device."}
          </p>
        </div>
        <div className="airplane-join-card__pairing">
          {pairing ? (
            <QrImage
              label="Airplane answer QR code"
              value={pairing.answerCode}
            />
          ) : (
            <button
              className="airplane-scan-target"
              disabled={busy}
              onClick={() => setScannerOpen(true)}
              type="button"
            >
              <span>{busy ? "Reading QR…" : "Scan host offer QR"}</span>
              <small>Opens the camera</small>
            </button>
          )}
        </div>
        {pairing?.runtime.role === "player" ? (
          <label className="airplane-name-field">
            <span>Display name</span>
            <input
              autoComplete="nickname"
              maxLength={40}
              onChange={(event) => setDisplayName(event.target.value)}
              value={displayName}
            />
          </label>
        ) : null}
        {error ? (
          <p className="inline-warning" role="alert">
            {error}
          </p>
        ) : null}
        <div className="button-row">
          <button
            className="button button--quiet"
            onClick={() => {
              pairing?.runtime.close();
              onCancel();
            }}
            type="button"
          >
            Cancel
          </button>
          {pairing ? (
            <button
              className="button button--primary"
              disabled={
                busy ||
                (pairing.runtime.role === "player" && !displayName.trim())
              }
              onClick={() => void join()}
              type="button"
            >
              {busy ? "Connecting…" : "Join after host scans"}
            </button>
          ) : null}
        </div>
      </section>
      {scannerOpen ? (
        <QrCameraScanner
          label="Scan host offer QR"
          onClose={() => setScannerOpen(false)}
          onCode={(code) => {
            setScannerOpen(false);
            void readOffer(code);
          }}
        />
      ) : null}
    </main>
  );
}

function NormalDisplayJoin({
  onCancel,
  onReady,
}: {
  readonly onCancel: () => void;
  readonly onReady: (runtime: TableClientRuntime) => void;
}) {
  const [error, setError] = useState<string>();
  const [pairing, setPairing] = useState<NormalDisplayPairingRequest>();

  useEffect(
    () => () => {
      pairing?.cancel();
    },
    [pairing],
  );

  function prepare(role: "public-table" | "tv") {
    pairing?.cancel();
    setError(undefined);
    try {
      const request = createNormalDisplayPairingRequest(role);
      setPairing(request);
      void request.waitForInvitation().then(
        (details) => onReady(TableClientRuntime.fromInvitation(details)),
        (caught: unknown) => {
          setError(
            caught instanceof Error
              ? caught.message
              : "The display pairing did not complete.",
          );
        },
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The display pairing could not start.",
      );
    }
  }

  const label = pairing?.role === "tv" ? "TV" : "Public Table";
  return (
    <main className="airplane-join-shell">
      <BrandBar aside={<span className="build-label">Normal pairing</span>} />
      <section className="airplane-join-card">
        <div>
          <p className="section-label">Display pairing</p>
          <h1>
            {pairing ? `Show this ${label} request` : "Pair this display"}
          </h1>
          <p>
            {pairing
              ? "Show this short-lived request to the host. It can only become the role chosen below after the host scans it."
              : "Choose a public display role. A dealer tablet always needs its own explicit invitation."}
          </p>
        </div>
        {pairing ? (
          <div className="airplane-join-card__pairing">
            <QrImage
              label={`${label} display pairing QR code`}
              value={pairing.code}
            />
            <span className="waiting-line">
              <i /> Waiting for the host scan
            </span>
          </div>
        ) : null}
        {error ? (
          <p className="inline-warning" role="alert">
            {error}
          </p>
        ) : null}
        <div className="button-row">
          <button
            className="button button--quiet"
            onClick={() => {
              pairing?.cancel();
              onCancel();
            }}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button--quiet"
            onClick={() => prepare("public-table")}
            type="button"
          >
            Pair as Public Table
          </button>
          <button
            className="button button--primary"
            onClick={() => prepare("tv")}
            type="button"
          >
            Pair as TV
          </button>
        </div>
      </section>
    </main>
  );
}

export function App() {
  const initialRoute = useMemo(
    () => ({
      clientRecovery: parseClientRecovery(globalThis.location.hash),
      hostRecovery: parseHostRecovery(globalThis.location.hash),
      invitation: parseInvitation(globalThis.location.hash),
    }),
    [],
  );
  const [hostRuntime, setHostRuntime] = useState<HostTableRuntime>();
  const [clientRuntime, setClientRuntime] = useState<
    TableClientRuntime | undefined
  >(() =>
    initialRoute.invitation
      ? TableClientRuntime.fromInvitation(initialRoute.invitation)
      : undefined,
  );
  const [booting, setBooting] = useState(
    Boolean(initialRoute.hostRecovery || initialRoute.clientRecovery),
  );
  const [bootError, setBootError] = useState<string>();
  const [airplaneJoinOpen, setAirplaneJoinOpen] = useState(false);
  const [normalDisplayJoinOpen, setNormalDisplayJoinOpen] = useState(false);

  useEffect(() => {
    if (initialRoute.invitation) return;
    let active = true;
    async function recover() {
      try {
        if (initialRoute.hostRecovery) {
          const runtime = await HostTableRuntime.recover(
            initialRoute.hostRecovery,
          );
          if (active) setHostRuntime(runtime);
          else runtime.close();
        } else if (initialRoute.clientRecovery) {
          const runtime = await TableClientRuntime.recover(
            initialRoute.clientRecovery,
          );
          if (active) setClientRuntime(runtime);
          else runtime.close();
        }
      } catch (caught) {
        if (active) {
          setBootError(
            caught instanceof Error
              ? caught.message
              : "Saved table recovery failed safely.",
          );
        }
      } finally {
        if (active) setBooting(false);
      }
    }
    void recover();
    return () => {
      active = false;
    };
  }, [initialRoute]);

  useEffect(() => {
    return () => {
      hostRuntime?.close();
      clientRuntime?.close();
    };
  }, [clientRuntime, hostRuntime]);

  if (clientRuntime) {
    return clientRuntime.role === "player" ? (
      <PlayerExperience runtime={clientRuntime} />
    ) : (
      <RoleExperience runtime={clientRuntime} />
    );
  }
  if (hostRuntime) return <HostLobby runtime={hostRuntime} />;
  if (airplaneJoinOpen) {
    return (
      <AirplaneJoin
        onCancel={() => setAirplaneJoinOpen(false)}
        onReady={(runtime) => {
          setAirplaneJoinOpen(false);
          setClientRuntime(runtime);
        }}
      />
    );
  }
  if (normalDisplayJoinOpen) {
    return (
      <NormalDisplayJoin
        onCancel={() => setNormalDisplayJoinOpen(false)}
        onReady={(runtime) => {
          setNormalDisplayJoinOpen(false);
          setClientRuntime(runtime);
        }}
      />
    );
  }
  if (booting) {
    return (
      <main className="message-shell">
        <section>
          <p className="section-label">Encrypted recovery</p>
          <h1>Restoring this table</h1>
          <p>Validating the last committed state and exclusive authority…</p>
        </section>
      </main>
    );
  }
  if (bootError) {
    return (
      <main className="message-shell">
        <section>
          <p className="section-label">Recovery stopped safely</p>
          <h1>This saved table cannot be opened</h1>
          <p>{bootError}</p>
          <button
            className="button button--quiet"
            onClick={() => {
              const url = new URL(globalThis.location.href);
              url.hash = "";
              globalThis.location.assign(url);
            }}
            type="button"
          >
            Return home
          </button>
        </section>
      </main>
    );
  }
  return (
    <Home
      onCreate={async (operatorToken) => {
        const runtime = await HostTableRuntime.createNew(
          operatorToken ? { operatorToken } : {},
        );
        replaceWithHostRecoveryUrl(globalThis.location, runtime.tableId);
        setHostRuntime(runtime);
      }}
      {...(isAirplaneMode()
        ? { onJoinAirplane: () => setAirplaneJoinOpen(true) }
        : {})}
      {...(!isAirplaneMode() && normalDisplayPairingIsConfigured()
        ? { onPairDisplay: () => setNormalDisplayJoinOpen(true) }
        : {})}
    />
  );
}
