/**
 * Counts the lines of a text, as Git counts them.
 * A last line without a newline is one line.
 */
export function countLines(text: string): number {
  if (text === '') {
    return 0;
  }
  const newlines = text.split('\n').length - 1;
  return text.endsWith('\n') ? newlines : newlines + 1;
}
