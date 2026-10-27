import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

describe("PDF print visibility hierarchy", () => {
  it("never hides an ancestor of the exported document", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
    const root = postcss.parse(styles);
    const printRules: postcss.Rule[] = [];
    root.walkAtRules("media", media => {
      if (!/\bprint\b/.test(media.params)) return;
      media.walkRules(rule => { printRules.push(rule); });
    });

    const shell = document.createElement("div");
    shell.className = "app-shell";
    const pane = document.createElement("main");
    pane.className = "editor-pane";
    const body = document.createElement("div");
    body.className = "editor-body";
    const pdf = document.createElement("article");
    pdf.className = "pdf-print-document";
    shell.append(document.createElement("header"), pane, document.createElement("footer"));
    pane.append(document.createElement("nav"), body);
    body.append(document.createElement("section"), pdf);
    document.body.append(shell);

    const ancestors: Element[] = [];
    for (let element: Element | null = pdf; element; element = element.parentElement) ancestors.push(element);
    const hiddenAncestors = printRules.flatMap(rule => {
      if (!rule.nodes?.some(node => node.type === "decl" && node.prop === "display" && node.value === "none")) return [];
      const selectors = rule.selector.split(",").map(selector => selector.trim());
      return ancestors.filter(element => selectors.some(selector => element.matches(selector))).map(element => `${rule.selector} hides .${element.className}`);
    });

    expect(hiddenAncestors).toEqual([]);
    shell.remove();
  });
});
