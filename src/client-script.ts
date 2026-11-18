import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

/**
 * Modules that the page needs in the browser, in an order where
 * each module comes after the modules that it imports.
 * They must not use Node.js. Their top-level names must differ, because they share one scope.
 */
const CLIENT_MODULES = [
  'format.ts',
  'scale.ts',
  'chart-svg.ts',
  'view.ts',
  'tooltip.ts',
  'client.ts',
];

/**
 * Builds the script of the page from the modules that draw the charts.
 * So the browser draws a view with the same code as the tests check.
 *
 * It removes the types, the imports, and the `export` keywords, and joins the modules.
 * The project has no build step. A bundler would add one.
 *
 * @returns JavaScript that defines the functions of the modules in the scope where it runs.
 */
export function readClientScript(): string {
  return CLIENT_MODULES.map(name => {
    const source = readFileSync(join(import.meta.dirname, name), 'utf8');
    return withoutWarning(() => stripTypeScriptTypes(source))
      .replace(/^import\b[^;]*;/gm, '')
      .replace(/^export /gm, '');
  }).join('\n');
}

/** `stripTypeScriptTypes` warns that it is experimental on every run. The reader of the command cannot act on it. */
function withoutWarning<T>(run: () => T): T {
  const emitWarning = process.emitWarning;
  process.emitWarning = () => {};
  try {
    return run();
  } finally {
    process.emitWarning = emitWarning;
  }
}
