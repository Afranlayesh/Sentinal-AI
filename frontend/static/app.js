/* ==========================================================================
   SENTINAL-AI — Enterprise Penetration Testing Suite Frontend Logic
   Engineered by Afran Layesh 
   ========================================================================== */

// Global State
let ws = null;
let currentFindings = [];
let terminalLineCount = 0;
let pingInterval = null;
let reconnectTimer = null;

// DOM Ready Lifecycle
document.addEventListener("DOMContentLoaded", () => {
  initAmbientMesh();
  initNavigation();
  initWebSocket();
  initScanForm();
  initCrackForm();
  initModalListeners();
  loadFindings();
});

// Utility: Strip ANSI escape sequences produced by terminal color engines (Rich/Click)
function stripAnsi(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/\[\d+;\d+m/g, "")
    .replace(/\[\d+m/g, "")
    .replace(/\x1b/g, "");
}

// Utility: HTML Escaping
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Subtle Ambient Particle Mesh Animation (Non-intrusive, classy cyber backdrop)
function initAmbientMesh() {
  const canvas = document.getElementById("ambient-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

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
  if (!window.location.host) {
    updateEngineStatus(false, "OFFLINE");
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws`;

  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    updateEngineStatus(false, "OFFLINE");
    return;
  }

  ws.onopen = () => {
    updateEngineStatus(true, "SENTINAL ONLINE");
    appendTerminalLine("[*] Encrypted WebSocket uplink established with Sentinal-AI core engine.", "info");

    // Ping heartbeat every 15s to keep connection alive
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 15000);
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleWsMessage(msg);
    } catch (e) {
      appendTerminalLine(event.data, "dim");
    }
  };

  ws.onerror = () => {
    updateEngineStatus(false, "OFFLINE");
  };

  ws.onclose = () => {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
    updateEngineStatus(false, "OFFLINE");
    if (!reconnectTimer) {
      appendTerminalLine("[!] Connection to engine dropped. Auto-reconnecting in 3s...", "warning");
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        initWebSocket();
      }, 3000);
    }
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
    if (dot) {
      dot.style.background = "var(--accent-emerald)";
      dot.style.boxShadow = "0 0 8px var(--accent-emerald)";
    }
    if (span) span.textContent = text;
  } else {
    badge.style.borderColor = "rgba(239, 68, 68, 0.4)";
    badge.style.color = "var(--accent-red)";
    if (dot) {
      dot.style.background = "var(--accent-red)";
      dot.style.boxShadow = "0 0 8px var(--accent-red)";
    }
    if (span) span.textContent = text;
  }
}

function handleWsMessage(msg) {
  if (!msg) return;

  if (msg.type === "init") {
    if (msg.scan_running) {
      setScanningState(true);
      const statElem = document.getElementById("terminal-stats");
      if (statElem) statElem.textContent = "SCANNING";
      if (msg.target) {
        const input = document.getElementById("target-url");
        if (input && !input.value) input.value = msg.target;
      }
    } else {
      setScanningState(false);
      const statElem = document.getElementById("terminal-stats");
      if (statElem) statElem.textContent = "IDLE";
    }
  } else if (msg.type === "scan_started") {
    setScanningState(true);
    appendTerminalLine(`\n[+] AUDIT INITIATED: Target designated -> ${msg.url}`, "info");
    clearFindingsDisplay();
    const statElem = document.getElementById("terminal-stats");
    if (statElem) statElem.textContent = "SCANNING";
  } else if (msg.type === "log") {
    parseAndAppendLog(msg.data);
  } else if (msg.type === "scan_completed") {
    setScanningState(false);
    appendTerminalLine(`\n[✔] AUDIT COMPLETED: ${msg.target} (Elapsed: ${msg.elapsed || 0}s)`, "success");
    const statElem = document.getElementById("terminal-stats");
    if (statElem) statElem.textContent = "IDLE";
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
  line.textContent = stripAnsi(text);
  terminal.appendChild(line);

  // Buffer protection: keep at most 800 lines in terminal
  if (terminal.childElementCount > 800) {
    terminal.removeChild(terminal.firstElementChild);
  }

  terminal.scrollTop = terminal.scrollHeight;
  terminalLineCount++;
}

function parseAndAppendLog(rawLine) {
  const line = stripAnsi(rawLine || "");
  if (!line.trim()) return;

  let type = "normal";
  if (
    line.includes("VULNERABLE") ||
    line.includes("CRITICAL") ||
    line.includes("bypassed") ||
    line.includes("500") ||
    line.includes("HIGH")
  ) {
    type = "danger";
  } else if (
    line.includes("✔") ||
    line.includes("SUCCESS") ||
    line.includes("CRACKED") ||
    line.includes("completed") ||
    line.includes("clean")
  ) {
    type = "success";
  } else if (
    line.includes("Testing:") ||
    line.includes("Phase") ||
    line.includes("Target") ||
    line.includes("Starting") ||
    line.includes("Reconnaissance") ||
    line.includes("AI credential pairs")
  ) {
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
    const urlElem = document.getElementById("target-url");
    const url = urlElem ? urlElem.value.trim() : "";
    if (!url) return;

    const optSqli = document.getElementById("opt-sqli");
    const optBrute = document.getElementById("opt-brute");
    const optRatelimit = document.getElementById("opt-ratelimit");
    const optAi = document.getElementById("opt-ai");
    const optCompany = document.getElementById("opt-company");
    const optUsernames = document.getElementById("opt-usernames");

    const payload = {
      url: url,
      sqli: optSqli ? optSqli.checked : true,
      brute: optBrute ? optBrute.checked : true,
      ratelimit: optRatelimit ? optRatelimit.checked : true,
      ai: optAi ? optAi.checked : true,
      company: optCompany && optCompany.value.trim() ? optCompany.value.trim() : null,
      usernames: optUsernames && optUsernames.value.trim() ? optUsernames.value.trim() : null,
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

function setTargetPreset(url, btnElement) {
  const input = document.getElementById("target-url");
  if (input) input.value = url;
  if (btnElement) {
    document.querySelectorAll(".presets-group .btn-preset").forEach((b) => b.classList.remove("active"));
    btnElement.classList.add("active");
  }
}

// Findings Display
function clearFindingsDisplay() {
  const elCrit = document.getElementById("stat-critical");
  const elHigh = document.getElementById("stat-high");
  const elMed = document.getElementById("stat-medium");
  const elTot = document.getElementById("stat-total");
  const elBadge = document.getElementById("findings-count-badge");
  const container = document.getElementById("findings-list");

  if (elCrit) elCrit.textContent = "0";
  if (elHigh) elHigh.textContent = "0";
  if (elMed) elMed.textContent = "0";
  if (elTot) elTot.textContent = "0";
  if (elBadge) elBadge.textContent = "0 findings";
  if (container) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⏳</div>
        <div class="empty-text">Auditing active target...</div>
        <div class="empty-sub">Inspecting parameters, emulating authentication challenges, and measuring telemetry.</div>
      </div>
    `;
  }
}

function displayFindings(report) {
  if (!report) return;

  const crit = report.critical || 0;
  const high = report.high || 0;
  const med = report.medium || 0;
  const total = report.total_findings || 0;

  const elCrit = document.getElementById("stat-critical");
  const elHigh = document.getElementById("stat-high");
  const elMed = document.getElementById("stat-medium");
  const elTot = document.getElementById("stat-total");
  const elBadge = document.getElementById("findings-count-badge");
  const container = document.getElementById("findings-list");

  if (elCrit) elCrit.textContent = crit;
  if (elHigh) elHigh.textContent = high;
  if (elMed) elMed.textContent = med;
  if (elTot) elTot.textContent = total;
  if (elBadge) elBadge.textContent = `${total} finding${total === 1 ? "" : "s"}`;

  if (!container) return;
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

    const targetUrl = f.target || report.scan_target || "Target Endpoint";
    const detailText = f.detail || "Authentication challenge discrepancy detected.";

    card.innerHTML = `
      <div class="finding-title-row">
        <span class="finding-type">${escapeHtml(f.type || "Vulnerability")}</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn-fix" onclick="openFixModal(${idx})">🛡️ Fix Advisor</button>
          <span class="badge ${sev}">${escapeHtml(f.severity || "INFO")}</span>
        </div>
      </div>
      <div class="finding-target">${escapeHtml(targetUrl)}</div>
      <div class="finding-detail">${escapeHtml(detailText)}</div>
    `;
    container.appendChild(card);
  });
}

