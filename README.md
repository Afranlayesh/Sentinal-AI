# 🛡️ SENTINAL-AI
### Enterprise Penetration Testing & Authentication Audit Platform
**Engineered and Architected by Afran Layesh for Hackathon 2026**

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-1.0.0-009688.svg)](https://fastapi.tiangolo.com/)
[![OWASP Top 10](https://img.shields.io/badge/OWASP-A03%20%7C%20A07-red.svg)](https://owasp.org/)
[![License](https://img.shields.io/badge/License-Educational%20Research-yellow.svg)](#-legal--ethical-disclaimer)

---

## ⚡ Overview

**Sentinal-AI** is an autonomous security auditing and credential intelligence platform designed to bridge the gap between **offensive vulnerability assessment** and **automated defensive engineering**. 

Built from the ground up to evaluate authentication surfaces across modern web applications, Single Page Applications (SPAs), and JSON REST APIs, Sentinal-AI emulates realistic threat vectors (SQL injection, credential stuffing, rate-limiting deficits) and automatically generates production-ready parameterized code patches to secure vulnerable endpoints.

---

## 🚀 Key Features

* **🎯 Multi-Target Audit Architecture:**
  * **Traditional HTML Form Targets:** Automated crawling, form parsing, anti-CSRF token extraction, and session handling (e.g. DVWA, Mutillidae).
  * **Modern JSON REST APIs:** Auto-detects and audits REST authentication endpoints (e.g., OWASP Juice Shop `/rest/user/login` or custom JSON auth).
  * **Single Page Applications (SPAs):** Capable of auditing dynamic frontends and client-side token exchanges.
* **💉 SQL Injection Verification (SQLi):**
  * Probes authentication parameters using non-destructive, precision payloads (SQLite, MySQL, Boolean bypasses, time blinds).
* **🔒 Credential Stuffing & Rate-Limit Diagnostics:**
  * Multi-threaded credential evaluation with automatic exponential backoff, HTTP 429 tracking, and anti-automation bypass detection.
* **🧠 Context-Aware Password Intelligence:**
  * Dynamic mutation rule engine generating context-driven candidate lists tailored to target organization metadata, domain tokens, and username combinations.
* **🔐 Multi-Algorithm Hash Cracking Suite:**
  * Integrated credential recovery engine supporting MD5, SHA-1, SHA-256, SHA-512, and GPU-accelerated Hashcat fallback.
* **🛡️ Automated Defensive Patch Generator (Architect):**
  * Generates executive HTML vulnerability audit reports and tailored, framework-specific code fixes (Python, Node.js, PHP, Java) directly aligning with **OWASP Top 10** and **NIST SP 800-63B**.
* **💻 Sleek Command Center Dashboard:**
  * Dark obsidian cybersecurity dashboard with real-time WebSocket telemetry, interactive terminal stream, and one-click report exports.

---

## 📂 Architecture

Sentinal-AI operates across four modular phases:

```
[ Phase 1: Reconnaissance (Scout) ]
  └── Crawls endpoints, maps authentication forms, extracts CSRF tokens
            │
            ▼
[ Phase 2: Threat Emulation (Attacker) ]
  └── Probes SQLi bypasses, rate-limit elasticity, and brute-force resistance
            │
            ▼
[ Phase 3: Password Intelligence Engine ]
  └── Contextual token mutations and target entropy evaluation
            │
            ▼
[ Phase 4: Automated Remediation (Architect) ]
  └── Compiles CVSS metrics, OWASP alignments, and copy-pasteable code patches
```

---

## 🛠️ Quick Start

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/afranlayesh/Sentinal-AI.git
cd Sentinal-AI
pip install -r requirements.txt
```

### 2. Launch the Web Command Center Dashboard
Start the FastAPI server and WebSocket backend:
```bash
python server.py
```
Open your browser and navigate to:
👉 **`http://127.0.0.1:8000`**

### 3. Launching Scans via CLI
You can also run audits directly from the command line:

* **Audit Local / Remote Target:**
  ```bash
  python main.py scan --url http://127.0.0.1:5000 --ai -c "Acme Corp"
  ```
* **Audit OWASP Juice Shop REST API:**
  ```bash
  python main.py scan --url http://localhost:3000
  ```
* **Crack a Leaked Password Hash:**
  ```bash
  python main.py crack --hash 5f4dcc3b5aa765d61d8327deb882cf99
  ```

### 4. Running the Local Test Lab
Sentinal-AI includes a self-contained vulnerable mock server for offline testing without Docker:
```bash
python lab/mock_server.py
```
*(Runs on `http://127.0.0.1:5000` with simulated HTML, JSON REST, and Juice Shop auth endpoints).*

---

## 👨‍💻 Author & Project Credits

* **Lead Architect & Developer:** **Afran Layesh**
* **GitHub Profile:** [@afranlayesh](https://github.com/afranlayesh)
* **LinkedIn Profile:** [Afran Layesh](https://linkedin.com/in/afran-layesh)
* **Project Purpose:** Developed for cybersecurity research, academic demonstration, and the **2026 Hackathon Competition**.
* **Core Technologies:** Python 3.11, FastAPI, Uvicorn, WebSockets, Vanilla CSS / Glassmorphism, Hashcat, Rich, BeautifulSoup4, Requests.

---

## ⚖️ Legal & Ethical Disclaimer

> [!CAUTION]
> **CRITICAL LEGAL NOTICE:** Sentinal-AI is developed **strictly for educational purposes, academic research, and authorized penetration testing**. 
> 
> 1. **Authorized Testing Only:** This software must only be operated against local testbeds (such as DVWA, OWASP Juice Shop, or the included mock lab) or systems for which you have obtained explicit, written authorization from the system owner.
> 2. **Limitation of Liability:** The creator and developer (**Afran Layesh**) accepts **no liability or responsibility** for any misuse, unauthorized access, damages, data loss, or legal consequences resulting from the use or deployment of this tool.
> 3. **Sole User Responsibility:** The operator assumes sole and complete responsibility for compliance with all applicable local, national, and international cybersecurity laws, including the Computer Fraud and Abuse Act (CFAA), the UK Computer Misuse Act, GDPR, and corresponding legislation.
> 4. **Terms:** This tool was created as an educational research exploration. It is provided on an "AS-IS" basis with no warranties of any kind.
