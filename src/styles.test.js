const fs = require("fs");
const path = require("path");

test("component styles stay under the recon host", () => {
  const css = fs.readFileSync(path.join(__dirname, "styles.css"), "utf8");
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  stripped.split("}").forEach((block) => {
    const selector = block.split("{")[0].trim();
    if (!selector) {
      return;
    }
    selector.split(",").forEach((part) => {
      const text = part.trim();
      if (!text || text.startsWith("@")) {
        return;
      }
      expect(text).toContain(".bspre-recon-host");
    });
  });
});

test("the dev frame stylesheet is not part of the Siebel bundle entry", () => {
  const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  expect(index).not.toContain("siebelFrame");
  expect(index).not.toContain("SiebelFrame");
  expect(index).toContain("export function mount");
});
