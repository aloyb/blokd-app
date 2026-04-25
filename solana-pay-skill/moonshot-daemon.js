const { execSync } = require("child_process");
const MOONSHOT_INTERVAL = 60 * 60 * 1000;  // 1 jam

function runMoonshot() {
  try {
    execSync("node /home/openclaw/.openclaw/skills/solana-pay/moonshot-monitor.js", { stdio: "inherit" });
  } catch (e) { console.error("Moonshot monitor error:", e.message); }
}

console.log("🦀 Moonshot monitor started");
console.log("   Check interval: every 1 hour");
console.log("   Alert threshold: $10");
runMoonshot();
setInterval(runMoonshot, MOONSHOT_INTERVAL);
