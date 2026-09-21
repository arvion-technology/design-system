import test from "node:test";
import assert from "node:assert/strict";
import { search, matchRanges } from "../src/search.js";
import { componentSearchRecords } from "../src/components.js";

const extra = [
  {
    id: "tokens-color", type: "page", title: "Color tokens",
    subtitle: "Foundations", text: "Primitive ramps and semantic colour roles for dark and light themes.",
    tags: ["color", "tokens", "theme"], href: "#/tokens/color",
  },
  {
    id: "a11y", type: "page", title: "Accessibility",
    subtitle: "Guidelines", text: "Contrast audits, focus order, keyboard support and the escrow badge announcement.",
    tags: ["a11y", "contrast", "escrow"], href: "#/accessibility",
  },
  {
    id: "motion", type: "page", title: "Motion tokens",
    subtitle: "Foundations", text: "Durations and easings used for theme transitions and panel motion.",
    tags: ["motion", "easing", "theme"], href: "#/tokens/motion",
  },
  {
    id: "theming", type: "page", title: "Theming",
    subtitle: "Guidelines", text: "Paste the generated CSS, set data-theme, and let the semantic layer do the rest.",
    tags: ["theme", "css", "dark"], href: "#/theming",
  },
];
const index = [...componentSearchRecords(), ...extra];

test("an empty or whitespace query returns nothing", () => {
  assert.deepEqual(search(index, ""), []);
  assert.deepEqual(search(index, "   "), []);
  assert.deepEqual(search(index, null), []);
});

test("a title exact match outranks body matches", () => {
  const results = search(index, "button");
  assert.equal(results[0].title, "Button");
  assert.ok(results[0].score > results[1].score);
});

test("multi-term queries require every term", () => {
  const results = search(index, "icon button");
  assert.equal(results[0].title, "Icon button");
  assert.ok(results.every((r) => /icon/.test(JSON.stringify(r)) || /button/.test(JSON.stringify(r))));
  assert.ok(!results.some((r) => r.title === "Theming"));
});

test("tag matches outrank a single body mention", () => {
  const results = search(index, "escrow");
  assert.equal(results[0].title, "Accessibility");
  assert.ok(results[0].tags.includes("escrow"));
});

test("search ignores case and accents", () => {
  const accented = [{
    id: "resume", type: "page", title: "Résumé tokens", subtitle: "",
    text: "types for a resume builder", tags: [], href: "#/resume",
  }];
  assert.equal(search(accented, "resume").length, 1);
  assert.equal(search(accented, "RÉSUMÉ").length, 1);
});

test("limit caps results without changing rank order", () => {
  const results = search(index, "theme", { limit: 3 });
  assert.equal(results.length, 3);
  const all = search(index, "theme", { limit: 50 });
  assert.deepEqual(results.map((r) => r.id), all.slice(0, 3).map((r) => r.id));
});

test("equal-scoring records keep index order", () => {
  const records = [
    { id: "a", type: "page", title: "One", subtitle: "", text: "sharedword", tags: [], href: "#" },
    { id: "b", type: "page", title: "Two", subtitle: "", text: "sharedword", tags: [], href: "#" },
  ];
  assert.deepEqual(search(records, "sharedword").map((r) => r.id), ["a", "b"]);
});

test("unknown terms return an empty array rather than a fuzzy guess", () => {
  assert.deepEqual(search(index, "zzzznothing"), []);
});

test("matchRanges returns sorted term ranges for highlighting", () => {
  assert.deepEqual(matchRanges("Gold link on card", "link"), [[5, 9]]);
  assert.deepEqual(matchRanges("Gold link on card", "card link"), [[5, 9], [13, 17]]);
  assert.deepEqual(matchRanges("Gold link on card", "missing"), []);
  assert.deepEqual(matchRanges("Gold link on card", ""), []);
});
