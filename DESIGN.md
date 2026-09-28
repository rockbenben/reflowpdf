---
version: 1.0.0
name: ReflowPDF
description: >
  Design contract for the ReflowPDF browser demo ("Optical Instrument" direction).
  antd 6 is the interaction and accessibility substrate; the visual identity comes
  from the token set in sandbox/theme.ts plus the bespoke layer in sandbox/design.css.
  Captured from those two files and from computed styles measured at 1440x900 and
  390x844 on the built page.
fonts:
  display: "'Space Grotesk', 'Inter', system-ui, sans-serif"
  body: "'Inter', system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace"
colors:
  # Confirmed: each value appears in BOTH sandbox/theme.ts (antd token) and the
  # `:root` block of sandbox/design.css as the same literal.
  primary: "#1466B3" # lens blue — antd colorPrimary / colorInfo / colorLink
  on-primary: "#FFFFFF" # selected Segmented item, primary button label
  ink: "#141A1E" # graphite — antd colorText / colorTextBase
  ink-secondary: "#4A555C" # lede and formula body text
  ink-muted: "#646E75" # captions and mono micro-labels — AA-safe on canvas and surface
  canvas: "#EEF1F3" # page background — antd colorBgLayout
  surface: "#FFFFFF" # panels and cards — antd colorBgContainer / colorBgElevated
  hairline: "#D3DADE" # 1px structural borders — antd colorBorder
  hairline-soft: "#E5EAED" # inner dividers — antd colorBorderSecondary
  primary-soft: "#E3EEF8" # Segmented hover fill, loupe gradient
  accent: "#C43A31" # reticle red — antd colorError, formula emphasis, privacy dot
  specimen: "#AEB7BD" # decorative micro-type only, never informational
typography:
  display-lg:
    fontFamily: display
    fontSize: 48px
    fontWeight: 600
    lineHeight: 50px
    letterSpacing: -0.96px
  heading-md:
    fontFamily: display
    fontSize: 19px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: -0.19px
  title-sm:
    fontFamily: display
    fontSize: 18px
    fontWeight: 600
    lineHeight: 26px
    letterSpacing: 0px
  body-lg:
    fontFamily: body
    fontSize: 16px
    fontWeight: 400
    lineHeight: 25px
    letterSpacing: 0px
  body-md:
    fontFamily: body
    fontSize: 15px
    fontWeight: 400
    lineHeight: 23px
    letterSpacing: 0px
  body-control:
    fontFamily: display
    fontSize: 15px
    fontWeight: 500
    lineHeight: 23px
    letterSpacing: 0px
  body-sm:
    fontFamily: body
    fontSize: 13.5px
    fontWeight: 400
    lineHeight: 21px
    letterSpacing: 0px
  caption-lg:
    fontFamily: mono
    fontSize: 12.5px
    fontWeight: 400
    lineHeight: 19px
    letterSpacing: 0px
  caption-md:
    fontFamily: mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: 0.96px
  caption-sm:
    fontFamily: mono
    fontSize: 11.5px
    fontWeight: 400
    lineHeight: 17px
    letterSpacing: 1.84px
  caption-xs:
    fontFamily: mono
    fontSize: 10.5px
    fontWeight: 400
    lineHeight: 15px
    letterSpacing: 0.84px
  button-lg:
    fontFamily: display
    fontSize: 16px
    fontWeight: 600
    lineHeight: 24px
    letterSpacing: 0.16px
  specimen-xs:
    fontFamily: body
    fontSize: 8.5px
    fontWeight: 400
    lineHeight: 13px
    letterSpacing: 0.2px
rounded:
  none: 0px
  sm: 8px # Segmented borderRadiusSM and small marks
  md: 10px # antd borderRadius — every interactive control, tool cards, alerts
  lg: 12px # antd borderRadiusLG — drop zone
  xl: 14px # hero and converter panel shells
  full: 9999px # the two lens motifs only
spacing:
  # The layout is fluid; entries give the resolved clamp() endpoints.
  x-0: 0px
  x-1: 4px
  x-2: 5px
  x-3: 8px
  x-4: 10px
  x-5: 12px
  x-6: 13px
  x-7: 16px
  x-8: 18px
  x-9: 22px
  x-10: 26px
  x-11: 30px
  x-12: 46px
  page-gutter: 30px
  panel-padding-x: 32px
  hero-cell-padding: 46px
  content-max-width: 1120px
components:
  button-primary:
    typography: button-lg
    height: 52px
    rounded: md
    backgroundColor: primary
    textColor: on-primary
    padding: 0px 24px
  button-primary-disabled:
    typography: button-lg
    height: 52px
    rounded: md
    backgroundColor: "#F5F5F5"
    textColor: ink-muted
  segmented-option:
    typography: body-control
    height: 46px
    rounded: md
    backgroundColor: canvas
    textColor: ink
  drop-zone:
    typography: title-sm
    rounded: lg
    backgroundColor: canvas
    textColor: ink
    padding: 32px
  text-input:
    typography: body-md
    height: 42px
    rounded: md
    backgroundColor: surface
    textColor: ink
  panel:
    rounded: xl
    backgroundColor: surface
    padding: 32px
  tool-card:
    typography: body-md
    rounded: md
    backgroundColor: surface
    textColor: ink
    padding: 14px 16px
  alert:
    typography: body-md
    rounded: md
    backgroundColor: surface
    textColor: ink
    padding: 12px 16px
