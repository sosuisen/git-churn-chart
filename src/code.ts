import { isTestPath } from './test-path.ts';

/**
 * Languages that count as code, with the extensions of their files.
 * Data, settings, lock files, images, and documents are not in this list.
 * Markup (HTML, CSS) is left out on purpose.
 * Scripts (shell, PowerShell, batch, Python, Kotlin Script) are left out on purpose too.
 *
 * The order is fixed. The color of a language in a chart comes from its position.
 * Add a new language at the end, so that the other languages keep their colors.
 * The page has eight colors. A ninth language needs a new design, not a ninth color.
 */
const LANGUAGE_EXTENSIONS = [
  { name: 'Rust', extensions: ['rs'] },
  { name: 'Swift', extensions: ['swift'] },
  { name: 'Kotlin', extensions: ['kt'] },
  { name: 'C#・XAML', extensions: ['cs', 'xaml'] },
  { name: 'Emacs Lisp', extensions: ['el'] },
  {
    name: 'TypeScript・JavaScript',
    extensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'],
  },
  { name: 'Java', extensions: ['java'] },
  // Headers are left out on purpose. `.h` can also be C or Objective-C.
  { name: 'C++', extensions: ['cpp'] },
] as const;

/** Names of the languages that count as code, in a fixed order. */
export const LANGUAGES: readonly string[] = LANGUAGE_EXTENSIONS.map(
  ({ name }) => name,
);

/** Extensions of the files that count as code. */
export const CODE_EXTENSIONS: readonly string[] = LANGUAGE_EXTENSIONS.flatMap(
  ({ extensions }) => extensions,
);

/**
 * Extensions of the files that count as code in any directory.
 * The files of the other extensions count only in a directory named `src`, or in a test path.
 * Projects of Xcode, Visual Studio, and Emacs Lisp often have no `src` directory.
 */
const ANYWHERE_EXTENSIONS: ReadonlySet<string> = new Set([
  'swift',
  'cs',
  'xaml',
  'el',
]);

const LANGUAGE_BY_EXTENSION = new Map<string, string>(
  LANGUAGE_EXTENSIONS.flatMap(({ name, extensions }) =>
    extensions.map(extension => [extension, name]),
  ),
);

/**
 * Names the language of a file. The extension decides the language.
 * The place and the name of the file decide if it counts as code at all.
 *
 * @param path File path with `/` between the names.
 * @returns A name in `LANGUAGES`, or `undefined` when the file is not code.
 */
export function languageOf(path: string): string | undefined {
  const directories = path.split('/');
  const file = (directories.pop() ?? '').toLowerCase();
  // A minified file is not written by a person. A vendor directory holds code from other projects.
  if (file.endsWith('.min.js') || directories.includes('vendor')) {
    return undefined;
  }
  const dot = file.lastIndexOf('.');
  const extension = dot < 0 ? '' : file.slice(dot + 1);
  // Tests often live outside `src`, such as in `tests` next to `src`.
  const isInScope =
    directories.includes('src') ||
    ANYWHERE_EXTENSIONS.has(extension) ||
    isTestPath(path);
  return isInScope ? LANGUAGE_BY_EXTENSION.get(extension) : undefined;
}

/**
 * Tells if a file is code. It is code when `languageOf` names its language.
 *
 * @param path File path with `/` between the names.
 */
export function isCode(path: string): boolean {
  return languageOf(path) !== undefined;
}
