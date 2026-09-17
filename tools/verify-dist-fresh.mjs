import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Confirms the committed dist/aidungeon/*.js artifacts are exactly what
 * `npm run build` produces from the current source. Run this AFTER `build`
 * has already regenerated them in place (see the `check` script) -- it
 * catches the one failure mode `verify:dist`'s structural checks cannot: a
 * contributor edited src/ and forgot to rebuild + commit dist/aidungeon
 * before pushing, leaving installers who copy/paste straight from GitHub
 * (see INSTALL.md) with stale code.
 *
 * Relies on git, not a byte-for-byte scripted diff, so this is a no-op
 * outside a git checkout (e.g. a source tarball) rather than a hard failure.
 */
function isInsideGitRepository() {
  try {
    execFileSync("git", ["-C", repositoryRoot, "rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!isInsideGitRepository()) {
  console.warn("Skipping dist freshness check: not inside a git repository.");
  process.exit(0);
}

try {
  execFileSync("git", ["-C", repositoryRoot, "diff", "--exit-code", "--", "dist/aidungeon"], { stdio: "inherit" });
} catch (error) {
  if (error.status === 1) {
    console.error(
      "\ndist/aidungeon/*.js does not match a fresh build of the current source (diff above).\n" +
        "Run `npm run build`, then commit the updated dist/aidungeon files.\n"
    );
  }
  process.exit(typeof error.status === "number" ? error.status : 1);
}

console.log("dist/aidungeon/*.js matches a fresh build of the current source.");
