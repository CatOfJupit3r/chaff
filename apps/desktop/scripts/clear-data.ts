import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { LocalDataCleaner } from '../src/main/local-data-cleaner';
import { APP_USER_DATA_FOLDER, DEVELOPMENT_USER_DATA_FOLDER } from '../src/main/local-data.constants';

/**
 * Clears the local data of Chaff from the command line while Chaff is not running. Each case has its own
 * command, which passes `--app` and `--full` here:
 *
 *   pnpm run data:clear            reviews and snapshots of `pnpm run dev` (Chaff Dev); keeps connections, tokens and settings
 *   pnpm run data:clear:full       everything Chaff Dev wrote, including tokens and settings
 *   pnpm run data:clear:app        reviews and snapshots of the installed app (Chaff)
 *   pnpm run data:clear:app:full   everything the installed app wrote, including tokens and settings
 */

const USAGE = `Usage:
  pnpm run data:clear            reviews and snapshots of Chaff Dev; keeps connections, tokens and settings
  pnpm run data:clear:full       everything in Chaff Dev, including connections, tokens and settings
  pnpm run data:clear:app        reviews and snapshots of the installed app (Chaff)
  pnpm run data:clear:app:full   everything in the installed app, including connections, tokens and settings`;

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
  if (!isFull) {
    const fullCommand = isInstalledApp ? 'data:clear:app:full' : 'data:clear:full';
    console.log(`Connections, tokens and settings were kept. Run pnpm run ${fullCommand} to remove them too.`);
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
