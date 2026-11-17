import { spawn } from 'node:child_process';
import { platform } from 'node:process';

/**
 * Opens a file in the default browser of the system.
 * It does not wait for the browser.
 *
 * @param filePath Absolute path of the file.
 */
export function openInBrowser(filePath: string): void {
  const [command, args] = openCommand(filePath);
  const child = spawn(command, args, { detached: true, stdio: 'ignore' });
  // Without a listener a missing command would crash the process.
  child.on('error', error => {
    console.error(`Cannot open the browser: ${error.message}`);
  });
  child.unref();
}

function openCommand(filePath: string): [command: string, args: string[]] {
  switch (platform) {
    case 'win32':
      // "start" takes the first quoted argument as a window title. So the title is empty.
      return ['cmd', ['/c', 'start', '""', filePath]];
    case 'darwin':
      return ['open', [filePath]];
    default:
      return ['xdg-open', [filePath]];
  }
}
