/** Directory names that hold tests: `tests`, `__tests__`, `e2e`, `androidTest`. */
const TEST_DIRECTORY = /^(tests?|__tests__|e2e|androidtest|specs?)$/i;
/** A name that ends with a test word: `foo_tests`, `foo.test`, `App.Tests`, `foo-spec`. */
const TEST_SUFFIX = /[._-](tests?|specs?)$/i;
/** A CamelCase name that ends with a test word: `AppTests`, `ParserTest`, `UITests`. */
const TEST_CAMEL_SUFFIX = /[A-Za-z0-9]Tests?$/;
/** A file name that starts with a test word: `test_parser`, `tests`. */
const TEST_FILE_PREFIX = /^tests?([._-]|$)/i;

/**
 * Tells if a file is a test by its path.
 * A test is in a test directory, or its file name starts or ends with a test word.
 *
 * It cannot see tests that live in the same file as the code.
 *
 * @param path File path with `/` between the names.
 */
export function isTestPath(path: string): boolean {
  const names = path.split('/');
  const file = names.pop() ?? '';
  const dot = file.lastIndexOf('.');
  const stem = dot < 0 ? file : file.slice(0, dot);
  return (
    names.some(name => TEST_DIRECTORY.test(name) || hasTestSuffix(name)) ||
    TEST_FILE_PREFIX.test(stem) ||
    hasTestSuffix(stem)
  );
}

function hasTestSuffix(name: string): boolean {
  return TEST_SUFFIX.test(name) || TEST_CAMEL_SUFFIX.test(name);
}
