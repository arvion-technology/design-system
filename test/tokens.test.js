import test from "node:test";
import assert from "node:assert/strict";
import {
  BRAND, PRIMITIVES, THEMES, FONTS, TYPE_SCALE, SPACING, RADIUS, ELEVATION,
  MOTION, BREAKPOINTS, A11Y_PAIRS, baseVariables, colorVariables, cssVariables,
  themeCSS, tokenMaps, TOKEN_GROUPS,
} from "../src/tokens.js";
import { parseColor } from "../src/contrast.js";

test("both themes expose exactly the same semantic keys", () => {
  const dark = Object.keys(THEMES.dark).sort();
  const light = Object.keys(THEMES.light).sort();
  assert.deepEqual(dark, light);
  assert.equal(dark.length, 29);
});

test("every semantic token has a value and a description", () => {
  for (const theme of ["dark", "light"]) {
    for (const [key, token] of Object.entries(THEMES[theme])) {
      assert.ok(token.value, `${theme}.${key} has no value`);
      assert.ok(token.description.length > 12, `${theme}.${key} description is too thin`);
    }
  }
});

test("semantic colour values parse as CSS colours", () => {
  for (const theme of ["dark", "light"]) {
    for (const [key, token] of Object.entries(THEMES[theme])) {
      assert.doesNotThrow(() => parseColor(token.value), `${theme}.${key}: ${token.value}`);
    }
  }
});

test("brand anchors survive in the dark theme", () => {
  assert.equal(THEMES.dark.bg.value, BRAND.bg);
  assert.equal(THEMES.dark.surface.value, BRAND.surface);
  assert.equal(THEMES.dark.accent.value, BRAND.gold);
  assert.equal(THEMES.dark.text2.value, BRAND.body);
});

test("primitives include the three brand colours", () => {
  const flat = Object.values(PRIMITIVES).flat().map(([, hex]) => hex);
  assert.ok(flat.includes("#0b0f1a"));
  assert.ok(flat.includes("#f5c26b"));
  assert.ok(flat.includes("#3a7bff"));
});

test("the type scale descends and keeps fixed line heights", () => {
  assert.equal(TYPE_SCALE.length, 11);
  const textSteps = TYPE_SCALE.filter((s) => s.name !== "code");
  for (let i = 1; i < textSteps.length; i++) {
    assert.ok(textSteps[i].size < textSteps[i - 1].size, "text sizes must descend");
  }
  assert.equal(TYPE_SCALE.find((s) => s.name === "code").name, "code");
  for (const step of TYPE_SCALE) {
    assert.ok(step.lineHeight >= 1 && step.lineHeight <= 1.8, `${step.name} line height`);
    assert.ok([400, 500, 600, 700].includes(step.weight), `${step.name} weight`);
    assert.ok(step.usage.length > 8);
  }
  const overline = TYPE_SCALE.find((s) => s.name === "overline");
  assert.ok(parseFloat(overline.tracking) > 0.1, "overline tracking must be wide");
});

test("spacing is a 4px scale in ascending order", () => {
  assert.equal(SPACING.length, 10);
  for (let i = 0; i < SPACING.length; i++) {
    assert.equal(SPACING[i].px % 4, 0);
    if (i) assert.ok(SPACING[i].px > SPACING[i - 1].px);
  }
  assert.equal(SPACING[0].px, 4);
  assert.equal(SPACING.at(-1).px, 80);
});

test("radius and elevation tokens are complete", () => {
  assert.equal(RADIUS.length, 5);
  assert.equal(RADIUS.find((r) => r.token === "full").px, 999);
  assert.equal(ELEVATION.length, 3);
  assert.ok(ELEVATION.every((e) => e.value.length > 0 && e.usage.length > 8));
});

test("motion durations ascend and easings are cubic-bezier curves", () => {
  const durations = MOTION.durations.map((d) => d.ms);
  assert.deepEqual(durations, [...durations].sort((a, b) => a - b));
  for (const easing of MOTION.easings) {
    assert.match(easing.value, /^cubic-bezier\(([\d.]+), ([\d.]+), ([\d.]+), ([\d.]+)\)$/);
  }
  assert.equal(BREAKPOINTS.length, 5);
  assert.equal(BREAKPOINTS.at(-1).px, 1440);
});

test("every promised contrast pair resolves in both themes", () => {
  assert.ok(A11Y_PAIRS.length >= 10);
  const ids = new Set();
  for (const pair of A11Y_PAIRS) {
    assert.ok(!ids.has(pair.id), `duplicate pair id ${pair.id}`);
    ids.add(pair.id);
    assert.ok(["text", "large", "ui"].includes(pair.use));
    for (const theme of ["dark", "light"]) {
      assert.ok(THEMES[theme][pair.fg], `${pair.id}: missing ${pair.fg} in ${theme}`);
      assert.ok(THEMES[theme][pair.bg], `${pair.id}: missing ${pair.bg} in ${theme}`);
    }
  }
});

test("cssVariables emits namespaced semantic and scale properties", () => {
  const vars = cssVariables("dark");
  assert.equal(vars["--arv-color-bg"], "#0b0f1a");
  assert.equal(vars["--arv-color-accent"], "#f5c26b");
  assert.equal(vars["--arv-space-md"], "16px");
  assert.equal(vars["--arv-radius-lg"], "22px");
  assert.equal(vars["--arv-duration-base"], "180ms");
  assert.match(vars["--arv-font-display"], /Poppins/);
  const light = colorVariables("light");
  assert.equal(light["--arv-color-bg"], "#f4f6fb");
  assert.ok(!Object.keys(baseVariables()).some((k) => k.startsWith("--arv-color-")));
});

test("themeCSS is pasteable and does not leak primitives", () => {
  const css = themeCSS();
  assert.match(css, /:root \{/);
  assert.match(css, /\[data-theme="light"\] \{/);
  assert.match(css, /--arv-color-bg: #0b0f1a;/);
  assert.match(css, /--arv-color-bg: #f4f6fb;/);
  assert.match(css, /--arv-space-xl: 32px;/);
  assert.ok(!css.includes("ink-900"), "primitive ramps must not be published");
  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  assert.equal(open, close);
});

test("tokenMaps resolves values and rejects unknown themes", () => {
  assert.equal(tokenMaps("dark").bg, "#0b0f1a");
  assert.equal(tokenMaps("light").text, "#0b0f1a");
  assert.throws(() => tokenMaps("sepia"), /unknown theme/);
});

test("token groups cover the five documented foundations", () => {
  assert.deepEqual(TOKEN_GROUPS.map((g) => g.id), ["color", "type", "spacing", "radius", "motion"]);
  assert.ok(TOKEN_GROUPS.every((g) => g.description.length > 20));
});

test("font stacks stay local and end in a system fallback", () => {
  for (const font of Object.values(FONTS)) {
    assert.ok(font.stack.includes("sans-serif") || font.stack.includes("monospace"));
    assert.ok(!/https?:/.test(font.stack), "fonts must be self-hosted");
  }
});
