import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_THEME, isTheme, resolveTheme, nextTheme, themeClass, themeAttribute, themeLabel, toggleLabel,
} from "../src/theme.js";

test("a stored valid theme wins over the OS preference", () => {
  assert.equal(resolveTheme("light", false), "light");
  assert.equal(resolveTheme("dark", true), "dark");
});

test("the OS preference is used when nothing is stored", () => {
  assert.equal(resolveTheme(null, true), "light");
  assert.equal(resolveTheme(null, false), "dark");
  assert.equal(resolveTheme(undefined), "dark");
});

test("invalid stored values fall back to the brand default", () => {
  assert.equal(resolveTheme("sepia", false), DEFAULT_THEME);
  assert.equal(DEFAULT_THEME, "dark");
});

test("theme toggling is a two-state cycle", () => {
  assert.equal(nextTheme("dark"), "light");
  assert.equal(nextTheme("light"), "dark");
});

test("theme output matches the brand stylesheet contract", () => {
  assert.equal(themeClass("light"), "theme-light");
  assert.equal(themeClass("dark"), "");
  assert.equal(themeAttribute("light"), "light");
  assert.equal(themeAttribute("nope"), "dark");
  assert.equal(themeLabel("light"), "Light");
  assert.match(toggleLabel("dark"), /light/);
  assert.match(toggleLabel("light"), /dark/);
  assert.equal(isTheme("dark"), true);
  assert.equal(isTheme(""), false);
});
