import type { LineCount } from './daily-stats.ts';
import type { Hunk } from './patch-log.ts';

const TEST_ATTRIBUTE = '#[cfg(test)]';
const TEST_MODULE_START = /^(pub(\([a-z]+\))? )?mod \w*tests?\w* \{/;

/**
 * Splits the lines of one hunk of a Rust file into code and tests.
 * A test is an item at column 0 that follows `#[cfg(test)]`, such as `mod tests { ... }`.
 *
 * It reads only the changed lines and the hunk context. It does not read the whole file.
 * So it relies on the usual format of rustfmt:
 * lines in a module are indented and the module ends with `}` at column 0.
 */
export function splitRustHunk(hunk: Hunk): {
  code: LineCount;
  test: LineCount;
} {
  const startsInTest = TEST_MODULE_START.test(hunk.context);
  const added = countTestLines(hunk.added, startsInTest);
  const deleted = countTestLines(hunk.deleted, startsInTest);
  return {
    code: {
      added: hunk.added.length - added,
      deleted: hunk.deleted.length - deleted,
    },
    test: { added, deleted },
  };
}

function countTestLines(
  lines: readonly string[],
  startsInTest: boolean,
): number {
  let inTest = startsInTest;
  let afterAttribute = false;
  let count = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (inTest && isTopLevel(line) && !line.startsWith('}')) {
      // The context can be stale. A new item at column 0 means the module ended above.
      inTest = false;
    }
    if (inTest) {
      count++;
      inTest = !line.startsWith('}');
    } else if (line === TEST_ATTRIBUTE) {
      count++;
      afterAttribute = true;
    } else if (afterAttribute) {
      count++;
      // Another attribute can sit between `#[cfg(test)]` and the item.
      afterAttribute = line.startsWith('#[');
      inTest = line.endsWith('{');
    }
  }
  return count;
}

function isTopLevel(line: string): boolean {
  return line !== '' && !/^\s/.test(line);
}
