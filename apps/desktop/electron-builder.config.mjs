/**
 * Packages Chaff for the machine it runs on (`pnpm run package` from the repository root).
 * Builds are unsigned and never update themselves.
 *
 * @type {import('electron-builder').Configuration}
 */
export default {
  appId: 'dev.chaff.desktop',
  productName: 'Chaff',
  directories: { output: 'release', buildResources: 'build' },
  files: ['dist/**/*', 'package.json', '!dist/**/*.map'],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  publish: null,
  mac: {
    target: ['dmg'],
    category: 'public.app-category.developer-tools',
    identity: null,
  },
  win: { target: ['nsis'] },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true },
  linux: { target: ['AppImage'], category: 'Development', executableName: 'chaff' },
};
