import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Writes the current dist/aidungeon/{Input,Context,Output}.js content into
 * every `chronicle:dist-embed` marker pair found in README.md/INSTALL.md,
 * preserving each embed's existing indentation. This is the only supported
 * way to update those markdown snippets -- hand-editing them risks exactly
 * the transcription drift `verify-embedded-snippets.mjs` exists to catch
 * (e.g. a `​` escape sequence silently becoming a literal zero-width
 * character when typed by hand, confirmed 2026-09-16).
 *
 * Run this after `npm run build` whenever Input/Context/Output source
 * changes, then run `npm run verify:embedded-snippets` (or `npm run check`)
 * to confirm the result.
 */
const EMBEDDED_ARTIFACTS = ["Input", "Context", "Output"];
const MARKDOWN_FILES = ["README.md", "INSTALL.md"];
const FENCE_PATTERN = /^([ \t]*)```(?:js|javascript)?\r?\n([\s\S]*?)\r?\n[ \t]*```[ \t]*$/m;

const artifactContents = new Map(
  await Promise.all(
    EMBEDDED_ARTIFACTS.map(async (name) => [name, (await readFile(resolve(repositoryRoot, "dist", "aidungeon", `${name}.js`), "utf8")).replace(/\r\n/g, "\n").trimEnd()])
  )
);

let totalUpdated = 0;

for (const relativePath of MARKDOWN_FILES) {
  const filePath = resolve(repositoryRoot, relativePath);
  let markdown;
  try {
    markdown = await readFile(filePath, "utf8");
  } catch {
    continue;
  }
  const usesCrlf = markdown.includes("\r\n");
  let normalized = markdown.replace(/\r\n/g, "\n");
  let fileChanged = false;

  for (const name of EMBEDDED_ARTIFACTS) {
    const start = `<!-- chronicle:dist-embed:${name}:start -->`;
    const end = `<!-- chronicle:dist-embed:${name}:end -->`;
    const startIndex = normalized.indexOf(start);
    if (startIndex === -1) continue;
    const endIndex = normalized.indexOf(end, startIndex + start.length);
    if (endIndex === -1) throw new Error(`${relativePath}: found ${start} without a matching ${end}.`);

    const between = normalized.slice(startIndex + start.length, endIndex);
    const fenceMatch = FENCE_PATTERN.exec(between);
    if (fenceMatch === null) throw new Error(`${relativePath}: found ${start}/${end} but no fenced code block between them.`);
    const [wholeFence, indent] = fenceMatch;
    const fenceStartInBetween = between.indexOf(wholeFence);

    const content = artifactContents.get(name);
    const reindented = content
      .split("\n")
      .map((line) => (line.length > 0 ? indent + line : line))
      .join("\n");
    const newFence = `${indent}\`\`\`js\n${reindented}\n${indent}\`\`\``;

    const newBetween = between.slice(0, fenceStartInBetween) + newFence + between.slice(fenceStartInBetween + wholeFence.length);
    if (newBetween !== between) {
      fileChanged = true;
      totalUpdated += 1;
    }
    normalized = normalized.slice(0, startIndex + start.length) + newBetween + normalized.slice(endIndex);
  }

  if (fileChanged) {
    await writeFile(filePath, usesCrlf ? normalized.replace(/\n/g, "\r\n") : normalized, "utf8");
    console.log(`Updated ${relativePath}.`);
  }
}

console.log(totalUpdated > 0 ? `Synced ${totalUpdated} embed(s).` : "All embeds already match dist/aidungeon/*.js.");
