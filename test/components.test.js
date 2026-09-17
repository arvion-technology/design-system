import test from "node:test";
import assert from "node:assert/strict";
import {
  COMPONENTS, COMPONENT_COUNT, COMPONENT_GROUPS, getComponent, componentsByGroup,
  groupMeta, componentSearchRecords,
} from "../src/components.js";

const VOID = new Set(["input", "img", "br", "hr", "path", "rect", "circle", "line", "stop", "use", "meta", "link", "source"]);

/** Minimal HTML well-formedness pass: enough to catch an unclosed demo snippet. */
function unbalanced(html) {
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  const stack = [];
  let match;
  while ((match = tag.exec(html))) {
    const [, closing, name, , selfClosing] = match;
    const lower = name.toLowerCase();
    if (VOID.has(lower) || selfClosing) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== lower) return `</${lower}> closes <${open}>`;
    } else {
      stack.push(lower);
    }
  }
  return stack.length ? `unclosed <${stack.join(">, <")}>` : null;
}

test("the registry documents exactly 30 components", () => {
  assert.equal(COMPONENT_COUNT, 30);
  assert.equal(COMPONENTS.length, 30);
  assert.equal(new Set(COMPONENTS.map((c) => c.id)).size, 30);
});

test("every component belongs to a declared group", () => {
  const groups = new Set(COMPONENT_GROUPS.map((g) => g.id));
  for (const component of COMPONENTS) {
    assert.ok(groups.has(component.group), `${component.id} -> ${component.group}`);
    assert.ok(groupMeta(component.group), `${component.id} has no group metadata`);
  }
  const total = COMPONENT_GROUPS.reduce((sum, group) => sum + componentsByGroup(group.id).length, 0);
  assert.equal(total, COMPONENTS.length);
});

test("every component has a summary, snippet and at least two a11y notes", () => {
  for (const component of COMPONENTS) {
    assert.ok(component.summary.length > 40, `${component.id} summary`);
    assert.ok(component.snippet.includes("<"), `${component.id} snippet has no markup`);
    assert.ok(component.snippet.trim().endsWith(">"), `${component.id} snippet is truncated`);
    assert.ok(component.a11y.length >= 2, `${component.id} a11y notes`);
    assert.ok(component.a11y.every((note) => note.length > 30), `${component.id} a11y note is thin`);
    assert.ok(component.keywords.length >= 2, `${component.id} keywords`);
    assert.equal(component.status, "stable");
  }
});

test("all snippets are well-formed HTML fragments", () => {
  for (const component of COMPONENTS) {
    assert.equal(unbalanced(component.snippet), null, `${component.id}: ${unbalanced(component.snippet)}`);
  }
});

test("snippets contain no placeholders or build-time syntax", () => {
  for (const component of COMPONENTS) {
    assert.ok(!/TODO|\{\{|Lorem ipsum|BUILD:/i.test(component.snippet), `${component.id} contains a placeholder`);
    assert.ok(!/https?:\/\//.test(component.snippet), `${component.id} references a remote asset`);
  }
});

test("component ids resolve and unknown ids do not", () => {
  assert.equal(getComponent("button").name, "Button");
  assert.equal(getComponent("modal").group, "overlays");
  assert.equal(getComponent("marquee"), null);
});

test("search records map every component to a docs route", () => {
  const records = componentSearchRecords();
  assert.equal(records.length, 30);
  for (const record of records) {
    assert.equal(record.type, "component");
    assert.equal(record.href, `#/components/${record.id.replace("component-", "")}`);
    assert.ok(record.title.length > 2);
    assert.ok(record.text.length > 60);
    assert.ok(record.tags.length >= 3);
  }
});

test("each group has a one-line blurb", () => {
  assert.equal(COMPONENT_GROUPS.length, 6);
  for (const group of COMPONENT_GROUPS) {
    assert.ok(group.blurb.length > 15, group.id);
    assert.ok(componentsByGroup(group.id).length >= 2, `${group.id} has too few components`);
  }
});
