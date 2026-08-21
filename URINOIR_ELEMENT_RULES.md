# Urinoir — Installationselement & Steuerung Rules — Template

Fill in the `[ ]` brackets. Everything else was read out of `custom-data.json`; correct it
if it's wrong, otherwise leave it. Save and tell me in chat.

Sister document to `INSTALLATION_ELEMENT_RULES.md`. **Agreed so far:**
element **and** Steuerung are both in scope · the element is chosen by a RULE from the
urinal's flush class (not a user list).

**External source:** §2 was corrected against SABAG's public catalogue
(sabag.teamonline.ch), which pre-configures its urinals with the matching Geberit element.
Only the factual pairings were taken — which article goes with which — and every art-Nr
below is OUR own, cross-checked by specification and price.

---

## IMPLEMENTED — 2026-08-20

Shipped as `modules/rules/linkUrinoirElement.js` + `scripts/reconcile-urinoir.js --write`
(idempotent), covered by `tests/verify-urinoir-rules.js` (50 assertions, in `npm test`).
Summary in INSTRUCTIONS.md §2. **45 of 49 urinals now carry an element chain**; four
correctly carry none.

**Revised 2026-08-21** after review — four changes, all live and verified in the browser:
**one element per urinal** plus `bau115` (no menu of frames); **opting out of the element
parks the Steuerung on "Ohne"** as a one-shot, leaving the dropdown selectable for a
plate-only replacement; **nothing is shortened** — every row carries its `description` so
`fullLabel` can stitch it, and a dropdown row repeats the selected option's full text under
the (clipping) `<select>`; and the **BOM order below**, now a shared table
(`urinoirBomBucket`) that the runtime and the reconciler both read.

Two decisions Reji made before the build:
- ~~The Steuerung group opens on "Ohne Urinoirsteuerung" and the user picks~~ — **superseded
  2026-08-21: §3.1 is `3451 106.100.000`,** HyTronic IR Typ01 square, Netzbetrieb, Weiss.
  Weiss is the triplet `100` (COLOUR RULE), which is the whole reason this needed care —
  each base is stored under a different finish, so the base's own art-Nr is chrome. Every
  finish is now its own option (25 in the dropdown) and "Ohne" moved to the end.
- **All 49 urinals in scope**, deriving the 11 the competitor never configured.

### ⚠ §2's water+control table did not survive contact with the evidence

Measured against the 38 known pairings, **§2's table reproduces 23 (64%)**. It over-corrected:
§2 concluded the series lists in the element descriptions were "EXAMPLES, not an exclusive
compatibility list", which is true — but they are not noise either. `3612 405` says "für
Urinoirs Tamaro" and every Tamaro-S in the evidence takes it.

The split that carries those series lists is **Anlage vs. bare ceramic**:

| | Element | Because |
| :-- | :-- | :-- |
| `Urinoiranlage` (control + valve in the box) | `3612 406`, or `3612 405` for a Tamaro-S | needs no Rohbauset and no water fitting |
| `Urinoir` (bare ceramic), same series | `3612 403` | the element must bring water AND rough-in |

Lema `3411 125` (Anlage) takes `3612 406` while Lema `3411 126` (ceramic) takes `3612 403` —
one series, two elements, which is why no series-only table ever worked. **This rule
reproduces 36 of 38 (95%)**; the two it misses are the two urinals the evidence gives NO
element, which no text can predict. It is used only where evidence is absent.

### The 9 derived pairings — REVIEW THESE

No competitor ever configured them, so these are the rule's inference, not a fact. Every
other Duofix urinal element sits in the dropdown beside them, so a wrong one is one click
to fix — but a wrong DEFAULT still reaches a Stückliste.

| Urinal | Element | Route |
| :-- | :-- | :-- |
| `3411 524` Urinoiranlage Tamaro Geberit | `3612 402` | ohne-steuerung + Tamaro → Typ 144, as its sibling ceramic `3421 103` |
| `3421 105` Tamaro-S 60 | `3612 402` | bare ceramic + Tamaro |
| `3419 215` KWC Campus wasserlos | `3612 406` | no water |
| `3421 204` / `214` / `224` Preda / Selva / Tamina wasserlos | `3612 406` | no water |
| `3421 310` Schmidlin Ecopur 100 wasserlos | `3612 406` | no water |
| `3421 315` / `316` Schmidlin Ecopur 200 W / S | `3612 403` | still flushes, so water + Rohbauset |

