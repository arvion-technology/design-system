import test from "node:test";
import assert from "node:assert/strict";
import { auditTheme, auditBothThemes, tokenPairRatio, themeTokenRows } from "../src/audit.js";
import { A11Y_PAIRS, THEMES } from "../src/tokens.js";

test("the audit checks every promised pair in both themes", () => {
  const report = auditBothThemes();
  assert.equal(report.dark.length, A11Y_PAIRS.length);
  assert.equal(report.light.length, A11Y_PAIRS.length);
  assert.equal(report.summary.total, A11Y_PAIRS.length * 2);
  assert.equal(report.summary.passing + report.summary.failing, report.summary.total);
});

test("every shipped pair passes its declared threshold", () => {
  const report = auditBothThemes();
  assert.equal(report.summary.failing, 0, JSON.stringify(report.summary.worst, null, 2));
  for (const theme of ["dark", "light"]) {
    for (const row of report[theme]) {
      assert.ok(row.passes, `${theme} ${row.id} fails at ${row.ratioText}`);
      assert.ok(row.ratio >= row.threshold);
      assert.ok(row.ratio >= 1 && row.ratio <= 21);
    }
  }
});

test("audit rows resolve the actual token values", () => {
  const dark = auditTheme("dark");
  const primary = dark.find((row) => row.id === "on-accent");
  assert.equal(primary.fg, THEMES.dark.onAccent.value);
  assert.equal(primary.bg, THEMES.dark.accent.value);
  assert.equal(primary.label, "Label on primary button");
});

test("the action blue was darkened so small white labels pass", () => {
  const dark = auditTheme("dark");
  const blue = dark.find((row) => row.id === "on-blue");
  assert.ok(blue.ratio >= 4.5, `blue button label ratio ${blue.ratioText}`);
  assert.equal(THEMES.dark.blue.value, "#2f66e0");
});

test("the focus ring clears the 3:1 UI threshold in both themes", () => {
  for (const theme of ["dark", "light"]) {
    const row = auditTheme(theme).find((r) => r.id === "focus-bg");
    assert.ok(row.ratio >= 3, `${theme} focus ring ${row.ratioText}`);
    assert.equal(row.use, "ui");
  }
});

test("unknown themes and missing tokens fail loudly", () => {
  assert.throws(() => auditTheme("sepia"), /unknown theme/);
  assert.equal(tokenPairRatio("dark", "text", "not-a-token"), null);
  assert.equal(tokenPairRatio("light", "text", "surface").passes, true);
});

test("themeTokenRows names the generated custom property", () => {
  const rows = themeTokenRows("dark");
  assert.equal(rows.length, 29);
  const accent = rows.find((r) => r.key === "accentText");
  assert.equal(accent.cssVar, "--arv-color-accent-text");
  assert.equal(accent.value, "#f5c26b");
  assert.throws(() => themeTokenRows("sepia"), /unknown theme/);
});
