/** One changed block of a file. */
export interface Hunk {
  /**
   * The text that Git prints after the second `@@` of the hunk header.
   * By default it is the nearest line above the hunk that starts with a letter at column 0.
   */
  readonly context: string;
  /** Deleted lines without the leading `-`. */
  readonly deleted: readonly string[];
  /** Added lines without the leading `+`. */
  readonly added: readonly string[];
}

/** The changes of one file in one commit. */
export interface FileChange {
  /** Commit date in `YYYY-MM-DD`. */
  readonly date: string;
  /** New path of the file. For a deleted file it is the old path. */
  readonly path: string;
  readonly hunks: readonly Hunk[];
}

const COMMIT_MARK = '@@@commit ';

/** The `git log` format that `parsePatchLog` reads. */
export const LOG_FORMAT = `${COMMIT_MARK}%cd`;

const HUNK_HEADER = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@ ?(.*)$/;
const NO_FILE = '/dev/null';

/**
 * Parses the output of `git log -p --pretty=format:@@@commit %cd`.
 *
 * A binary file and a rename without changes have no hunks. They are not in the result.
 */
export function parsePatchLog(output: string): FileChange[] {
  const lines = output.split('\n');
  const files: FileChange[] = [];
  let date = '';
  let oldPath = '';
  let hunks: Hunk[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (line.startsWith(COMMIT_MARK)) {
      date = line.slice(COMMIT_MARK.length).trim();
    } else if (line.startsWith('--- ')) {
      oldPath = toPath(line);
    } else if (line.startsWith('+++ ')) {
      const newPath = toPath(line);
      hunks = [];
      files.push({
        date,
        path: newPath === NO_FILE ? oldPath : newPath,
        hunks,
      });
    } else {
      const header = HUNK_HEADER.exec(line);
      if (header) {
        // The header tells how many lines follow. Reading by count keeps
        // changed lines that look like headers out of the header checks.
        const body = readHunkBody(lines, index + 1, header);
        hunks.push({ context: header[3] ?? '', ...body.hunk });
        index = body.lastIndex;
      }
    }
  }
  return files;
}

function readHunkBody(
  lines: readonly string[],
  start: number,
  header: RegExpExecArray,
): { hunk: Omit<Hunk, 'context'>; lastIndex: number } {
  let oldLeft = Number(header[1] ?? 1);
  let newLeft = Number(header[2] ?? 1);
  const deleted: string[] = [];
  const added: string[] = [];
  let index = start;
  for (; (oldLeft > 0 || newLeft > 0) && index < lines.length; index++) {
    const line = lines[index] ?? '';
    if (line.startsWith('-')) {
      deleted.push(line.slice(1));
      oldLeft--;
    } else if (line.startsWith('+')) {
      added.push(line.slice(1));
      newLeft--;
    } else if (!line.startsWith('\\')) {
      // An unchanged line is in both the old file and the new file.
      oldLeft--;
      newLeft--;
    }
  }
  return { hunk: { deleted, added }, lastIndex: index - 1 };
}

/** Reads the path of a `--- a/path` or `+++ b/path` line. */
function toPath(line: string): string {
  // Git adds a tab after a path that contains a space.
  const path = line.slice(4).replace(/\t?\r?$/, '');
  return path === NO_FILE ? path : path.slice(2);
}
