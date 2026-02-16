cat << 'EOF' > README.md
# RNKIT 🚀
### Expo Project Generator CLI

RNKIT is a command-line tool that scaffolds a clean Expo React Native project and optionally configures common production tools automatically.

You can install only what you need:

- NativeWind (Tailwind CSS for React Native)
- TanStack Query (server state management)
- AsyncStorage (local persistence)
- Clean src/app architecture
- Ready-to-run layout setup

No manual configuration. Start building immediately.

---

## 📦 Usage

Run instantly without installing:

npx @mani_0919/rnkit myApp

Or install globally:

npm install -g @mani_0919/rnkit
rnkit myApp

---

## ▶️ Start the App

cd myApp
npx expo start -c

---

## 🧠 Interactive Setup

RNKIT will ask step-by-step:

Project name
Run reset-project
Install NativeWind
Install TanStack Query
Install AsyncStorage

Only selected features will be installed — keeping your project lightweight.

---


## 🛠 Local Development

git clone https://github.com/Mani0919/expo-rnkit.git
cd expo-rnkit
npm link
rnkit testApp

---

## 📤 Publishing Updates

npm version patch
npm publish

---

## 🔄 Always Use Latest Version

npx @mani_0919/rnkit@latest myApp

---

## ⚙️ Requirements

Node.js 18+
npm
Internet connection

---

## 🧑‍💻 Author

Mani

---

## 📜 License

MIT © Mani
EOF
