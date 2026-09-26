/* ==========================================================================
   SENTINAL-AI — Enterprise Penetration Testing Suite Frontend Logic
   Engineered by Afran Layesh 
   ========================================================================== */

// Global State
let ws = null;
let currentFindings = [];
let terminalLineCount = 0;

// DOM Ready Lifecycle
document.addEventListener("DOMContentLoaded", () => {
  initAmbientMesh();
  initNavigation();
  initWebSocket();
  initScanForm();
  initCrackForm();
  loadFindings();
});

// Subtle Ambient Particle Mesh Animation (Non-intrusive, classy cyber backdrop)
function initAmbientMesh() {
  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  const particleCount = Math.floor((width * height) / 22000);
  const particles = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 1.5 + 0.5,
    });
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
    ctx.strokeStyle = "rgba(56, 189, 248, 0.05)";

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(render);
  }

  render();
}

// Navigation Tabs
function initNavigation() {
  const navBtns = document.querySelectorAll(".nav-btn");
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  const targetPane = document.getElementById(tabId);

  if (targetBtn) targetBtn.classList.add("active");
  if (targetPane) targetPane.classList.add("active");

  if (tabId === "tab-reports") {
    loadFindings();
  }
}

// WebSocket Connection & Real-time Telemetry
function initWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    updateEngineStatus(true, "SENTINAL ONLINE");
    appendTerminalLine("[*] Encrypted WebSocket uplink established with Sentinal-AI core engine.", "info");
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWsMessage(msg);
    } catch (e) {
      appendTerminalLine(event.data, "dim");
    }
  };

  ws.onclose = () => {
    updateEngineStatus(false, "OFFLINE");
    appendTerminalLine("[!] Connection to engine dropped. Auto-reconnecting in 3s...", "warning");
    setTimeout(initWebSocket, 3000);
  };
}

function updateEngineStatus(online, text) {
  const badge = document.getElementById("engine-status");
  if (!badge) return;
  const dot = badge.querySelector(".status-dot");
  const span = badge.querySelector("span");

  if (online) {
    badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
    badge.style.color = "var(--accent-emerald)";
    dot.style.background = "var(--accent-emerald)";
    dot.style.boxShadow = "0 0 8px var(--accent-emerald)";
    span.textContent = text;
  } else {
    badge.style.borderColor = "rgba(239, 68, 68, 0.4)";
    badge.style.color = "var(--accent-red)";
    dot.style.background = "var(--accent-red)";
    dot.style.boxShadow = "0 0 8px var(--accent-red)";
    span.textContent = text;
  }
}

function handleWsMessage(msg) {
  if (msg.type === "scan_started") {
    setScanningState(true);
    appendTerminalLine(`\n[+] AUDIT INITIATED: Target designated -> ${msg.url}`, "info");
    clearFindingsDisplay();
    document.getElementById("terminal-stats").textContent = "SCANNING";
  } else if (msg.type === "log") {
    parseAndAppendLog(msg.data);
  } else if (msg.type === "scan_completed") {
    setScanningState(false);
    appendTerminalLine(`\n[✔] AUDIT COMPLETED: ${msg.target} (Elapsed: ${msg.elapsed}s)`, "success");
    document.getElementById("terminal-stats").textContent = "IDLE";
    if (msg.report) {
      displayFindings(msg.report);
    }
    loadFindings();
  }
}

// Terminal Output Handling
function appendTerminalLine(text, type = "normal") {
  const terminal = document.getElementById("terminal-output");
  if (!terminal) return;
  const line = document.createElement("div");
  line.className = `terminal-line ${type}`;
  line.textContent = text;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
  terminalLineCount++;
}

function parseAndAppendLog(line) {
  let type = "normal";
  if (line.includes("VULNERABLE") || line.includes("CRITICAL") || line.includes("bypassed") || line.includes("500")) {
    type = "danger";
  } else if (line.includes("✔") || line.includes("SUCCESS") || line.includes("CRACKED") || line.includes("completed")) {
    type = "success";
  } else if (line.includes("Testing:") || line.includes("Phase") || line.includes("Target") || line.includes("Starting")) {
    type = "info";
  } else if (line.includes("safe") || line.includes("DEBUG") || line.includes("dim")) {
    type = "dim";
  } else if (line.includes("WARNING") || line.includes("RATE LIMITED") || line.includes("[!]")) {
    type = "warning";
  }
  appendTerminalLine(line, type);
}

function clearTerminal() {
  const terminal = document.getElementById("terminal-output");
  if (terminal) {
    terminal.innerHTML = "";
    appendTerminalLine("[*] Terminal output buffer cleared.", "dim");
  }
}

function copyTerminalLogs() {
  const terminal = document.getElementById("terminal-output");
  if (!terminal) return;
  const text = terminal.innerText;
  navigator.clipboard.writeText(text).then(() => {
    alert("Terminal telemetry logs copied to clipboard.");
  }).catch(() => {
    alert("Could not copy logs.");
  });
}