// Fallback remediation helper if finding was generated without pre-baked fix snippets
function getFallbackRemediation(type) {
  const t = (type || "").toLowerCase();
  if (t.includes("sql")) {
    return {
      owasp: "A03:2021 - Injection",
      cwe: "CWE-89",
      remediation: "Use parameterized prepared statements or an Object-Relational Mapper (ORM). Discard all string concatenation and string interpolation in SQL query execution.",
      fixes: {
        python: "# Python (SQLAlchemy / Parameterized Query):\nstmt = select(User).where(User.username == username, User.password == hashed_pw)\nresult = session.execute(stmt).scalar_one_or_none()",
        nodejs: "// Node.js (mysql2 / pg Prepared Statement):\nconst [rows] = await db.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, hash]);",
        php: "// PHP (PDO Prepared Statement):\n$stmt = $pdo->prepare('SELECT * FROM users WHERE username = :u AND password = :p');\n$stmt->execute([':u' => $username, ':p' => $hash]);",
      },
    };
  } else if (t.includes("credential") || t.includes("weak")) {
    return {
      owasp: "A07:2021 - Identification & Authentication Failures",
      cwe: "CWE-521",
      remediation: "Enforce NIST SP 800-63B standards: require minimum 12-character passphrases, check against breached password corpora, and mandate Multi-Factor Authentication (MFA/TOTP).",
      fixes: {
        python: "# Python (Password Entropy Enforcement):\nimport zxcvbn\nscore = zxcvbn.zxcvbn(password)['score']\nif score < 3:\n    raise ValueError('Password entropy too weak. Provide a stronger passphrase.')",
        nodejs: "// Node.js (Password Strength Validation):\nconst zxcvbn = require('zxcvbn');\nif (zxcvbn(password).score < 3) {\n    return res.status(400).json({ error: 'Password does not meet entropy requirements.' });\n}",
      },
    };
  } else if (t.includes("rate") || t.includes("limit")) {
    return {
      owasp: "A04:2021 - Insecure Design & Rate Limiting Gaps",
      cwe: "CWE-307",
      remediation: "Implement distributed rate limiting (e.g., Redis Token Bucket / Sliding Window) allowing a maximum of 5 failed attempts per minute per IP/account with progressive delays.",
      fixes: {
        python: "# Python (Flask-Limiter / Redis Sliding Window):\nfrom flask_limiter import Limiter\nlimiter = Limiter(key_func=get_remote_address)\n@app.route('/login', methods=['POST'])\n@limiter.limit('5 per minute')\ndef login(): ...",
        nodejs: "// Node.js (express-rate-limit):\nconst rateLimit = require('express-rate-limit');\nconst loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many attempts.' });\napp.post('/api/login', loginLimiter, handleLogin);",
        nginx: "# Nginx Reverse Proxy Rate Limiting:\nlimit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;\nlocation /api/login {\n    limit_req zone=login_limit burst=3 nodelay;\n}",
      },
    };
  }
  return {
    owasp: "OWASP Top 10 Standards",
    cwe: "CWE Standard",
    remediation: "Review parameter validation, enforce strict authentication boundaries, and ensure secure transport configurations.",
    fixes: {},
  };
}

