# Shower Tray Siphon & Cover Rules Template

Please fill in the missing rules within the brackets `[ ]`. Once you save this file, let me know in the chat and I will read it to implement the exact mappings.

---

## 1. Brand & Series to Siphon Family Mapping
Specify which siphon model family is compatible with each shower tray family.

| Manufacturer / Series | Primary Siphon Art. Nr. | Fallback Siphon Art. Nr. | Does it have an Integrated Cover? (Yes/No) |
| :--- | :--- | :--- | :--- |
| **Kaldewei Superplan** | `[1313 271.501.000]` *(KA 90 waagrecht)* | `[1313 273.501.000]` *(KA 90 senkrecht)* | `[ Yes ]` |
| **Kaldewei Superplan Classic**| `[1313 271.501.000]` | `[1313 273.501.000]` | `[Yes]` |
| **Kaldewei Superplan Zero**   | `[1313 271.501.000]` | `[1313 273.501.000]` | `[Yes]` |
| **Kaldewei Cayonoplan**       | `[1313 271.501.000]` *(KA 90 waagrecht)* | `[1313 273.501.000]` *(KA 90 senkrecht)* | `[ Yes (Chrom cover included) ]` |
| **Kaldewei Conoflat**         | `[1313 274.000.000]` | `[1313 276.000.000]` | `[  No  ]` |
| **Kaldewei Duschplan**        | `[1313 271.501.000]` | `[1313 273.501.000]` | `[ Yes]` |
| **Kaldewei Calima**           | `[1313 277.501.000]` | `[none]` | `[ No]` |
| **Kaldewei Sanidusch**        | `[1421 111.501.000]` | `[none]` | `[ Yes]` |
| **Schmidlin Floor** | `[1311 701.000.000]` *(Schmidlin Flow)*  | `[None]`    | `[ No ]` |
| **Schmidlin Contura** | `[1422 223.000.000]` *(Viega Tempoplex Plus)*| `[None]`    | `[ No ]` |
| **Schmidlin Swiss Line**      | `[1422 117.000.000]`  | `[none]` | `[ No ]` |
| **Schmidlin Sehr tief 15**      | `[1421 111.501.000]`  | `[none]` | `[ Yes]` |
| **Schmidlin Superflach 2.5 / 3.5 / Tief 6.5 / Vario**      | `[1422 117.000.000]`  | `[1311 701.000.000]` | `[ No ]` |
| **Laufen Pro**        | `[1171 405.000.000]` *(Laufen Pro)*     | `[none]` | `[ Yes (Integrated) ]` |
| **Laufen Pro S**        | `[1425 561.000.000]` *(Laufen Pro S)*     | `[none]` | `[ Yes (Integrated) ]` |
| **Alterna Ecoplan**   | `[1422 117.000.000]` *(Geberit d90)*    | `[none]` | `[ No ]` |
| **Alterna Loa**   | `[1311 701.000.000]` *(Schmidlin Flow)*    | `[none]` | `[ No ]` |
| **Schmidlin Viva**   | `[1311 701.000.000]`   | `[none]` | `[ No ]` |


---

## 2. Siphon to Ablaufdeckel (Cover) Compatibility
When a siphon does *not* include an integrated cover, we must present the user with compatible cover options. 

| Siphon Art. Nr. & Name | Compatible Cover Art. Nrs. | Standard/Default Cover Art. Nr. |
| :--- | :--- | :--- |
| **`1313 271` / `273`** *(Kaldewei KA 90)* | `1313 281.100.000` (Weiss)<br>`1313 281.536.000` (Weiss Matt)<br>`1313 281.536.184` (Weiss matt)(Secure)<br>`1313 281.100.184` (Weiss)(Secure)<br> `1313 281.100.185`(Weiss)(Invisible Grip)` | `[none / included]*` |
| **`1313 277`** *(Kaldewei KA 300)* | `1313 284.100.185` (Weiss)(Invisible Grip)<br>`1313 284.535.185` (Pergamon)<br>`1313 284.536.185` (Weiss Matt)<br>`[Other:                ]` | `[1313 284.100.185]*` |
| **`1313 277.501.000`** *(Kaldewei KA 120)* | `1313 282.100.000` (Weiss)<br>`1313 282.536.000` (QWeiss matt)<br>`1313 282.536.184` (Weiss Matt)(Secure)<br>`[Other:                ]` | `[1313 282.100.000]*` |
| **`1311 701.000.000`** *(Schmidlin Flow)* | `1311 699.100.000` (Weiss)<br>`1311 699.536.000` (Weiss matt)<br>`[Other:                ]` | `[1311 699.100.000]` |
| **`1422 117.000.000`** *(Geberit d90)* | `1422 118.100.000` (Weiss)<br>`1422 118.501.000` (Chrom)<br>`[Other:                ]` | `[1422 118.501.000]` (Chrom)|
| **`1422 223.000.000`** *(Viega Tempoplex Plus)* | `1311 698.501.000` (Chrom)<br>`1311 699.536.000` (Weiss matt)<br>`[Other:                ]` | `[1311 698.100.000]` |

*\* "none" indicates that the siphon's own default chrome cover is used.*

---