// Target Form Handling
function initScanForm() {
  const form = document.getElementById("scan-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("target-url").value.trim();
    if (!url) return;

    const payload = {
      url: url,
      sqli: document.getElementById("opt-sqli").checked,
      brute: document.getElementById("opt-brute").checked,
      ratelimit: document.getElementById("opt-ratelimit").checked,
      ai: document.getElementById("opt-ai").checked,
      company: document.getElementById("opt-company").value.trim() || null,
      usernames: document.getElementById("opt-usernames").value.trim() || null,
    };

    setScanningState(true);

    try {
      const resp = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(data.error || "Failed to initiate audit scan");
        setScanningState(false);
      }
    } catch (err) {
      alert("Error starting security audit: " + err);
      setScanningState(false);
    }
  });
}

function setScanningState(isScanning) {
  const btn = document.getElementById("btn-start-scan");
  const spinner = document.getElementById("scan-spinner");
  const btnText = document.getElementById("scan-btn-text");

  if (!btn) return;
  btn.disabled = isScanning;
  if (isScanning) {
    if (spinner) spinner.style.display = "inline-block";
    if (btnText) btnText.textContent = "Executing Security Audit...";
  } else {
    if (spinner) spinner.style.display = "none";
    if (btnText) btnText.textContent = "Execute Security Audit";
  }
}

function setTargetPreset(url) {
  const input = document.getElementById("target-url");
  if (input) input.value = url;
}

// Findings Display
function clearFindingsDisplay() {
  document.getElementById("stat-critical").textContent = "0";
  document.getElementById("stat-high").textContent = "0";
  document.getElementById("stat-medium").textContent = "0";
  document.getElementById("stat-total").textContent = "0";
  document.getElementById("findings-count-badge").textContent = "0 findings";
  document.getElementById("findings-list").innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <div class="empty-text">Auditing active target...</div>
      <div class="empty-sub">Inspecting parameters, emulating authentication challenges, and measuring telemetry.</div>
    </div>
  `;
}

function displayFindings(report) {
  if (!report) return;

  const crit = report.critical || 0;
  const high = report.high || 0;
  const med = report.medium || 0;
  const total = report.total_findings || 0;

  document.getElementById("stat-critical").textContent = crit;
  document.getElementById("stat-high").textContent = high;
  document.getElementById("stat-medium").textContent = med;
  document.getElementById("stat-total").textContent = total;
  document.getElementById("findings-count-badge").textContent = `${total} finding${total === 1 ? "" : "s"}`;

  const container = document.getElementById("findings-list");
  container.innerHTML = "";

  const findings = report.findings || [];
  currentFindings = findings;

  if (findings.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="border-color: rgba(16, 185, 129, 0.3);">
        <div class="empty-icon">✔</div>
        <div class="empty-text" style="color:var(--accent-emerald);">Clean Surface Identified</div>
        <div class="empty-sub">No high-risk vulnerabilities or authentication bypasses were identified on this endpoint.</div>
      </div>
    `;
    return;
  }

  findings.forEach((f, idx) => {
    const card = document.createElement("div");
    const sev = (f.severity || "info").toLowerCase();
    card.className = `finding-card ${sev}`;

    let fixBtnHtml = "";
    if (f.remediation) {
      fixBtnHtml = `<button class="btn-fix" onclick="openFixModal(${idx})">🛡️ Fix Advisor</button>`;
    }

    card.innerHTML = `
      <div class="finding-title-row">
        <span class="finding-type">${f.type}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          ${fixBtnHtml}
          <span class="badge ${sev}">${f.severity}</span>
        </div>
      </div>
      <div class="finding-target">${f.target || report.scan_target}</div>
      <div class="finding-detail">${f.detail}</div>
    `;
    container.appendChild(card);
  });
}

// Remediation Advisor Modal
function openFixModal(idx) {
  const f = currentFindings[idx];
  if (!f) return;

  document.getElementById("modal-fix-title").textContent = `${f.type} — Remediation Blueprint`;
  document.getElementById("modal-fix-owasp").textContent = f.owasp || "OWASP Top 10";
  document.getElementById("modal-fix-cwe").textContent = f.cwe || "CWE Standard";
  document.getElementById("modal-fix-target").textContent = f.target || "";
  document.getElementById("modal-fix-detail").textContent = f.detail || "";
  document.getElementById("modal-fix-remed").textContent = f.remediation || "Review and enforce strict parameterization and rate limits.";

  const codeContainer = document.getElementById("modal-code-container");
  codeContainer.innerHTML = "";
  const fixes = f.fix_code || {};

  if (Object.keys(fixes).length > 0) {
    for (const [lang, code] of Object.entries(fixes)) {
      const box = document.createElement("div");
      box.className = "code-snippet-box";
      box.innerHTML = `<strong style="color:var(--accent-cyan-light); display:block; margin-bottom:4px;">${lang.toUpperCase()} RE-FACTOR:</strong><code>${escapeHtml(code)}</code>`;
      codeContainer.appendChild(box);
    }
  } else {
    codeContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">No language-specific snippet required. Apply architectural configuration patch noted above.</p>';
  }

  document.getElementById("fix-modal").style.display = "flex";
}