The Schmidlin Ecopur three are the weakest: they are STEEL urinals shipping their own
Montageplatte, Befestigungsmaterial und Schürze, and whether they mount on a Duofix frame
at all is not something our data states.

### §5.3 ANSWERED — the three Tamaro Anlagen

Not by a ruling but by their own descriptions, which is why it never needed one:

- `3411 513` — "Urinoiranlage Tamaro Geberit-**Kombifix** …"
- `3411 516` — "Urinoiranlage Tamaro Geberit-**Duofix** …"

The element is INSIDE the art-Nr. Attaching another would order a second CHF 634 frame into
the same wall, so both get **no element chain** — but both still get a **Steuerung**, because
the same sentence ends "für Steuerung Hytronic/HyTouch". `3411 524` names no system and takes
`3612 402` by derivation. FULL-TEXT: not one of the three states its system in the label.

### One bug this surfaced, fixed on the way

The Steuerung's default IS an "Ohne" row, and an "Ohne" row renders its code cell as `-`
(`isNoneArtNr`). The export guard tests for a code STARTING WITH "ohne", so it never saw
the art-Nr, and a dash passes every other arm — **`-⇥1` shipped to SAP**. Pre-existing and
not urinal-specific: any Wandklosett or Standklosett row parked on "Ohne" did the same.
`_shared.js#copyBOMToClipboard` and `createGlassApp` already guarded `code !== "-"`;
`createWCApp` did not. Now guarded in all three, statically.

### NOT in this pass

The catalogue's other 30-odd parts — Trennwand (CHF 976 ×3 finishes), Urinoirdeckel,
Absaugesiphon, Einlaufmanschette, Steckdichtung. Most already come from SAP's own accessory
data on the tray. This pass is the installation-element chain only. Six art-Nrs the
catalogue named resolve to nothing in our pools (`2112 889` / `890`, `2121 198`, `2147 198`,
`2317 387`, `3441 120`) and were never injected.

---

## 0. Why this one is harder than the WC (context, no answer needed)

For a Wandklosett, one element (`3612 348`) fits nearly every ceramic — the only variable
is Ausladung. **A urinal's element is model- and control-specific**, and the elements say so
in their own text:

| Element | CHF | States |
| :-- | --: | :-- |
| `3612 406` | 492 | "für Urinoirs **Lema, Tamaro-VS New, Caprino Plus**" |
| `3612 405` | 701 | "für Urinoirs **Tamaro**" |
| `3612 404` | 701 | "für **integrierte** Steuerung" — Preda / Selva |
| `3612 407` | 634 | "für **Urinoirsteuerungen**" — Preda / Selva |
| `3612 403` | 634 | Typ 112/130 — "Rohbauset für Steuerung **Hytronic und HyTouch**" |
| `3612 402` / `3612 412` | 634 / 628 | Typ 144 — same Rohbauset, height 144 cm |
| `3100 113` (Ineo) | 442 | "für Urinale **ohne** integrierte Steuerung" |
| `3100 114` (Ineo) | 332 | "für Urinale **mit** integrierter Steuerung **und wasserlos**" |
| `3622 100/102/103` (Tece) | 402–428 | same mit/ohne split |

Ineo and Tece are **hidden by decision** (see the WC rules §1.2), so in practice only the
`3612 4xx` Duofix range is selectable.

---

## 1. Flush class — the axis everything hangs off

I classified all 41 urinals from label + description (FULL-TEXT RULE). **Please verify this
table — the element choice is derived from it, so a wrong class here orders a wrong element.**

Two traps were already found and fixed while building it:
- `3421 202` reads "**Netzanschluss**", not "Netzbetrieb" — it was landing in the wrong class.
- `3411 513/516/524` are labelled **`Urinoiranlage`** but their text says "**für** Steuerung
  Hytronic/HyTouch" — they do NOT include one. That's the partner-reference trap: the label
  prefix says system, the description says it still needs a control.

### A · `integriert` — 18 (ceramic + control in one, needs NO separate Steuerung)
`3411 102` · `3411 104` · `3411 105` · `3411 106` · `3411 125` · `3411 128` · `3411 131` ·
`3411 133` · `3421 144` · `3421 146` · `3421 147` · `3421 148` · `3421 202` · `3421 203` ·
`3421 212` · `3421 213` · `3421 222` · `3421 223`

### B · `ohne-steuerung` — 15 (bare ceramic, REQUIRES a separate Steuerung)
`3411 126` · `3411 134` · `3411 513` · `3411 516` · `3411 524` · `3421 103` · `3421 105` ·
`3421 120` · `3421 125` · `3421 142` · `3421 143` · `3421 160` · `3421 201` · `3421 211` ·
`3421 221`

