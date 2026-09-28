#!/usr/bin/env node
// Design-token drift guard (DESIGN.md → Do's and Don'ts).
//
// The palette is declared twice on purpose: sandbox/theme.ts feeds antd's token
// system and the `:root` block of sandbox/design.css feeds the bespoke layer.
// Nothing stops those two lists from drifting, and a drifted pair shows up as two
// slightly different greys standing in the same role. This check fails when they
// disagree, so the fix is a one-line edit rather than a design review.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const themeSrc = readFileSync(fileURLToPath(new URL("sandbox/theme.ts", root)), "utf8");
const cssSrc = readFileSync(fileURLToPath(new URL("sandbox/design.css", root)), "utf8");

/** antd token (or `Component.token`) → the CSS custom property holding its value. */
const PAIRED = {
  colorPrimary: "--lens",
  colorInfo: "--lens",
  colorLink: "--lens",
  colorError: "--reticle",
  colorTextBase: "--graphite",
  colorText: "--graphite",
  colorTextSecondary: "--graphite-2",
  colorTextTertiary: "--muted",
  colorBorder: "--line",
  colorBorderSecondary: "--line-2",
  colorBgLayout: "--bg",
  colorBgContainer: "--panel",
  colorBgElevated: "--panel",
  "Segmented.trackBg": "--bg",
  "Segmented.itemSelectedBg": "--lens",
  "Segmented.itemSelectedColor": "--panel",
  "Segmented.itemHoverBg": "--lens-soft",
  "Segmented.itemHoverColor": "--graphite",
  "Progress.defaultColor": "--lens",
  "Slider.trackBg": "--lens",
  "Slider.handleColor": "--lens",
};

const cssVars = Object.fromEntries(
  [...cssSrc.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)].map(([, k, v]) => [k, v]),
);

// Only look inside the token/component blocks of theme.ts, not comments.
const hexOf = (token) => {
  const dotted = token.includes(".");
  const [component, key] = dotted ? token.split(".") : [null, token];
  const scope = component
    ? new RegExp(`${component}:\\s*\\{([\\s\\S]*?)\\}`, "m").exec(themeSrc)?.[1] ?? ""
    : themeSrc;
  return new RegExp(`\\b${key}\\s*:\\s*"(#[0-9a-fA-F]{3,8})"`, "i").exec(scope)?.[1];
};

const drift = [];
for (const [token, cssVar] of Object.entries(PAIRED)) {
  const js = hexOf(token);
  const css = cssVars[cssVar];
  if (!js || !css) {
    drift.push(`${token} / var(${cssVar}): not found (js=${js ?? "-"}, css=${css ?? "-"})`);
  } else if (js.toLowerCase() !== css.toLowerCase()) {
    drift.push(`${token} is ${js} in theme.ts but ${css} for var(${cssVar}) in design.css`);
  }
}

if (drift.length) {
  console.error("Design token drift between sandbox/theme.ts and sandbox/design.css:\n");
  for (const line of drift) console.error(`  - ${line}`);
  console.error("\nAlign both sides, or update DESIGN.md if the roles really changed.");
  process.exit(1);
}
console.log(`design tokens OK — ${Object.keys(PAIRED).length} paired values agree`);
