const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

/**
 * Zustand's ESM build uses `import.meta.env`, which throws in the classic script
 * tag Metro serves for web ("Cannot use 'import.meta' outside a module").
 * Force the CommonJS entry (uses process.env.NODE_ENV) for web.
 */
const zustandCjs = path.join(projectRoot, "node_modules/zustand/index.js");
const zustandMiddlewareCjs = path.join(
  projectRoot,
  "node_modules/zustand/middleware.js"
);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web") {
    if (moduleName === "zustand") {
      return { filePath: zustandCjs, type: "sourceFile" };
    }
    if (moduleName === "zustand/middleware") {
      return { filePath: zustandMiddlewareCjs, type: "sourceFile" };
    }
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
