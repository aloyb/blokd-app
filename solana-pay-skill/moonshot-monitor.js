const https = require("https");
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "config.json");

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function sendTelegram(botToken, chatId, message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" });
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${botToken}/sendMessage`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => { let body = ""; res.on("data", c => body += c); res.on("end", () => resolve(body)); });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function checkMoonshotBalance(apiKey) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.moonshot.ai",
      path: "/v1/users/me/balance",
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}` },
    }, (res) => {
      let body = "";
      res.on("data", c => body += c);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); } catch { resolve({ raw: body }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const cfg = loadConfig();
  const moonshotKey = cfg.moonshotApiKey;
  if (!moonshotKey) {
    console.log("moonshotApiKey not set in config.json");
    return;
  }

  const result = await checkMoonshotBalance(moonshotKey);
  console.log("Moonshot balance response:", JSON.stringify(result));

  // Extract balance (format may vary)
  let balance = null;
  if (result.data && result.data.available_balance !== undefined) {
    balance = parseFloat(result.data.available_balance);
  } else if (result.data && result.data.balance !== undefined) {
    balance = parseFloat(result.data.balance);
  } else if (result.available_balance !== undefined) {
    balance = parseFloat(result.available_balance);
  } else if (result.balance !== undefined) {
    balance = parseFloat(result.balance);
  }

  if (balance === null) {
    console.log("Could not parse balance, raw:", JSON.stringify(result));
    if (cfg.telegramBotToken && cfg.telegramChatId) {
      await sendTelegram(cfg.telegramBotToken, cfg.telegramChatId,
        `⚠️ *OpenClaw Moonshot Monitor*\n\nGak bisa baca saldo Moonshot.\nResponse: \`${JSON.stringify(result).slice(0, 200)}\`\n\nCek manual: https://platform.moonshot.ai/console`
      );
    }
    return;
  }

  console.log("Moonshot balance: $" + balance.toFixed(4));

  const LOW_THRESHOLD = 10.0; // Alert kalau saldo < $10

  if (balance < LOW_THRESHOLD && cfg.telegramBotToken && cfg.telegramChatId) {
    await sendTelegram(cfg.telegramBotToken, cfg.telegramChatId,
      `🚨 *Moonshot Saldo Hampir Habis!*\n\n` +
      `Saldo: \`$${balance.toFixed(4)}\`\n` +
      `Threshold: \`$${LOW_THRESHOLD}\`\n\n` +
      `⚡ Top up sekarang:\nhttps://platform.moonshot.ai/console/pay\n\n` +
      `Estimasi sisa: ~${Math.floor(balance / 0.09)} hari (50 chat/hari)`
    );
    console.log("Low balance alert sent!");
  }
}

main().catch(e => console.error("Error:", e.message));
