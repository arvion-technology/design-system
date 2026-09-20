import test from "node:test";
import assert from "node:assert/strict";
import {
  parseColor, toHex, blend, luminance, contrastRatio, grade, auditPair, auditPairs,
  sortBySeverity, readableOn, mix, describeRatio, THRESHOLDS,
} from "../src/contrast.js";

test("parseColor reads shorthand, long and alpha hex", () => {
  assert.deepEqual(parseColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor("#0b0f1a"), { r: 11, g: 15, b: 26, a: 1 });
  assert.deepEqual(parseColor("#3a7bff80"), { r: 58, g: 123, b: 255, a: 128 / 255 });
  assert.deepEqual(parseColor("rgb(7 10 17)"), { r: 7, g: 10, b: 17, a: 1 });
  const translucent = parseColor("rgba(255, 255, 255, 0.5)");
  assert.equal(translucent.a, 0.5);
});

test("parseColor rejects malformed input", () => {
  assert.throws(() => parseColor("#12345"), /not a hex colour/);
  assert.throws(() => parseColor("gold"), /not a hex colour/);
  assert.throws(() => parseColor(12), /must be a string/);
  assert.throws(() => parseColor("rgb(300, 0, 0)"), /out of range/);
});

test("toHex rounds and pads", () => {
  assert.equal(toHex({ r: 11, g: 15, b: 26 }), "#0b0f1a");
  assert.equal(toHex({ r: 255.4, g: 0, b: 7.6 }), "#ff0008");
});

test("luminance anchors at black and white", () => {
  assert.equal(luminance("#000000"), 0);
  assert.equal(luminance("#ffffff"), 1);
  assert.ok(luminance("#3a7bff") > luminance("#0b0f1a"));
});

test("contrast ratio hits the WCAG anchors and is symmetric", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(contrastRatio("#ffffff", "#000000"), 21);
  assert.ok(Math.abs(contrastRatio("#767676", "#ffffff") - 4.54) < 0.05);
});

test("translucent foregrounds are composited over the backdrop", () => {
  const composite = blend("rgba(255,255,255,0.5)", "#000000");
  assert.equal(composite.a, 1);
  assert.equal(toHex(composite), "#808080");
  const ratio = contrastRatio("rgba(255,255,255,0.5)", "#000000");
  assert.ok(ratio > 5.2 && ratio < 5.4, `expected roughly 5.3, got ${ratio}`);
});

test("grade separates AAA, AA, large text and failure", () => {
  assert.equal(grade(7.1).level, "AAA");
  assert.equal(grade(7).level, "AAA");
  assert.equal(grade(4.6).level, "AA");
  assert.equal(grade(4.6).passes, true);
  assert.equal(grade(4.2).level, "AA-large");
  assert.equal(grade(4.2).passes, false);
  assert.equal(grade(3.2, "large").passes, true);
  assert.equal(grade(3.2, "ui").passes, true);
  assert.equal(grade(2.9).level, "FAIL");
  assert.equal(grade(2.9).passes, false);
});

test("grade uses the threshold for the requested use", () => {
  assert.equal(grade(3.5, "text").threshold, THRESHOLDS.text);
  assert.equal(grade(3.5, "large").threshold, THRESHOLDS.large);
  assert.equal(grade(3.5, "ui").threshold, THRESHOLDS.ui);
  assert.equal(grade(3.5, "nonsense").threshold, THRESHOLDS.text);
});

test("auditPair reports ratio text, level and pass state", () => {
  const row = auditPair({ label: "Ink on paper", fg: "#0b0f1a", bg: "#ffffff" });
  assert.equal(row.label, "Ink on paper");
  assert.ok(row.ratio > 18);
  assert.equal(row.level, "AAA");
  assert.equal(row.passes, true);
  assert.match(row.ratioText, /^\d+\.\d{2}:1$/);
});

test("auditPairs keeps order and sortBySeverity puts failures first", () => {
  const rows = auditPairs([
    { label: "good", fg: "#ffffff", bg: "#000000" },
    { label: "bad", fg: "#777777", bg: "#888888" },
  ]);
  assert.equal(rows[0].label, "good");
  assert.equal(rows[0].passes, true);
  assert.equal(rows[1].passes, false);
  const sorted = sortBySeverity(rows);
  assert.equal(sorted[0].label, "bad");
});

test("readableOn chooses the label colour with more contrast", () => {
  assert.equal(readableOn("#f5c26b"), "#1a1405");
  assert.equal(readableOn("#2f66e0"), "#ffffff");
});

test("mix interpolates sRGB in even steps", () => {
  assert.deepEqual(mix("#000000", "#ffffff", 3), ["#000000", "#808080", "#ffffff"]);
  assert.equal(mix("#0b0f1a", "#f5c26b", 5).length, 5);
  assert.throws(() => mix("#000", "#fff", 1), /at least two/);
});

test("describeRatio names the threshold band", () => {
  assert.match(describeRatio(8), /AAA/);
  assert.match(describeRatio(4.6), /AA/);
  assert.match(describeRatio(3.4), /Large text/);
  assert.match(describeRatio(2.1), /do not use/);
});