---

# ReflowPDF design contract

## Overview

ReflowPDF enlarges and reflows PDFs for phone reading, entirely in the browser. The
visual direction is "Optical Instrument": a light, precise measurement surface —
cool white panels, graphite ink, one lens blue, one reticle red, hairline rules and
monospaced micro-labels — that must not read as default antd.

The converter is a reusable component (`src/ui/PdfToMobile.tsx`) with its own string
dictionary; the demo shell around it lives in `sandbox/`. antd supplies every
interactive control and its accessibility behaviour; this contract governs how those
controls are dressed.

## Colors

`primary` is the only action colour: the run button, the selected segment, focus and
hover borders. `accent` (reticle red) is deliberately scarce — antd error surfaces,
the emphasised terms in the optical formula, and the privacy dot — and must never
become a second brand colour. `ink-muted` carries every mono caption, which puts it
on the tightest contrast budget in the system because those captions are 11–12px.

**Contrast floor (WCAG 2.1 AA, measured):** any text/background pair that carries
information must reach **4.5:1**. Two palette values previously failed it:
`ink-muted` at 3.72:1 on `surface` and 3.28:1 on `canvas`, and `accent` at 4.38:1 /
3.86:1. This contract sets them to `#646E75` (5.21:1 / 4.59:1) and `#C43A31`
(5.25:1 / 4.63:1) so they clear the floor on both light backgrounds.

`specimen` (2.04:1) stays below the floor **by design** — it is decorative texture
that demonstrates column magnification. It must therefore always be `aria-hidden`
and must never be the only carrier of a message.

## Typography

Three families, each with one job: `display` (Space Grotesk) for headlines and
control labels, `body` (Inter) for prose, `mono` (JetBrains Mono) for micro-labels
and numerals. Mono text is uppercase with 0.08–0.18em tracking and is always
secondary information.

Chinese falls back through `PingFang SC` / `Microsoft YaHei`. Any fixed-size Latin
container must be checked with CJK text: CJK glyphs do not break on spaces, so a
caption that fits in English can orphan a single character in Chinese.

## Layout

One centred column, `content-max-width: 1120px`, with a fluid page gutter of
`clamp(16px, 4vw, 30px)`. Panels pad with `clamp(16px, 3vw, 32px)`; hero cells with
`clamp(28px, 4vw, 46px)`.

Two breakpoints are load-bearing: the hero grid collapses to one column at 900px,
and the tool grid goes 4 → 2 columns there. The phone viewport is a **primary**
context for this product — it exists to make documents readable on phones — so the
header must survive 390px without wrapping a label to one character per line. The
section labels in the header are decorative (they are not links), so below 640px the
two section names collapse while the privacy claim and the language toggle stay.

Vertical rhythm is carried by hairlines and 1px dividers rather than by shadows or
background changes.

## Elevation & Depth

Elevation is rare. Hairlines do the separation; three shadows exist and no more:

- `ring` — `0 0 0 6px rgba(20, 26, 30, 0.05)`, the loupe halo.
- `lift-md` — `0 14px 26px -18px rgba(20, 102, 179, 0.5)`, tool card hover.
- `lift-lg` — `0 22px 40px -18px rgba(20, 26, 30, 0.5)`, the loupe itself.

Primary buttons and cards are explicitly shadowless (`primaryShadow: "none"`,
`boxShadowTertiary: "none"`); adding a shadow to an antd control is a deviation.

## Shapes

Radii cluster tightly: `md` (10px) for anything interactive, `lg`/`xl` (12/14px) for
shells, `full` only for the two lens motifs. Borders are 1px `hairline`, with 1.5px
reserved for the drop zone frame and the lens rings. Feature code must not invent a
new radius or border weight — add a token here first.

## Components

- antd provides every interactive control. Do not hand-roll buttons, selects,
  toggles, progress, alerts or uploads. Restyle through `sandbox/theme.ts` tokens
  first and `sandbox/design.css` selectors second.
- Sizing rhythm comes from the antd tokens: `controlHeight: 42`,
  `controlHeightLG: 52`, Segmented `controlHeight: 46`.
- Anything visible in the converter needs a `zh` **and** an `en` entry in
  `src/ui/messages.ts`. Labels painted from CSS `content` are not localised and are
  a defect, not a shortcut.
- Focus must remain visible on bespoke surfaces (tool cards, lens marks). antd
  controls already ship a focus ring; bespoke elements must not remove it.
- Motion is limited to short hover transitions and must collapse entirely under
  `prefers-reduced-motion`.

## Do's and Don'ts

- **Do** keep `sandbox/theme.ts` and the `:root` block of `sandbox/design.css`
  byte-identical for shared palette values; `npm run audit:design` fails the build
  when they drift.
- **Do** add a new size to the token tables above before using it in feature code.
- **Do** re-check contrast after changing any colour: 4.5:1 on both `surface` and
  `canvas` for text that carries meaning.
- **Don't** inline design values (colours, radii, fixed heights) in TSX `style`
  props; they bypass the contract and cannot be themed.
- **Don't** add `!important` to beat an antd rule without recording the measured
  specificity conflict next to it.
- **Don't** introduce a second blue, a second red, or a grey outside the four ink
  and two hairline values.
- **Don't** let decorative micro-type carry information.
