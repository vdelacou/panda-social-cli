import packageJson from '../../package.json' with { type: 'json' };

// The bundler inlines package.json, so the built CLI reports the version it shipped with.
export const PACKAGE_NAME: string = packageJson.name;
export const PACKAGE_VERSION: string = packageJson.version;
