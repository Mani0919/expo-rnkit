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
╔══════════════════════════════════════════════════════════════╗
   RNKIT — Expo + NativeWind + Query + Zustand + SVG + Icons
╚══════════════════════════════════════════════════════════════╝
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

  // ---------- structure ----------
  if (fs.existsSync("app")) {
    fs.mkdirSync("src", { recursive: true });
    fs.renameSync("app", "src/app");
  }

  // ---------- NativeWind ----------
  const installNativewind = (await ask("Install NativeWind? (Y/n): ")) !== "n";

  if (installNativewind) {
    section("Installing NativeWind");

    run(`npx expo install nativewind react-native-reanimated react-native-safe-area-context`);
    run(`npm install -D tailwindcss prettier-plugin-tailwindcss babel-preset-expo`);
    run(`npx tailwindcss init`);

    fs.writeFileSync("global.css", `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

    fs.writeFileSync("tailwind.config.js", `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.tsx", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: { extend: { colors: {}, fontFamily: {} } },
  plugins: [],
};
`);

    fs.writeFileSync("babel.config.js", `module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo",{jsxImportSource:"nativewind"}],"nativewind/babel"],
  };
};`);
  }

  // ---------- other deps ----------
  if ((await ask("Install React Query? (Y/n): ")) !== "n") {
    run(`npm install @tanstack/react-query`);
  }

  if ((await ask("Install AsyncStorage? (Y/n): ")) !== "n") {
    run(`npx expo install @react-native-async-storage/async-storage`);
  }

  if ((await ask("Install Formik + Yup? (Y/n): ")) !== "n") {
    run(`npm install formik yup`);
  }

  if ((await ask("Install Zustand? (Y/n): ")) !== "n") {
    run(`npm install zustand`);
    fs.mkdirSync("src/store", { recursive: true });

    fs.writeFileSync("src/store/useAppStore.ts", `import { create } from 'zustand';

export const useAppStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
`);
  }

  // ---------- SVG SYSTEM ----------
  const setupSVG = (await ask("Setup SVG system? (Y/n): ")) !== "n";

  if (setupSVG) {
    section("Setting up SVG system");

    run(`npm install -D react-native-svg-transformer @svgr/cli chokidar`);

    fs.mkdirSync("assets/svgs", { recursive: true });
    fs.mkdirSync("scripts", { recursive: true });
    fs.mkdirSync("src/constants", { recursive: true });

    // SVG generator script
    fs.writeFileSync(
      "scripts/generate-svg-index.cjs",
      `const fs = require("fs");
const path = require("path");

const svgDir = path.resolve(__dirname, "../assets/svgs");
const constantsDir = path.resolve(__dirname, "../src/constants");

const toPascalCase = (str) =>
  str
    .replace(/(\\.tsx)$/i, "")
    .replace(/(^\\w|-\\w)/g, (m) => m.replace("-", "").toUpperCase());

const files = fs.readdirSync(svgDir).filter(f => f.endsWith(".tsx"));

// index.ts
const exportLines = files.map(file => {
  const name = toPascalCase(file);
  return \`export { default as \${name} } from "./\${file}";\`;
});

fs.writeFileSync(path.join(svgDir, "index.ts"), exportLines.join("\\n"));

// icons.ts
const imports = [];
const iconEntries = [];

files.forEach(file => {
  const name = toPascalCase(file);
  const varName = \`Svg\${name}\`;

  imports.push(\`import \${varName} from "@/assets/svgs/\${name}";\`);

  iconEntries.push(
    \`  \${name.charAt(0).toLowerCase() + name.slice(1)}: (props) => <\${varName} {...props} />,\`
  );
});

const content = \`
import React from "react";
\${imports.join("\\n")}

export const Icons = {
\${iconEntries.join("\\n")}
};
\`;

fs.writeFileSync(path.join(constantsDir, "icons.ts"), content);

console.log("✔ SVG index + Icons generated");
`
    );
  }

  // ---------- METRO ----------
  fs.writeFileSync(
    "metro.config.js",
    `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer");
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== "svg");
config.resolver.sourceExts.push("svg");

module.exports = withNativeWind(config,{input:"./global.css"});
`
  );

  // ---------- package.json ----------
  const pkg = JSON.parse(fs.readFileSync("package.json"));

  pkg.scripts = {
    ...pkg.scripts,
    "svg": "svgr --native --typescript --no-index --ext tsx --out-dir ./assets/svgs ./assets/svgs && npm run svg:index && find ./assets/svgs -name '*.svg' -type f -delete",
    "svg:index": "node scripts/generate-svg-index.cjs",
    "svg:watch": "chokidar 'assets/svgs/**/*.svg' -c 'npm run svg'",
    "dev:android": "eas build --platform android --profile development",
    "dev:ios": "eas build --platform ios --profile development",
    "preview:android": "eas build --platform android --profile preview",
    "prod:android": "eas build --platform android --profile production",
    "prod:ios": "eas build --platform ios --profile production"
  };

  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));

  // ---------- finish ----------
  success("Project ready 🚀");

  console.log(`
cd ${projectName}
npm run svg
npx expo start -c
`);
})();