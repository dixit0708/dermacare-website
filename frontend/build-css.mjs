// One-time build script: compiles Tailwind utility classes used in the plain
// HTML/JS frontend into a static CSS file. Run once with `node build-css.mjs`
// from this directory; the output (site.css) needs no further build step to serve.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, "assets/css/source.css");
const outputPath = path.join(__dirname, "assets/css/site.css");

const css = readFileSync(inputPath, "utf8");

postcss([tailwindcss(), autoprefixer()])
  .process(css, { from: inputPath, to: outputPath })
  .then((result) => {
    writeFileSync(outputPath, result.css);
    console.log(`Compiled ${outputPath} (${result.css.length} bytes)`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
