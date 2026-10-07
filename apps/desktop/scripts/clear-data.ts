import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { LocalDataCleaner } from '../src/main/local-data-cleaner';
import { APP_USER_DATA_FOLDER, DEVELOPMENT_USER_DATA_FOLDER } from '../src/main/local-data.constants';

/**
 * Clears the local data of Chaff from the command line while Chaff is not running.
 *
 *   pnpm run data:clear                   reviews and snapshots of `pnpm run dev` (Chaff Dev); keeps connections, tokens and settings
 *   pnpm run data:clear --full            everything Chaff wrote there, including tokens and settings
 *   pnpm run data:clear --app             the same for the installed app (Chaff)
 *   pnpm run data:clear --app --full
 *
 * `pnpm run data:clear -- --full` works too: pnpm hands the `--` on to this script.
 */

const USAGE = `Usage: pnpm run data:clear [--full] [--app]

  --full  also remove GitLab and GitHub connections, tokens and settings
  --app   clear the installed app (Chaff) instead of the development data (Chaff Dev)
  --help  show this message`;

/** The folder Electron keeps each app's `userData` folder in, per OS. */
function resolveAppDataDir() {
  switch (process.platform) {
    case 'darwin':
      return path.join(homedir(), 'Library', 'Application Support');
    case 'win32':
      return process.env.APPDATA ?? path.join(homedir(), 'AppData', 'Roaming');
    default:
      return process.env.XDG_CONFIG_HOME ?? path.join(homedir(), '.config');
  }
}

function readFlags() {
  const args = process.argv.slice(2);
  if (args[0] === '--') args.shift();
  const { values } = parseArgs({
    args,
    options: { full: { type: 'boolean' }, app: { type: 'boolean' }, help: { type: 'boolean' } },
    allowPositionals: false,
  });
  return { isFull: values.full === true, isInstalledApp: values.app === true, shouldShowHelp: values.help === true };
}

async function run() {
  const { isFull, isInstalledApp, shouldShowHelp } = readFlags();
  if (shouldShowHelp) {
    console.log(USAGE);
    return;
  }

  const userDataDir = path.join(
    resolveAppDataDir(),
    isInstalledApp ? APP_USER_DATA_FOLDER : DEVELOPMENT_USER_DATA_FOLDER,
  );
  const cleaner = new LocalDataCleaner(userDataDir);

  const runningProcessId = await cleaner.findRunningProcessId();
  if (runningProcessId !== null) {
    throw new Error(`Chaff is running (process ${runningProcessId}) and holds ${userDataDir}. Quit Chaff first.`);
  }

  console.log(
    `Clearing ${isFull ? 'all local data, including tokens and settings,' : 'reviews and snapshots'} in ${userDataDir}`,
  );
  const { clearedTables, removedEntries } = await cleaner.clear({ isFull });

  for (const { name, rowCount } of clearedTables) {
    if (rowCount > 0) console.log(`  emptied ${name} (${rowCount} rows)`);
  }
  for (const entry of removedEntries) console.log(`  removed ${entry}`);
  if (clearedTables.every(({ rowCount }) => rowCount === 0) && removedEntries.length === 0) {
    console.log('  nothing to remove');
  }
  if (!isFull) console.log('Connections, tokens and settings were kept. Add --full to remove them too.');
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
