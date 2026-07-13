# Catalogue Inspection — 2026.6 Sanitas Troesch

Exhaustive font-aware re-parse of the catalogue PDF (all 8 chapters) + profishop API enrichment.
Rebuilt because the original catalog JSON was lossy (dropped ~half the art-Nrs, as Ch4 proved).

## Overview

| Ch | Title | Pages | Products | Bases | API✓ | Mount arts | Status |
|---|---|---|---|---|---|---|---|
| 1 | Baden, Duschen, Wellness | 26-447 | 1111 | 3890 | 2015 | 120 | PARTIAL — badewanne /  |
| 2 | Keramik – Waschtische, Klosetts, Bidets, | 453-695 | 1090 | 2187 | 1462 | 15 | PARTIAL — waschtisch / |
| 3 | Einzelsanitärapparate und Installationss | 699-828 | 973 | 1046 | 977 | 22 | UNINJECTED (scraped on |
| 4 | Accessoires, Waschraum, Haltegriffe, Bad | 830-1092 | 1667 | 2194 | 0 | 0 | DONE — injected into z |
| 5 | Spiegelschränke, Spiegel, Lichtspiegel,  | 1097-1262 | 654 | 1374 | 0 | 0 | DONE — injected into z |
| 6 | Armaturen, Duschsysteme, Armaturen-Steue | 1272-1810 | 2672 | 3093 | 2733 | 222 | PARTIAL — mischer (bad |
| 7 | Waschen, Trocknen – Waschtröge, Ausgussb | 1811-1862 | 331 | 435 | 394 | 4 | PILOT — waschtrog pilo |
| 8 | Ablaufanschlüsse, Dichtung, Reinigungsma | 1863-1874 | 101 | 133 | 118 | 0 | UNINJECTED (not scrape |

**Totals:** 8599 products · 14352 distinct base art-Nrs · 7699 API-enriched.

## Uninjected chapters — where the opportunity is

### Ch1 — Baden, Duschen, Wellness
PARTIAL — badewanne / duschenwanne / duschtrennwand / badeabtrennung / duschenrinne exist; Wellness (Whirl/Dampf/Sauna) & other bath products UNINJECTED
- 3890 base art-Nrs, 2015 enriched, 988 with mounting materials. See `ch1-report.md`.

### Ch2 — Keramik – Waschtische, Klosetts, Bidets, Urinoirs, Möbel
PARTIAL — waschtisch / wandklosett / standklosett exist; Waschtischmöbel, Bidets, Urinoirs UNINJECTED
- 2187 base art-Nrs, 1462 enriched, 1330 with mounting materials. See `ch2-report.md`.

### Ch3 — Einzelsanitärapparate und Installationssysteme
UNINJECTED (scraped only 305 of ~1046 bases)
- 1046 base art-Nrs, 977 enriched, 339 with mounting materials. See `ch3-report.md`.

### Ch6 — Armaturen, Duschsysteme, Armaturen-Steuerungen
PARTIAL — mischer (bade/dusche/waschtisch) exist; Duschsysteme & Steuerungen UNINJECTED
- 3093 base art-Nrs, 2733 enriched, 1860 with mounting materials. See `ch6-report.md`.

### Ch7 — Waschen, Trocknen – Waschtröge, Ausgussbecken, Wassererwärmer
PILOT — waschtrog pilot only; Wassererwärmer, Ausgussbecken & rest UNINJECTED
- 435 base art-Nrs, 394 enriched, 157 with mounting materials. See `ch7-report.md`.

### Ch8 — Ablaufanschlüsse, Dichtung, Reinigungsmaterial
UNINJECTED (not scraped)
- 133 base art-Nrs, 118 enriched, 8 with mounting materials. See `ch8-report.md`.