// Remediation Advisor Modal
function openFixModal(idx) {
  const f = currentFindings[idx];
  if (!f) return;

  const fallback = getFallbackRemediation(f.type);

  const owaspText = f.owasp || fallback.owasp;
  const cweText = f.cwe || fallback.cwe;
  const remedText = f.remediation || fallback.remediation;
  const fixes = (f.fix_code && Object.keys(f.fix_code).length > 0) ? f.fix_code : fallback.fixes;

  const titleElem = document.getElementById("modal-fix-title");
  const owaspElem = document.getElementById("modal-fix-owasp");
  const cweElem = document.getElementById("modal-fix-cwe");
  const targetElem = document.getElementById("modal-fix-target");
  const detailElem = document.getElementById("modal-fix-detail");
  const remedElem = document.getElementById("modal-fix-remed");
  const codeContainer = document.getElementById("modal-code-container");

  if (titleElem) titleElem.textContent = `${f.type || "Finding"} — Remediation Blueprint`;
  if (owaspElem) owaspElem.textContent = owaspText;
  if (cweElem) cweElem.textContent = cweText;
  if (targetElem) targetElem.textContent = f.target || "Endpoint";
  if (detailElem) detailElem.textContent = f.detail || "Authentication surface vulnerability verified.";
  if (remedElem) remedElem.textContent = remedText;

  if (codeContainer) {
    codeContainer.innerHTML = "";
    if (fixes && Object.keys(fixes).length > 0) {
      for (const [lang, code] of Object.entries(fixes)) {
        const box = document.createElement("div");
        box.className = "code-snippet-box";
        box.innerHTML = `<strong style="color:var(--accent-cyan-light); display:block; margin-bottom:4px;">${escapeHtml(lang.toUpperCase())} RE-FACTOR:</strong><code>${escapeHtml(String(code))}</code>`;
        codeContainer.appendChild(box);
      }
    } else {
      codeContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Apply architectural configuration patch and enforce strict validation noted above.</p>';
    }
  }

  const modal = document.getElementById("fix-modal");
  if (modal) modal.style.display = "flex";
}

