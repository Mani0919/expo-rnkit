#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ---------- helpers ----------
function run(cmd) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`);
  execSync(cmd, { stdio: "inherit", shell: true });
}

function section(title) {
  console.log(`\n\x1b[33m━━━ ${title} ━━━\x1b[0m`);
}

function success(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function ask(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    });
  });
}

// ---------- header ----------
console.log(`
\x1b[35m
╔═══════════════════════════════════════════════════════════════════════════╗
   RNKIT — Expo + TS + NativeWind + Query + Zustand + SVG System
╚═══════════════════════════════════════════════════════════════════════════╝
\x1b[0m
`);

(async function init() {

  const projectName = await ask("Project name: ");
  if (!projectName) {
    console.log("❌ Project name required");
    process.exit(1);
  }

  // ---------- create expo ----------
  section("Creating Expo App");
  run(`npx create-expo-app@latest ${projectName} --yes`);
  process.chdir(path.resolve(projectName));

  // ---------- reset ----------
  const resetProject = (await ask("Run reset-project? (y/N): ")) === "y";
  if (resetProject) {
    section("Resetting project");
    run(`npm run reset-project`);
  }

  // ---------- structure ----------
  section("Project Structure");

  if (fs.existsSync("app")) {
    fs.mkdirSync("src", { recursive: true });
    fs.renameSync("app", "src/app");
    success("Moved app → src/app");
  }

  // ---------- NativeWind ----------
  const installNativewind = (await ask("Install NativeWind? (Y/n): ")) !== "n";

  if (installNativewind) {
    section("Installing NativeWind");

    run(`npx expo install nativewind react-native-reanimated react-native-safe-area-context`);
    run(`npm install -D tailwindcss prettier-plugin-tailwindcss babel-preset-expo`);
    run(`npx tailwindcss init`);

    // global css
    fs.writeFileSync("global.css", `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

    // tailwind config (YOUR CONFIG)
    fs.writeFileSync(
      "tailwind.config.js",
      `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {},
      fontFamily: {},
    },
  },
  plugins: [],
};
`
    );

    // babel
    fs.writeFileSync(
      "babel.config.js",
      `module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo",{jsxImportSource:"nativewind"}],"nativewind/babel"],
  };
};`
    );

    success("NativeWind configured");
  }

  // ---------- React Query ----------
  const installQuery = (await ask("Install React Query? (Y/n): ")) !== "n";

  if (installQuery) {
    section("Installing React Query");
    run(`npm install @tanstack/react-query`);
    success("React Query installed");
  }

  // ---------- AsyncStorage ----------
  const installStorage = (await ask("Install AsyncStorage? (Y/n): ")) !== "n";

  if (installStorage) {
    section("Installing AsyncStorage");
    run(`npx expo install @react-native-async-storage/async-storage`);
    success("AsyncStorage installed");
  }

  // ---------- Formik + Yup ----------
  const installFormik = (await ask("Install Formik + Yup? (Y/n): ")) !== "n";

  if (installFormik) {
    section("Installing Formik + Yup");
    run(`npm install formik yup`);
    success("Formik + Yup installed");
  }

  // ---------- Zustand ----------
  const installZustand = (await ask("Install Zustand? (Y/n): ")) !== "n";

  if (installZustand) {
    section("Installing Zustand");
    run(`npm install zustand`);

    fs.mkdirSync("src/store", { recursive: true });

    fs.writeFileSync(
      "src/store/useAppStore.ts",
      `import { create } from 'zustand';

type AppState = {
  count: number;
  increment: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
`
    );

    success("Zustand installed");
  }

  // ---------- SVG Setup ----------
  const setupSVG = (await ask("Setup SVG system? (Y/n): ")) !== "n";

  if (setupSVG) {
    section("Setting up SVG system");

    run(`npm install -D react-native-svg-transformer @svgr/cli chokidar`);

    fs.mkdirSync("assets/svgs", { recursive: true });
    fs.mkdirSync("scripts", { recursive: true });

    // SVG index generator
    fs.writeFileSync(
      "scripts/generate-svg-index.js",
      `const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "../assets/svgs");

const files = fs.readdirSync(dir).filter(f => f.endsWith(".tsx"));

const exports = files.map(file => {
  const name = file.replace(".tsx", "");
  return \`export { default as \${name} } from "./\${file}";\`;
});

fs.writeFileSync(path.join(dir, "index.ts"), exports.join("\\n"));

console.log("✔ SVG index generated");
`
    );

    success("SVG system ready");
  }

  // ---------- METRO CONFIG (MERGED FIX) ----------
  section("Configuring Metro");

  fs.writeFileSync(
    "metro.config.js",
    `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// SVG transformer
config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");
config.resolver.sourceExts.push("svg");

// NativeWind
module.exports = withNativeWind(config,{input:"./global.css"});
`
  );

  success("Metro configured (NativeWind + SVG)");

  // ---------- Layout ----------
  section("Configuring Layout");

  fs.mkdirSync("src/app", { recursive: true });

  let layout = "";

  if (installNativewind) layout += `import "../../global.css";\n`;
  layout += `import { Stack } from "expo-router";\n`;

  if (installQuery) {
    layout += `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";\n\n`;
    layout += `const queryClient = new QueryClient();\n\n`;
  }

  layout += `export default function RootLayout() {\n`;
  layout += `  return (\n`;

  if (installQuery) layout += `    <QueryClientProvider client={queryClient}>\n`;

  layout += `      <Stack />\n`;

  if (installQuery) layout += `    </QueryClientProvider>\n`;

  layout += `  );\n`;
  layout += `}\n`;

  fs.writeFileSync("src/app/_layout.tsx", layout);

  // ---------- package.json ----------
  section("Updating package.json");

  const pkgPath = path.resolve("package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

  pkg.scripts = {
    ...pkg.scripts,
    "svg": "svgr --native --typescript --ext tsx --out-dir ./assets/svgs ./assets/svgs && npm run svg:index && find ./assets/svgs -name '*.svg' -type f -delete",
    "svg:index": "node scripts/generate-svg-index.js",
    "svg:watch": "chokidar 'assets/svgs/**/*.svg' -c 'npm run svg'",
    "prebuild": "npx expo prebuild --clean",
    "dev:android": "eas build --platform android --profile development",
    "dev:ios": "eas build --platform ios --profile development",
    "preview:android": "eas workflow:run preview-android.yml",
    "preview:ios": "eas build --platform ios --profile preview",
    "prod:android": "eas build --platform android --profile production",
    "prod:ios": "eas build --platform ios --profile production"
  };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));

  success("Scripts added");

  // ---------- done ----------
  section("Finished");

  success("Project ready 🚀");

  console.log(`\ncd ${projectName}`);
  console.log("npm run svg");
  console.log("npx expo start -c\n");

})();