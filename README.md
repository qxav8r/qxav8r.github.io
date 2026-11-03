# Floggy

eCrew to logbook. No retyping. Floggy-Go browser tools (iPad, iPhone, Mac) and the Floggy Mac app, moving eCrew data into LogTen Pro.

**Site:** https://qxav8r.github.io

| Tool | What it does | Version |
|---|---|---|
| [Floggy-Go Schedule](https://qxav8r.github.io/go/schedule/) (beta) | eCrew Personal Crew Schedule CSV → LogTen, CSV for other logbooks, and Flights / Duty / Day calendar files (.ics) for upcoming legs | v1.2 |
| [Floggy-Go Logbook](https://qxav8r.github.io/go/logbook/) (beta) | eCrew Pilot Logbook CSV → LogTen, and CSV for other logbooks | v1.2 |
| [Floggy-Go Flifo](https://qxav8r.github.io/go/flifo/) (beta) | Look up a flight: actual out/in times and tail from Alaska flight status → LogTen (via a Cloudflare Worker relay) | v2.2 |
| [Floggy-Go Pairing](https://qxav8r.github.io/go/pairing/) (beta) | eCrew Pairing Details web archive → trip rig (Calculate Rig), legs with crew and training codes → LogTen, the rest of the month from the eCrew dashboard, CSV for other logbooks, and Flights / Duty / Trip calendar files (.ics) | v1.2 |
| [Floggy-Go Flighty](https://qxav8r.github.io/go/flighty/) (beta) | Flighty "Export Flights" CSV → actual out/in times and tail → LogTen, one year at a time (other airlines optional, as deadheads), and CSV for other logbooks | v0.4 |
| [Floggy-Go Help](https://qxav8r.github.io/go/help/) | Quick start and what every switch means | |
| [Floggy](https://qxav8r.github.io/floggy/) | The Mac app: downloads, User Guide, Gatekeeper help. Builds live in [QXAV8R/floggy releases](https://github.com/QXAV8R/floggy/releases) | v2.6 |

## Privacy

Your files never leave your device. The pages read the report in your browser and hand the flights straight to LogTen. Nothing is uploaded or stored.

## Repository layout

```
index.html          home page
img/fleet/          page header planes: <page>-e175.webp and <page>-q400.webp (one is picked at random on each load)
img/                original E175 liveries (plane-<color>.webp)
_art/               art sources, not published (Q400 3D scene and render script in _art/q400-3d)
go/schedule/        Floggy-Go Schedule
go/logbook/         Floggy-Go Logbook
go/flifo/           Floggy-Go Flifo page (flifo.js kept for the earlier loader bookmark)
go/pairing/         Floggy-Go Pairing (rig, LogTen, calendar); go/rig/ redirects here
go/flighty/         Floggy-Go Flighty
go/help/            Floggy-Go Help
go/shared/          source of the shared leg cards / day tree and export folds (CSV, Calendar), inlined into the pages by build_exports.py
floggy/             Floggy Mac app page, Interface Guide PDF
floggy/help/        Floggy User Guide (2.6)
floggy/gatekeeper/  First-launch / Gatekeeper guide
floggy-go-skd/, floggy-go-lbk/, help/, flifo-test/   old addresses: redirect to the new ones (flifo-test/flifo.js kept for early bookmarks)
```

## Header fleet

Every page header shows the Floggy E175 or the Floggy Q400, picked at random on each load. Each page keeps its color, and both planes carry its tail number. The digits follow the type (N175 jet, N400 turboprop), and the letters follow the tool:

| Page | Color | Tail numbers |
|---|---|---|
| Home, Floggy | green, orange | N175FG · N400FG |
| Schedule | red | N175SK · N400SK |
| Logbook | blue | N175LB · N400LB |
| Pairing | yellow | N175PR · N400PR |
| Flifo | teal | N175FF · N400FF |
| Flighty | pink | N175FT · N400FT |
| Help | purple | N175HP · N400HP |

## Changes

- **11/02/26** Header fleet: the Floggy Q400 joins the E175, built in the same 3D cartoon style. It has a high wing, T-tail, chin inlets and six-blade props, and comes in all eight colors. Each page now shows one of the two planes at random, with a tail number for its tool (see Header fleet).
- **11/02/26** Floggy-Go Pairing v1.2: every fold starts closed; Trip Pay moved from the summary card into the Rig fold (and its header).
- **11/02/26** Floggy-Go Pairing v1.1: page reorganized. Trip summary always showing (pairing, dates, route, Trip Pay), then folds in this order: Pairing legs, Rig (final credit, REG bucket, Flights in LBase and the three explanations together), Rest of the month (Dashboard), Send to LogTen, Add to Calendar, Export CSV. Each fold header carries a short summary; open/closed is remembered per device. Pairing legs use the same day headers and Show switch as Schedule and Logbook.
- **11/02/26** Floggy-Go Schedule v1.2 and Logbook v1.2: legs grouped by **day**, days by **block** (consecutive work days, ending after a day off or a day that ends at base); Logbook keeps months on top. Day headers show date, legs and kinds of duty; a **Show: Blocks · Days · All** switch (blocks by default); checkboxes on every header for picking a block or a single day; headers with a warning inside in the warning color. Pairing and Flighty unchanged. Shared leg-card code now lives in go/shared/fgo-ui.*.
- **11/02/26** Floggy-Go Flifo v2.2: future dates limited to 2 days ahead (Alaska shows no further; checked in the page because iOS ignores the date picker's limits), and if Alaska answers with another day's flight it is refused instead of loaded (that showed today's actuals as "Arrived" for a flight days away). Note text corrected.
- **11/02/26** Floggy-Go Pairing v1.0: reads the eCrew **dashboard** in the same saved page (port of Floggy's getDashBoardData / convertNGobject), so the rest of that month's trips and duties appear in a collapsed "Rest of the month (Dashboard)" fold, stacked by trip number and single duty, unchecked to start. The opened pairing wins: Dashboard only fills a blank time on a matching leg, and a time that differs is flagged. **Training codes** (getTrainingEvents / getTrainingData) on every leg, sent to LogTen like Floggy-Go Schedule. Past-midnight flight dates follow Floggy's 10/19/26 rule. Return legs of a same-number turn get the outbound leg's crew (Floggy's addCrewToFlts / flipcrew rule). The rig still uses the opened pairing only. Fixed: Pairing's CSV export left out duty off times.
- **11/01/26** Export folds below the LogTen section. All four import pages (Schedule v1.1, Logbook v1.1, Pairing v0.9, Flighty v0.4) get **Export CSV for another logbook**: ForeFlight (draft layout), Logbook Pro, MyFlightbook or a plain spreadsheet, from the checked legs, with a preview, per-target columns and formats, UTC conversion by station, a note on what each report can’t supply, and settings remembered on the device. Schedule also gets **Add to Calendar**: Flights, Duty and Day (one all-day event per duty day, "PDX SEA") for upcoming legs only, with Floggy’s event IDs. Pairing keeps its own calendar (with Trip).
- **11/01/26** Floggy-Go Flifo v2.1: every departed leg has an editable ATA (In) box (prefilled with Alaska's On time once landed, empty before), with the right date past midnight.
- **11/01/26** All four import pages (Schedule v1.0, Logbook v1.0, Pairing v0.8, Flighty beta v0.3) share one layout: options folded under "Options" in the same order, collapsible leg cards grouped by trip / duty day / month, and big sends split into parts of 100. All Floggy-Go tools labelled beta; Flighty added to the landing page. Shared code lives in each page (inlined from one source). Logbook gets a Tail option; Flighty gets the Flight number code (other airlines keep their own code) and the same aircraft type choices.
- **10/31/26** Floggy-Go Pairing v0.7 (beta): one eCrew pairing web archive → trip rig (port of Floggy's Calculate Rig, with the TAFB and late-leg fixes), legs with crew → LogTen, and Flights / Duty / Trip .ics files matching Floggy's Cal – ICS (same event IDs). Added to the home page and Help.
- **10/31/26** Floggy-Go Flifo v2.0: a normal web page (no bookmark). Looks up Alaska flight status through a Cloudflare Worker relay (`flifo.bv9dzyr6ws.workers.dev`), which returns only the leg fields Flifo uses.
- **10/31/26** Renamed to Floggy-Go Schedule / Logbook / Flifo / Help under /go/ (old addresses redirect); home page leads with Floggy.
- **10/31/26** Floggy page with download links to the QXAV8R/floggy releases, the User Guide (2.6) and a Gatekeeper web guide; eCrew menu paths added to the Floggy Go help.
- **10/31/26** Floggy plane liveries on every page; "All Tools / Home" link; Flifo moved to a hosted loader (v1.4); Help page phone layout.
- **10/30/26** Site launched with Floggy Go Lbk v0.9 and Skd v0.9; Skd v0.9.1 stops prefilling deadhead actual times; Help page added.

## Flifo relay

The relay code lives in Cloudflare (Workers & Pages → flifo) and is copied in `relay/worker.js` for reference. It only answers requests from qxav8r.github.io.

---

Unofficial personal tools. Not affiliated with or endorsed by Alaska Airlines, Horizon Air or LogTen Pro.
