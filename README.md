# Floggy

eCrew to logbook. No retyping. Floggy-Go browser tools (iPad, iPhone, Mac) and the Floggy Mac app, moving eCrew data into LogTen Pro.

**Site:** https://qxav8r.github.io

| Tool | What it does | Version |
|---|---|---|
| [Floggy-Go Schedule](https://qxav8r.github.io/go/schedule/) | eCrew Personal Crew Schedule CSV → LogTen | v0.9.3 |
| [Floggy-Go Logbook](https://qxav8r.github.io/go/logbook/) | eCrew Pilot Logbook CSV → LogTen | v0.9.2 |
| [Floggy-Go Flifo](https://qxav8r.github.io/go/flifo/) (beta) | Look up a flight: actual out/in times and tail from Alaska flight status → LogTen (via a Cloudflare Worker relay) | v2.0 |
| [Floggy-Go Help](https://qxav8r.github.io/go/help/) | Quick start and what every switch means | |
| [Floggy](https://qxav8r.github.io/floggy/) | The Mac app: downloads, User Guide, Gatekeeper help. Builds live in [QXAV8R/floggy releases](https://github.com/QXAV8R/floggy/releases) | v2.6 |

## Privacy

Your files never leave your device. The pages read the report in your browser and hand the flights straight to LogTen. Nothing is uploaded or stored.

## Repository layout

```
index.html          home page
img/                Floggy plane liveries (green home, red Schedule, blue Logbook, teal Flifo, purple Help, orange Floggy)
go/schedule/        Floggy-Go Schedule
go/logbook/         Floggy-Go Logbook
go/flifo/           Floggy-Go Flifo page (flifo.js kept for the earlier loader bookmark)
go/help/            Floggy-Go Help
floggy/             Floggy Mac app page, Interface Guide PDF
floggy/help/        Floggy User Guide (2.6)
floggy/gatekeeper/  First-launch / Gatekeeper guide
floggy-go-skd/, floggy-go-lbk/, help/, flifo-test/   old addresses: redirect to the new ones (flifo-test/flifo.js kept for early bookmarks)
```

## Changes

- **10/31/26** Floggy-Go Flifo v2.0: a normal web page (no bookmark). Looks up Alaska flight status through a Cloudflare Worker relay (`flifo.bv9dzyr6ws.workers.dev`), which returns only the leg fields Flifo uses.
- **10/31/26** Renamed to Floggy-Go Schedule / Logbook / Flifo / Help under /go/ (old addresses redirect); home page leads with Floggy.
- **10/31/26** Floggy page with download links to the QXAV8R/floggy releases, the User Guide (2.6) and a Gatekeeper web guide; eCrew menu paths added to the Floggy Go help.
- **10/31/26** Floggy plane liveries on every page; "All Tools / Home" link; Flifo moved to a hosted loader (v1.4); Help page phone layout.
- **10/30/26** Site launched with Floggy Go Lbk v0.9 and Skd v0.9; Skd v0.9.1 stops prefilling deadhead actual times; Help page added.

## Flifo relay

The relay code lives in Cloudflare (Workers & Pages → flifo) and is copied in `relay/worker.js` for reference. It only answers requests from qxav8r.github.io.

---

Unofficial personal tools. Not affiliated with or endorsed by Alaska Airlines, Horizon Air or LogTen Pro.
