import { createBackendConfig } from '@chaff/eslint-config';

export default createBackendConfig({
  rootDir: import.meta.url,
  additionalIgnores: ['electron-builder.config.mjs'],
});
