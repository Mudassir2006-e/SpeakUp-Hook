const http = require("http");
const https = require("https");
const localtunnel = require("localtunnel");

const PORT = parseInt(process.env.PORT || "3000", 10);
const LOCAL_HOST = "127.0.0.1";

// Helper: Check if local dev server is responding on target port
function checkPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host,
        port,
        path: "/",
        method: "HEAD",
        timeout: 2000,
      },
      (res) => {
        resolve(true);
      }
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

// Helper: Fetch public IP (used by loca.lt as the friendly bypass password)
function getTunnelPassword() {
  return new Promise((resolve) => {
    https
      .get("https://loca.lt/mytunnelpassword", { timeout: 3000 }, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data.trim() || "Not available"));
      })
      .on("error", () => {
        // Fallback to ipify if loca.lt password service is slow
        https
          .get("https://api.ipify.org", { timeout: 3000 }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(data.trim() || "Not available"));
          })
          .on("error", () => resolve("Check your public IP if prompted"));
      });
  });
}

async function startTunnel() {
  console.log("\n⏳ Initializing SpeakUp temporary public link...\n");

  // 1. Verify local dev server is active
  const isServerRunning = await checkPortOpen(PORT, LOCAL_HOST);
  if (!isServerRunning) {
    console.warn(`⚠️ Warning: No local server detected responding on http://${LOCAL_HOST}:${PORT}.`);
    console.warn(`   Make sure your Next.js dev server is running (e.g. "npm run dev") in another terminal.\n`);
  }

  // 2. Fetch tunnel password in parallel
  const [tunnelPassword] = await Promise.all([
    getTunnelPassword(),
  ]);

  try {
    // 3. Establish LocalTunnel
    const tunnel = await localtunnel({
      port: PORT,
      local_host: LOCAL_HOST,
    });

    const publicUrl = tunnel.url;

    console.log("==============================================================================");
    console.log("               SPEAKUP TEMPORARY PUBLIC LINK ACTIVE (OPTION 1)                ");
    console.log("==============================================================================");
    console.log(`\n  Public URL:        ${publicUrl}`);
    console.log(`  Local Forwarding:  http://${LOCAL_HOST}:${PORT}`);
    if (tunnelPassword && tunnelPassword !== "Not available") {
      console.log(`  Tunnel Password:   ${tunnelPassword} (Enter this if prompted by loca.lt)`);
    }
    console.log("\n  Direct Routes for Remote Inspection:");
    console.log(`  * Frontend Home:   ${publicUrl}`);
    console.log(`  * Student LMS:     ${publicUrl}/lms/dashboard`);
    console.log(`  * Admin Panel:     ${publicUrl}/admin`);
    console.log(`  * Login Portal:    ${publicUrl}/auth/login`);
    console.log("\n  Security & Access:");
    console.log("  * All routes remain protected by Supabase authentication & session cookies.");
    console.log("  * To open the Admin Panel, sign in with an authorized administrator account.");
    console.log("  * Code changes saved locally will reflect upon refreshing your remote browser.");
    console.log("\n  To Stop:");
    console.log("  * Press Ctrl + C to terminate the tunnel anytime. No files or git code affected.");
    console.log("==============================================================================\n");

    // Handle tunnel close and errors
    tunnel.on("close", () => {
      console.log("\n🛑 Public tunnel has closed.\n");
      process.exit(0);
    });

    tunnel.on("error", (err) => {
      console.error("\n❌ Tunnel error encountered:", err.message);
    });

    // Clean exit handlers
    const shutdown = () => {
      console.log("\n\n🛑 Shutting down temporary public link...");
      try {
        tunnel.close();
      } catch {
        // ignore
      }
      console.log("✓ Public link closed. Remote access terminated.\n");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("❌ Failed to establish localtunnel:", err.message);
    console.log("   Suggestion: Verify your internet connection or check firewall settings.\n");
    process.exit(1);
  }
}

startTunnel();