function closeFixModal() {
  const modal = document.getElementById("fix-modal");
  if (modal) modal.style.display = "none";
}

// Disclaimer Modal Handlers
function openDisclaimerModal() {
  const modal = document.getElementById("disclaimer-modal");
  if (modal) modal.style.display = "flex";
}

function closeDisclaimerModal() {
  const modal = document.getElementById("disclaimer-modal");
  if (modal) modal.style.display = "none";
}

function dismissBanner() {
  const banner = document.getElementById("advisory-banner");
  if (banner) banner.style.display = "none";
}

// About / Creator Modal Handlers
function openAboutModal() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "flex";
}

function closeAboutModal() {
  const modal = document.getElementById("about-modal");
  if (modal) modal.style.display = "none";
}

// Global modal backdrop & escape listener
function initModalListeners() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeFixModal();
      closeDisclaimerModal();
      closeAboutModal();
    }
  });

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.style.display = "none";
      }
    });
  });
}

// Reports Pane
async function loadFindings() {
  try {
    const resp = await fetch("/api/findings");
    if (!resp.ok) return;
    const files = await resp.json();
    const list = document.getElementById("reports-table-body");
    if (!list) return;
    list.innerHTML = "";

    if (!Array.isArray(files) || files.length === 0) {
      list.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2.5rem; color:var(--text-muted);">No historical audit reports discovered in local archive.</td></tr>';
      return;
    }

    if (files.length > 0 && files[0].data && currentFindings.length === 0) {
      displayFindings(files[0].data);
    }

    files.forEach((file) => {
      const row = document.createElement("tr");
      const sev = (file.overall_risk || "INFO").toLowerCase();
      const formattedDate = (file.timestamp && typeof file.timestamp === "string")
        ? file.timestamp.replace("T", " ").substring(0, 19)
        : "Recent";
      const targetStr = escapeHtml(file.target || "Target");
      const fname = escapeHtml(file.filename);

      row.innerHTML = `
        <td style="font-family:var(--font-mono); font-size:0.82rem; color:var(--text-secondary);">${escapeHtml(formattedDate)}</td>
        <td style="font-family:var(--font-mono); color:var(--accent-cyan-light);">${targetStr}</td>
        <td><span class="badge ${sev}">${escapeHtml(file.overall_risk || "UNKNOWN")}</span></td>
        <td style="font-weight:700;">${file.total_findings || 0} findings (${file.critical || 0} crit)</td>
        <td style="display:flex; gap:8px;">
          <button class="btn-preset" onclick="viewReport('${fname}')">Inspect Findings</button>
          <a class="btn-preset" href="/api/reports/${fname}/export" target="_blank" style="text-decoration:none;">Executive Report</a>
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
    const resp = await fetch(`/api/findings/${encodeURIComponent(filename)}`);
    if (!resp.ok) {
      alert("Could not load report (status: " + resp.status + ")");
      return;
    }
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
    const hashElem = document.getElementById("crack-hash");
    const hash = hashElem ? hashElem.value.trim() : "";
    if (!hash) return;

    const btn = document.getElementById("btn-start-crack");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Analyzing Hash Vectors...";
    }

    const resultBox = document.getElementById("crack-result-box");
    if (resultBox) resultBox.style.display = "none";

    const optGpu = document.getElementById("opt-gpu");
    const gpuEnabled = optGpu ? optGpu.checked : false;

    try {
      const resp = await fetch("/api/crack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hash: hash,
          gpu: gpuEnabled,
        }),
      });
      const data = await resp.json();
      if (resultBox) resultBox.style.display = "block";

      const badge = document.getElementById("crack-result-badge");
      const sub = document.getElementById("crack-result-text");
      const passVal = document.getElementById("crack-plain-password");

      if (data.status === "cracked") {
        if (resultBox) {
          resultBox.style.borderColor = "rgba(16, 185, 129, 0.4)";
          resultBox.style.background = "rgba(16, 185, 129, 0.08)";
        }
        if (badge) {
          badge.textContent = "CRACKED";
          badge.style.background = "var(--accent-emerald)";
          badge.style.color = "#000";
        }
        if (sub) sub.textContent = `Entropy depleted in ${data.time_sec || 0}s (${escapeHtml(data.type || "Hash")})`;
        if (passVal) {
          passVal.textContent = data.password || "";
          passVal.style.color = "#34d399";
        }
      } else {
        if (resultBox) {
          resultBox.style.borderColor = "rgba(239, 68, 68, 0.4)";
          resultBox.style.background = "rgba(239, 68, 68, 0.08)";
        }
        if (badge) {
          badge.textContent = "EXHAUSTED";
          badge.style.background = "var(--accent-red)";
          badge.style.color = "#fff";
        }
        if (sub) sub.textContent = "Hash candidate withstood standard dictionary permutations.";
        if (passVal) {
          passVal.textContent = "UNRECOVERED / STRONG ENTROPY";
          passVal.style.color = "#f87171";
        }
      }
    } catch (err) {
      alert("Cracking analysis failed: " + err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Execute Hash Decryption Analysis";
      }
    }
  });
}

function setCrackVector(hash) {
  const input = document.getElementById("crack-hash");
  if (input) input.value = hash;
}

// Explicitly bind all window-invoked methods
window.switchTab = switchTab;
window.setTargetPreset = setTargetPreset;
window.copyTerminalLogs = copyTerminalLogs;
window.clearTerminal = clearTerminal;
window.openFixModal = openFixModal;
window.closeFixModal = closeFixModal;
window.openDisclaimerModal = openDisclaimerModal;
window.closeDisclaimerModal = closeDisclaimerModal;
window.dismissBanner = dismissBanner;
window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;
window.loadFindings = loadFindings;
window.viewReport = viewReport;
window.setCrackVector = setCrackVector;
