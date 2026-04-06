const fs = require("fs");

const pkg = require("../package.json");
const appPath = "./app.json";

const app = JSON.parse(fs.readFileSync(appPath, "utf8"));

// garante estrutura
if (!app.expo.android) {
    app.expo.android = {};
}

// pega versionCode atual
let versionCode = app.expo.android.versionCode || 1;

// incrementa
versionCode++;

// atualiza
app.expo.version = pkg.version;
app.expo.android.versionCode = versionCode;

// salva
fs.writeFileSync(appPath, JSON.stringify(app, null, 2) + "\n");

console.log("Expo version updated:");
console.log("versionName:", pkg.version);
console.log("versionCode:", versionCode);
