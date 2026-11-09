import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Orval's bundled get-tsconfig cannot resolve Expo's exports-based
// `expo/tsconfig.base`, so generation runs against a flat tsconfig that is
// always restored afterwards.
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const tsconfigPath = join(projectDir, "tsconfig.json");
const specPath = join(projectDir, "swagger.json");
const originalTsconfig = readFileSync(tsconfigPath, "utf8");

const DEFAULT_API_URL = "http://localhost:3000";
const SPEC_PATH = "/swagger.json";

const FLAT_TSCONFIG = `${JSON.stringify(
  {
    compilerOptions: {
      strict: true,
      jsx: "react-jsx",
      module: "esnext",
      moduleResolution: "bundler",
      paths: { "@/*": ["./src/*"], "@/assets/*": ["./assets/*"] },
    },
    include: ["**/*.ts", "**/*.tsx"],
  },
  null,
  2,
)}\n`;

const restoreTsconfig = () => writeFileSync(tsconfigPath, originalTsconfig);

const exitAfterRestore = (code) => () => {
  restoreTsconfig();
  process.exit(code);
};

process.on("SIGINT", exitAfterRestore(130));
process.on("SIGTERM", exitAfterRestore(143));

const downloadSpec = async () => {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
  const specUrl = `${baseUrl}${SPEC_PATH}`;
  const response = await fetch(specUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${specUrl}: ${response.status}`);
  }

  writeFileSync(specPath, await response.text());
};

await downloadSpec();

try {
  writeFileSync(tsconfigPath, FLAT_TSCONFIG);
  execFileSync("pnpm", ["exec", "orval", "--config", "orval.config.ts"], {
    cwd: projectDir,
    stdio: "inherit",
  });
} finally {
  restoreTsconfig();
}
