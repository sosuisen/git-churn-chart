import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      // main.ts is the entry point and git.ts only calls the git command.
      // Unit tests cannot run them without a real repository.
      // browser.ts only starts the browser of the system.
      exclude: ['src/main.ts', 'src/git.ts', 'src/browser.ts'],
    },
  },
});
