const fs = require("fs");
const path = require("path");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

const clientDist = path.resolve(__dirname, "../../client/dist");
const serverDist = path.resolve(__dirname, "../dist");

if (!fs.existsSync(clientDist)) {
  console.error("Client dist not found. Run `npm run build:client` first.");
  process.exit(1);
}

fs.rmSync(serverDist, { recursive: true, force: true });
copyDir(clientDist, serverDist);
console.log("Copied client/dist -> server/dist");
