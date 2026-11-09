const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...config.watchFolders, monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];
config.resolver.sourceExts = [...config.resolver.sourceExts, "mjs", "cjs"];

// Workspace packages follow the monorepo ESM convention and import with a `.js`
// extension while shipping TypeScript sources, which Metro cannot resolve.
const JS_EXTENSION = /\.js$/;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    if (!moduleName.startsWith(".") || !JS_EXTENSION.test(moduleName)) {
      throw error;
    }
    return context.resolveRequest(
      context,
      moduleName.replace(JS_EXTENSION, ""),
      platform,
    );
  }
};

module.exports = withNativeWind(config, {
  input: "./src/global.css",
  inlineRem: 16,
});
