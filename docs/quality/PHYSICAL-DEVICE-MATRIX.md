# Physical-device candidate matrix

This file is a protocol and receipt template. An unchecked item is **Unknown**, not failed and not passed. Automated failures must be fixed before this matrix is run.

Record candidate commit, build/version, date/time zone, device model, OS, browser, installation mode, network, operator, result, minimized evidence path, and issue ID for every row.

| Surface | Required scenario | Current candidate |
|---|---|---|
| iPhone Player | join, private reveal/hide, app switch, 2/10/30-minute foreground catch-up, next hand without reload, explicit reconnect | Unknown |
| iPhone host + player | background host, return, host resumes first, My Hand catches up, another display reconnects | Unknown |
| iPad Tablet | all four corners, upper orientation, slider drag, secondary panel, Full Screen, 200% text | Unknown |
| Android Player | compact cards, no overlap, app switch, next hand without reload | Unknown |
| Airplane | WAN removed, private Wi-Fi, camera and saved-image two-way QR, 2–10 seats, Public Table, zero external requests | Unknown |
| Relay restart | host refreshes ticket, old link fails clearly, fresh link rejoins, live clients catch up | Unknown |
| TV | distance readability, pairing, reconnect, non-touch input | Unknown |
| China | representative fixed/mobile/hotel routes and operational/legal review | Unknown; no support claim |

Physical-device evidence adds to the deterministic browser suite. It never excuses a geometry, screenshot, overflow, semantics, or interaction failure already reproducible in automation.
