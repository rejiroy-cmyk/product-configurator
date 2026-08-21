# Urinoir ↔ Duofix — SABAG-Abgleich (2026-08-20)

Raw material behind `URINOIR_ELEMENT_RULES.md` §2–§3.6 and the Urinoir Montagekatalog.
Kept because it took a scrape of 148 competitor pages plus 214 profishop lookups to build,
and it lived only in a session scratchpad until now.

| File | What it holds |
| :-- | :-- |
| `prod-element.json` | SABAG product-Nr → our Duofix element art-Nr (113 rows) |
| `prod-acc.json` | SABAG product-Nr → full accessory set, our art-Nrs (51 rows we carry) |
| `urinal-self.json` | SABAG product-Nr → [name, sub, GTIN] (113) |
| `urinal-ours.json` | urinal GTIN → our art-Nr (51 resolved of 113) |
| `gen.js` + `style.css` | build the catalogue HTML from `/tmp/cat-data.json` |
| `pdf.js` | strips masthead+Regelwerk, renders A4 PDF via puppeteer |

**How the pairing was established:** each accessory set came from that urinal's OWN SABAG
product page, so the link is the page identity, not a parse. Every GTIN was then resolved on
our own profishop (`search.ws`, `event=SEARCH`) so no SABAG art-Nr or price survives here.

**`article.ws` needs no login** — `POST /business(<session>)/webservices/article.ws` with
`event=GET_DETAILS&matnr=<full art-Nr>` returns SAP's own `additionalMaterials`
(`Z` Zubehör · `M` Montage · `E` Ersatzteile · `S` Stücklisten). That contradicts CLAUDE.md,
which says a SAP session cookie is required. It is the authoritative accessory source and is
tighter than SABAG's.

Nothing here has been injected into `custom-data.json`.
