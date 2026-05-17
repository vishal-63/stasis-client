const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "../node_modules/react-native-share-menu/android/build.gradle",
);

if (!fs.existsSync(filePath)) {
  console.log("react-native-share-menu build.gradle not found, skipping patch");
  process.exit(0);
}

let content = fs.readFileSync(filePath, "utf8");

content = content
  .replace(/compileSdkVersion \d+/g, "compileSdkVersion 36")
  .replace(/compileSdk \d+/g, "compileSdk 36");

fs.writeFileSync(filePath, content, "utf8");
console.log("Patched react-native-share-menu compileSdkVersion to 36");
