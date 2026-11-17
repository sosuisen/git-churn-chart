/**
 * Extensions of the files that count as code.
 * Data, settings, lock files, images, and documents are not in this list.
 * Markup (HTML, CSS) is left out on purpose.
 * Scripts (shell, PowerShell, batch, Python, Kotlin Script) are left out on purpose too.
 */
export const CODE_EXTENSIONS: readonly string[] = [
  'rs',
  'swift',
  'kt',
  'cs',
  'xaml',
  'el',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'java',
];

const CODE_EXTENSION_SET = new Set(CODE_EXTENSIONS);

/**
 * Tells if a file is code. Only the extension decides it.
 *
 * @param path File path with `/` between the names.
 */
export function isCode(path: string): boolean {
  const file = path.split('/').pop() ?? '';
  const dot = file.lastIndexOf('.');
  return dot >= 0 && CODE_EXTENSION_SET.has(file.slice(dot + 1).toLowerCase());
}