function closeFixModal() {
  document.getElementById("fix-modal").style.display = "none";
}

// Disclaimer Modal Handlers
function openDisclaimerModal() {
  document.getElementById("disclaimer-modal").style.display = "flex";
}

function closeDisclaimerModal() {
  document.getElementById("disclaimer-modal").style.display = "none";
}

function dismissBanner() {
  const banner = document.getElementById("advisory-banner");
  if (banner) banner.style.display = "none";
}

// About / Creator Modal Handlers
function openAboutModal() {
  document.getElementById("about-modal").style.display = "flex";
}

function closeAboutModal() {
  document.getElementById("about-modal").style.display = "none";
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Reports Pane
async function loadFindings() {
  try {
    const resp = await fetch("/api/findings");
    const files = await resp.json();
    const list = document.getElementById("reports-table-body");
    if (!list) return;
    list.innerHTML = "";

    if (files.length === 0) {
      list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No historical audit reports discovered in local archive.</td></tr>';
      return;
    }

    if (files.length > 0 && files[0].data && currentFindings.length === 0) {
      displayFindings(files[0].data);
    }

    files.forEach((file) => {
      const row = document.createElement("tr");
      const sev = (file.overall_risk || "INFO").toLowerCase();
      row.innerHTML = `
        <td style="font-family:var(--font-mono); font-size:0.82rem; color:var(--text-secondary);">${file.timestamp.replace("T", " ").substring(0, 19)}</td>
        <td style="font-family:var(--font-mono); color:var(--accent-cyan-light);">${file.target}</td>
        <td><span class="badge ${sev}">${file.overall_risk}</span></td>
        <td style="font-weight:700;">${file.total_findings} findings (${file.critical} crit)</td>
        <td style="display:flex; gap:8px;">
          <button class="btn-preset" onclick="viewReport('${file.filename}')">Inspect Findings</button>
          <a class="btn-preset" href="/api/reports/${file.filename}/export" target="_blank" style="text-decoration:none;">Executive Report</a>
        </td>
      `;
      list.appendChild(row);
    });
  } catch (e) {
    console.error("Error loading findings:", e);
  }
}

async function viewReport(filename) {
  try {
    const resp = await fetch(`/api/findings/${filename}`);
    const data = await resp.json();
    displayFindings(data);
    switchTab("tab-scan");
  } catch (err) {
    alert("Could not load report: " + err);
  }
}

// Hash Cracker Form
function initCrackForm() {
  const form = document.getElementById("crack-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const hash = document.getElementById("crack-hash").value.trim();
    if (!hash) return;

    const btn = document.getElementById("btn-start-crack");
    btn.disabled = true;
    btn.textContent = "Analyzing Hash Vectors...";

    const resultBox = document.getElementById("crack-result-box");
    resultBox.style.display = "none";

    try {
      const resp = await fetch("/api/crack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: hash,
          gpu: document.getElementById("opt-gpu").checked,
        }),
      });
      const data = await resp.json();
      resultBox.style.display = "block";

      const badge = document.getElementById("crack-result-badge");
      const sub = document.getElementById("crack-result-text");
      const passVal = document.getElementById("crack-plain-password");

      if (data.status === "cracked") {
        resultBox.style.borderColor = "rgba(16, 185, 129, 0.4)";
        resultBox.style.background = "rgba(16, 185, 129, 0.08)";
        badge.textContent = "CRACKED";
        badge.style.background = "var(--accent-emerald)";
        badge.style.color = "#000";
        sub.textContent = `Entropy depleted in ${data.time_sec}s (${data.type})`;
        passVal.textContent = data.password;
        passVal.style.color = "#34d399";
      } else {
        resultBox.style.borderColor = "rgba(239, 68, 68, 0.4)";
        resultBox.style.background = "rgba(239, 68, 68, 0.08)";
        badge.textContent = "EXHAUSTED";
        badge.style.background = "var(--accent-red)";
        badge.style.color = "#fff";
        sub.textContent = "Hash candidate withstood standard dictionary permutations.";
        passVal.textContent = "UNRECOVERED / STRONG ENTROPY";
        passVal.style.color = "#f87171";
      }
    } catch (err) {
      alert("Cracking analysis failed: " + err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Execute Hash Decryption Analysis";
    }
  });
}

function setCrackVector(hash) {
  const input = document.getElementById("crack-hash");
  if (input) input.value = hash;
}
