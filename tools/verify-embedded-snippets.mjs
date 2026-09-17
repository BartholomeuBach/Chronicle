import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Input.js/Context.js/Output.js are small enough (2026-09-16, after moving
 * nonEmptyText into its own module) to paste directly from README.md and
 * INSTALL.md as code blocks, instead of sending an installer to GitHub for
 * every tab the way Library.js still requires. That convenience creates a
 * new staleness risk `verify-dist-fresh.mjs` cannot see: those two docs are
 * markdown, not `dist/aidungeon/`, so a source change could update the real
 * artifact while leaving a stale copy pasted in prose. This checks that
 * every marked embed, in every file listed below, is the current
 * `dist/aidungeon/*.js` content -- run after `build` has already
 * regenerated those files, same as `verify:dist:fresh`.
 *
 * Convention: an embed is delimited by a pair of HTML comments, with a
 * fenced code block between them (indentation-tolerant, since these sit
 * inside numbered-list steps in both documents):
 *   <!-- chronicle:dist-embed:<Name>:start -->
 *   ```js
 *   ...exact file content, each line optionally sharing one common indent...
 *   ```
 *   <!-- chronicle:dist-embed:<Name>:end -->
 * for <Name> in EMBEDDED_ARTIFACTS. Every file in MARKDOWN_FILES is required
 * to carry all of them -- a missing marker is a failure, not a silent skip,
 * confirmed necessary 2026-09-16 after a `git checkout` accidentally reverted
 * README.md to a pre-embed version and an earlier, more lenient version of
 * this script (skip a file with no markers at all) missed it entirely,
 * because INSTALL.md's own markers still matched.
 */
const EMBEDDED_ARTIFACTS = ["Input", "Context", "Output"];
const MARKDOWN_FILES = ["README.md", "INSTALL.md"];
const FENCE_PATTERN = /^([ \t]*)```(?:js|javascript)?\r?\n([\s\S]*?)\r?\n[ \t]*```[ \t]*$/m;

/** Extracts the fenced block between a start/end marker pair, de-indented by the fence's own leading whitespace. */
function extractEmbed(markdown, name) {
  const start = `<!-- chronicle:dist-embed:${name}:start -->`;
  const end = `<!-- chronicle:dist-embed:${name}:end -->`;
  const startIndex = markdown.indexOf(start);
  if (startIndex === -1) return undefined;
  const endIndex = markdown.indexOf(end, startIndex + start.length);
  if (endIndex === -1) throw new Error(`Found ${start} without a matching ${end}.`);
  const between = markdown.slice(startIndex + start.length, endIndex);

  const fenceMatch = FENCE_PATTERN.exec(between);
  if (fenceMatch === null) throw new Error(`Found ${start}/${end} but no fenced code block between them.`);
  const [, indent, body] = fenceMatch;
  const lines = body.split("\n").map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line));
  return lines.join("\n").trimEnd();
}

const artifactContents = new Map(
  await Promise.all(
    EMBEDDED_ARTIFACTS.map(async (name) => [name, (await readFile(resolve(repositoryRoot, "dist", "aidungeon", `${name}.js`), "utf8")).replace(/\r\n/g, "\n").trimEnd()])
  )
);

let mismatchFound = false;

for (const relativePath of MARKDOWN_FILES) {
  const filePath = resolve(repositoryRoot, relativePath);
  let markdown;
  try {
    markdown = (await readFile(filePath, "utf8")).replace(/\r\n/g, "\n");
  } catch {
    mismatchFound = true;
    console.error(`\n${relativePath}: expected this file to exist and carry a chronicle:dist-embed marker for each of ${EMBEDDED_ARTIFACTS.join(", ")}.`);
    continue;
  }

  for (const name of EMBEDDED_ARTIFACTS) {
    let embedded;
    try {
      embedded = extractEmbed(markdown, name);
    } catch (error) {
      mismatchFound = true;
      console.error(`\n${relativePath}: ${error.message}`);
      continue;
    }
    if (embedded === undefined) {
      mismatchFound = true;
      console.error(`\n${relativePath}: missing the required chronicle:dist-embed:${name} marker pair.`);
      continue;
    }
    const expected = artifactContents.get(name);
    if (embedded !== expected) {
      mismatchFound = true;
      console.error(`\n${relativePath}: the embedded ${name}.js snippet does not match dist/aidungeon/${name}.js.`);
    }
  }
}

if (mismatchFound) {
  console.error("\nRun `npm run build`, then copy the updated dist/aidungeon/*.js content into the matching markdown embed(s) above.\n");
  process.exit(1);
}

console.log("README.md/INSTALL.md embedded snippets match dist/aidungeon/*.js.");
