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
   RNKIT — Expo(Routers) + Typescript + NativeWind + TanStack + AsyncStorage
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

  // handle both templates
  if (fs.existsSync("app")) {
    fs.mkdirSync("src", { recursive: true });
    fs.renameSync("app", "src/app");
    success("Moved app → src/app");
  } else if (fs.existsSync("src/app")) {
    success("Expo already using src/app structure");
  }

  // ---------- NativeWind ----------
  const installNativewind = (await ask("Install NativeWind? (Y/n): ")) !== "n";

  if (installNativewind) {
    section("Installing NativeWind");

    run(`npx expo install nativewind react-native-reanimated react-native-safe-area-context`);
    run(`npx expo install --dev tailwindcss prettier-plugin-tailwindcss babel-preset-expo`);
    run(`npx tailwindcss init`);

    fs.writeFileSync("global.css", `@tailwind base;
@tailwind components;
@tailwind utilities;
`);

    fs.writeFileSync("babel.config.js",
`module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo",{jsxImportSource:"nativewind"}],"nativewind/babel"],
  };
};`
    );

    fs.writeFileSync("metro.config.js",
`const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config,{input:"./global.css"});`
    );

    success("NativeWind configured");
  }

  // ---------- React Query ----------
  const installQuery = (await ask("Install TanStack Query? (Y/n): ")) !== "n";

  if (installQuery) {
    section("Installing React Query");
    run(`npm install @tanstack/react-query`);
    success("React Query installed");
  }

  // ---------- Async Storage ----------
  const installStorage = (await ask("Install AsyncStorage? (Y/n): ")) !== "n";

  if (installStorage) {
    section("Installing AsyncStorage");
    run(`npx expo install @react-native-async-storage/async-storage`);
    success("AsyncStorage installed");
  }

  // ---------- layout ----------
  section("Configuring Layout");

  fs.mkdirSync("src/app", { recursive: true });

  let layout = "";

// imports
if (installNativewind) layout += `import "../../global.css";\n`;
layout += `import { Stack } from "expo-router";\n`;

if (installQuery) {
  layout += `import { QueryClient, QueryClientProvider } from "@tanstack/react-query";\n\n`;
  layout += `const queryClient = new QueryClient();\n\n`;
}

// component
layout += `export default function RootLayout() {\n`;
layout += `  return (\n`;

if (installQuery) layout += `    <QueryClientProvider client={queryClient}>\n`;

layout += `      <Stack />\n`;

if (installQuery) layout += `    </QueryClientProvider>\n`;

layout += `  );\n`;
layout += `}\n`;

fs.writeFileSync("src/app/_layout.tsx", layout);

  // ---------- finish ----------
  section("Finished");

  success("Project ready!");
  console.log(`\ncd ${projectName}`);
  console.log("npx expo start -c\n");

})();
