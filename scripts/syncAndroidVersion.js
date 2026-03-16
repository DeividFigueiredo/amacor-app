const fs = require("fs");

const pkg = require("../package.json");
const gradlePath = "android/app/build.gradle";

let gradle = fs.readFileSync(gradlePath, "utf8");

// pega versionCode atual
const codeMatch = gradle.match(/versionCode (\d+)/);
let versionCode = codeMatch ? parseInt(codeMatch[1]) : 1;

versionCode++;

gradle = gradle.replace(/versionCode \d+/, `versionCode ${versionCode}`);
gradle = gradle.replace(/versionName ".*"/, `versionName "${pkg.version}"`);

fs.writeFileSync(gradlePath, gradle);

console.log("Android version updated:");
console.log("versionName:", pkg.version);
console.log("versionCode:", versionCode);