### C · `wasserlos` — 6 (no water, no control)
`3411 127` · `3419 215` · `3421 204` · `3421 214` · `3421 224` · `3421 310`

### D · `hybrid` — 2 (Schmidlin Ecopur, steel — Hybridventil but still flushes)
`3421 315` ("Wartungsspülung automatisch alle 8 h") · `3421 316` ("programmierbare
Benutzerspülung")

**Is class D right, or does it belong with wasserlos / ohne-steuerung?** `[ …………………… ]`

---

## 2. Flush class → element — CORRECTED from an external cross-check (2026-08-19)

My first draft matched by SERIES. That was wrong. Evidence from SABAG's public catalogue
(sabag.teamonline.ch), which pre-configures its urinals:

- Geberit's own text for the Typ 112-130 element reads **"für Urinal, universell"**.
- SABAG recommends `Urinalelement DUOFIX Typ 112-130` for a **Duravit** urinal — a series
  no Sanitas element names. So **the series lists in our descriptions are EXAMPLES, not an
  exclusive compatibility list.** That is why there was never a compatibility table to find.
- The same element name appears at **two different prices** — CHF 618 and CHF 480 — and the
  cheaper one is recommended for the **waterless** variant of the very same urinal.

That second point is the real discriminator, and our own catalogue agrees exactly:

| SABAG | CHF | Ours | CHF | Water connection |
| :-- | --: | :-- | --: | :-- |
| Urinalelement DUOFIX Typ 112-130 | 618 | `3612 403` | 634 | **Absperrventil ½"** |
| Urinalelement DUOFIX Typ 112-130 | 480 | `3612 406` | 492 | **none** |

**The element is chosen by WATER + CONTROL, not by series:**

| Class | Element | Why |
| :-- | :-- | :-- |
| A `integriert` | **`3612 404`** (CHF 701) | water + "für **integrierte** Steuerung" |
| B `ohne-steuerung` | **`3612 403`** (CHF 634) | water + "Rohbauset für Steuerung Hytronic und HyTouch" — matches SABAG's 618 pick |
| C `wasserlos` | **`3612 406`** (CHF 492) | the only Duofix with **no** water connection — matches SABAG's 480 pick |
| D `hybrid` | `[ 3612 403 ? — it still flushes, so it needs water ]` | |

Confirm the table above: `[ …………………… ]`

**2.1 — Height.** All of the above are Typ 112/130. `3612 402` / `3612 412` are the Typ 144
versions. When does a job take 144 cm? `[ …………………… ]`

**2.2 — `3612 405` and `3612 407`** (both CHF 701 / 634, water, naming Tamaro resp.
Preda/Selva) are then **redundant** under a water+control rule. Keep them selectable, or
drop them from the rule? `[ …………………… ]`

**2.3 — SABAG also recommends, alongside the element:**
- **Quertraverse für Zulauf ½" mit Anschlussbogen** (CHF 189) — only on the WATER urinal;
  absent on the waterless one. Our equivalent: `[ …………………… ]`
- **Schallschutz ISO-SET** (CHF 31) — on **both**. Our equivalent: `[ 3381 …? ]`
- Wandankerset DUOFIX (CHF 41) — offered, not pre-selected.

Should the rule inject these too? `[ Quertraverse: M/O/– · Schallschutz: M/O/– · Wandanker: M/O/– ]`

---

## 3. Steuerung — EVIDENCE FROM THE SABAG SCRAPE (2026-08-19)

Full data: `st-scraper/sabag-urinal-mapping.json`. Method: 113 SABAG urinal pages →
101 GTINs → resolved on **our own profishop** → our art-Nrs. SABAG prices discarded;
every number below is ours.

**The element is DETERMINISTIC.** All 100 urinals that get an element are offered
**exactly one** — never a choice:

| Element | Urinals | CHF |
| :-- | --: | --: |
| `3612 403` Typ 112/130, Rohbauset für Hytronic/HyTouch | 49 | 634 |
| `3612 406` (no water connection) | 25 | 492 |
| `3612 404` für integrierte Steuerung | 13 | 701 |
| `3612 407` für Urinoirsteuerungen | 9 | 634 |
| `3612 402` Typ 144 | 2 | 634 |
| `3612 405` Höhe 112, Tamaro | 2 | 701 |
| *(no element offered)* | 13 | — |

**Two companions ride with EVERY element (100/100):**
- **`3461 110`** Schallschutz Iso-Set Hafner **Urinoir** (CHF 27.50) — note this is the
  urinal-specific Schallschutz, not the WC one.
- **`3612 500`** Rückwandbefestigungssatz (CHF 42.50) — the *same* article the WC rules use.

**The Steuerung ladder** — offered on 60 of 100, nine articles, always as a set:

| Our art-Nr | Type | CHF |
| :-- | :-- | --: |
| `3451 106` / `3451 109` | HyTronic IR Typ01 **square** — Netz / Batterie | 1225 |
| `3451 148` / `3451 158` | HyTronic IR Typ01 **round** — Netz / Batterie | 1225 |
| `3451 100` / `3451 103` | HyTronic IR round **easy-to-clean** | 1225 |
| `3451 114` | HyTouch Typ01 square, Betätigungsplatte (pneumatic) | 350 |
| `3451 168` / `3451 174` | HyTouch Typ01 round (+ easy-to-clean) | 346 |

**`3451 172` / `3451 173` Rohbau-Set für Urinal-Spülauslösungen** (CHF 291) appears on
**55** — it is the rough-in box the controls need. `173` is the Preda/Selva/Tamina variant.

**3.1 — Which Steuerung is the default?** The scrape shows all nine offered together, so
SABAG makes no default. HyTronic is CHF 1225, HyTouch CHF 346–350 — a real commercial
choice. `[ HyTronic … / HyTouch … / no default, user picks ]`

**3.2 — Is the Rohbau-Set automatic with a Steuerung?** It rides along on 55 of the 60.
`[ M with any Steuerung / O ]`

**3.4a — PFLICHTTEILE (Reji, 2026-08-20): "If a urinal can get an element then
`3612 500` and `3612 272` are must haves."**

Any urinal that takes an element takes BOTH with it, unconditionally:
- `3612 500` Rückwandbefestigungssatz (CHF 42.50) — the same article as the WC rules.
- `3612 272` Anschlussbogen Geberit-Silent (CHF 36) — "für Waschtisch-, Bidet- und
  Urinoirelement", the same article the Waschtisch rules already inject.

SABAG only ever listed `3612 500`; the Anschlussbogen was on **none** of the 113 configured
urinals. 46 of 48 element-bearing urinals needed it added. **This is a rule, not a per-model
pairing** — it keys off "has an element", nothing else, so the three urinals without one
(Lema `3411 128`, Taro-Uni `3421 125`) correctly get neither.

**3.4 — TWO EXCLUSION RULES (Reji, 2026-08-20).** Both correct SABAG's own configuration —
they list parts that the element already covers, which would double-order them:

- **Rohbau-Set `3451 172` / `173` is DROPPED when the element already bundles it.** The test is
  the element's own text: `3612 402` and `3612 403` read "**Rohbauset für Steuerung** Hytronic
  und HyTouch"; the set is inside them. 18 of the 21 positions SABAG listed fall away. It stays
  on the 3 urinals whose element is `3612 407`, whose description mentions no Rohbauset.
- **Dübelschraube `8211 112` is DROPPED as soon as an element is set.** The screws fix a urinal
  straight to the wall; with an element it hangs on the element's threaded bolts instead.
  34 of 35 positions fall away — and the rule is self-confirming: the single urinal that keeps
  them, Taro-Uni `3421 125`, is the only one in the whole set with **no** element.

**3.4b — GEBERIT-EIGENE SERIEN KOMMEN KOMPLETT (Reji, 2026-08-20).**
**Preda · Selva · Tamina** are Geberit's own urinals and ship with everything — Sifon,
Ablaufsieb, Adapteraufnahme, Befestigungsset and Schallschutz are all in the box.
**Only the element is needed**, plus the two Pflichtteile from §3.4a.

That is why their SAP `additionalMaterials` Zubehör list is EMPTY while other series have one —
the empty list was the signal, not a data gap. 9 urinals, 10 positions each dropped.

The **Steuerung stays** on the variants whose element is `3612 407` (`3421 201` / `211` / `221`):
those ceramics have no integrated control, and a rough-in frame is not a flush control. That is
my call, not Reji's words — reverse it if the control also ships with the ceramic.

**3.5 — RESOLVED: the Spülrohr is a NO-ELEMENT part, not an error.** `3432 115` (Spülrohr
Geberit-UP, "zu Urinoir Casa mit Direktspülung") is removed from every composition in this
catalogue — but only because every one of them has an element. Reji, 2026-08-20:

> "That's the Val without elektronische Steuerung. If you are combining without an element
> then it could be combined with that bogen."

So our SAP is right to list it on Laufen Val `2112 887` / `888`: those are the variants **without**
electronic control, and fixed straight to the wall they genuinely take it. I had recorded this as
an error in our own data — it is not.

**This makes it the second member of a class**, alongside `8211 112` Dübelschraube (§3.4):
parts that belong to the WALL-MOUNTED case and drop away the moment an element is set. Any
future rule should treat "no element" as a real installation mode with its own parts list,
not merely as the absence of one. Verified: all 15 rows that lost `3432 115` have an element;
the 3 element-less rows (Lema `3411 128` ×2, Taro-Uni `3421 125`) never carried it.

**3.6 — `article.ws` NEEDS NO LOGIN.** CLAUDE.md states the profishop `article.ws` GET_DETAILS
endpoint requires a SAP session cookie. It does not — `POST /business(<session>)/webservices/
article.ws` with `event=GET_DETAILS&matnr=<full art-Nr>` answers anonymously and returns SAP's
own `additionalMaterials`, grouped `Z = Zubehör` · `M = Montage` · `E = Ersatzteile` ·
`S = Stücklisten`. That is OUR curated accessory list per article and it is far tighter than
SABAG's — Fizz `3421 160` gets 2 parts where SABAG offered 5, and Tamaro `3421 103` names
`3471 307` / `3471 311`, which SABAG never listed at all. `3432 115` ("zu Urinoir **Casa** mit Direktspülung",
CHF 72) still stands on 13 urinals — Alessi One, Fizz, Lema `3411 126`, Starck 1, Subway,
Tamaro, Val. **None of them is a Casa.** It was replaced by `3612 272` on Caprino Plus at
Reji's instruction; whether it should simply be dropped from the other 13 is unconfirmed.

**3.3 — Confirmed by you:** `347192` Absauge-Urinal Lema → **`3612 406` + `3612 419`**,
independently reproduced by the scrape.

---

## 4. BOM order — SETTLED (Reji, 2026-08-21)

```
 1. Steuerung               (always — it is what the wall is roughed in for)
 2. Urinal
 3. Schrauben               (only when NO element is selected)
 4. Schallschutz
 5. Siphon                  (if not already included in the ceramic)
 6. Einlaufmanschette       (if not already included in the ceramic)
 7. Element
 8. Rückwandbefestigung
 9. Anschlussbogen
10. misc.                   — ohne as default
```

Implemented as `urinoirBomBucket()` in `modules/rules/linkUrinoirElement.js`, on a scale of
10 so a part can be slotted between two without renumbering: Steuerung 10 · Rohbau-Set 15 ·
**Urinal 20** · Schrauben 30 · Schallschutz 40 · Siphon/Ablauf 50 · Einlauf 60 · Element 70 ·
Rückwandbefestigung 80 · Anschlussbogen 90 · Quertraverse/Zubehörset 95 · misc 100.
`createWCApp` imports it rather than keeping its own chain.

Two details the list implies and the code makes explicit:
- **The Steuerung heads the list unconditionally**, "Ohne" included. It briefly dropped to
  misc in that case, back when "Ohne" was the DEFAULT and a row at the top saying nothing
  was noise; with HyTronic preselected, "Ohne" is a deliberate choice and belongs where the
  reader looks for it.
- **"ohne as default" is a REORDER**, not a stored selection: `options[0]` is what every
  seeding path takes. Only the misc bucket — 9 groups today (8 Steckdichtung, 1
  Urinoirschutzsieb). The element's own "Ohne" stays LAST, because the element IS the
  default.

---

## 5. Open questions

**5.1 — ~~Waterless urinals have no Duofix element~~ — RESOLVED.** I had assumed class C
needed the hidden Ineo/Tece elements because only those say "wasserlos". Wrong: `3612 406`
is the Duofix with **no water connection**, and SABAG recommends exactly that article
(their CHF 480 vs our 492) for a waterless urinal. No brand needs un-hiding.

**5.2 — 19 of 41 urinals carry no mounting groups at all** (the whole Preda / Selva / Tamina
/ Vila range). They have no Absaugesiphon, no Dübelschraube, nothing. Is that correct, or is
their accessory data simply missing? `[ correct / data gap ]`

**5.3 — `3411 513/516/524` are Geberit-KOMBIFIX Anlagen.** Kombifix is hidden. Do these three
get a Duofix element instead, or are they excluded? `[ …………………… ]`

**5.4 — Is the opt-out the same `bau115` text position** as the WC? `[ yes / no ]`
