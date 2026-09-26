"""
mock_server.py — Local Vulnerable Target Server for Sentinal-AI
Allows testing without Docker, XAMPP, or external network targets.

Simulates:
1. Traditional Form Auth (DVWA style):
   - GET / or /login.php -> Returns HTML login form
   - POST /login.php -> Vulnerable to SQLi bypass (' OR '1'='1) and brute force (admin:password)
2. Generic JSON REST API:
   - POST /api/auth/login or /api/login -> Returns JSON auth response
   - Vulnerable to SQLi bypass (' OR 1=1--) and brute force (admin:admin123)
3. OWASP Juice Shop Mock:
   - POST /rest/user/login -> Returns Juice Shop format authentication token
   - Vulnerable to SQLite payloads (' OR 1=1--, ' OR TRUE--)
"""

import json
import re
import socketserver
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

HOST = "127.0.0.1"
PORT = 5000

# Mock database
VALID_USERS = {
    "admin": "password",
    "root": "toor",
    "admin@juice-sh.op": "admin123",
}

SQLI_PATTERNS = [
    r"'\s*or\s+.*--",
    r"'\s*or\s+'1'='1",
    r"'\s*or\s+1=1",
    r"'\s*or\s+true",
    r"admin'--",
    r"admin'#",
    r"'\s*union\s+select",
]


def check_sqli(val: str) -> bool:
    if not val:
        return False
    v = val.lower().strip()
    return any(re.search(pat, v) for pat in SQLI_PATTERNS)


class VulnerableTargetHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Concise logging
        print(f"[MockTarget] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}")

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path in ("/", "/login.php", "/login"):
            # Traditional HTML login form (DVWA / Mutillidae style)
            html = """<!DOCTYPE html>
<html>
<head>
    <title>Vulnerable Lab - Login</title>
    <style>
        body { font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .box { background: #1e293b; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.5); width: 320px; }
        input { width: 100%; padding: 8px; margin: 8px 0 16px; border-radius: 4px; border: 1px solid #334155; background: #0f172a; color: #fff; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #3b82f6; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        button:hover { background: #2563eb; }
        .info { font-size: 12px; color: #94a3b8; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="box">
        <h2>Target Lab Login</h2>
        <form method="POST" action="/login.php">
            <input type="hidden" name="user_token" value="mock_csrf_abc123" />
            <label>Username</label>
            <input type="text" name="username" placeholder="Username" required />
            <label>Password</label>
            <input type="password" name="password" placeholder="Password" />
            <button type="submit" name="Login">Login</button>
        </form>
        <div class="info">
            <p>Mock target running for Sentinal-AI</p>
            <p>Credentials: admin / password</p>
            <p>Vulnerable to SQLi: ' OR 1=1 --</p>
        </div>
    </div>
</body>
</html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        elif path == "/dashboard" or path == "/index.php":
            html = """<!DOCTYPE html>
<html>
<head><title>Dashboard</title></head>
<body style="background:#0f172a; color:#fff; font-family:sans-serif; padding:40px;">
    <h1>Welcome, Admin!</h1>
    <p>Logged in successfully to DVWA system.</p>
    <a href="/login.php" style="color:#60a5fa;">Logout</a>
</body>
</html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        elif path == "/api/csrf-token":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"csrf_token": "mock_csrf_live_token_777"}).encode("utf-8"))
            return

        elif path == "/rest/admin/application-version":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("X-Recruiting", "Juice Shop Mock")
            self.end_headers()
            self.wfile.write(json.dumps({"version": "14.0.0-mock"}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b""
        content_type = self.headers.get("Content-Type", "")

        # ── 1. OWASP Juice Shop REST API ──
        if path == "/rest/user/login":
            try:
                data = json.loads(post_data.decode("utf-8", errors="ignore"))
            except Exception:
                data = {}

            email = data.get("email", "")
            password = data.get("password", "")

            # Check probe
            if email == "probe@test.com":
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Recruiting", "Juice Shop Mock")
                self.end_headers()
                self.wfile.write(b'{"error": "Invalid email or password."}')
                return

            # Check SQLi
            if check_sqli(email) or check_sqli(password):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("X-Recruiting", "Juice Shop Mock")
                self.end_headers()
                resp = {
                    "authentication": {
                        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenAdmin",
                        "bid": 1,
                        "umail": "admin@juice-sh.op",
                    }
                }
                self.wfile.write(json.dumps(resp).encode("utf-8"))
                return

            # Check valid credentials
            if email == "admin@juice-sh.op" and password == "admin123":
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                resp = {
                    "authentication": {
                        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockTokenAdmin",
                        "bid": 1,
                        "umail": "admin@juice-sh.op",
                    }
                }
                self.wfile.write(json.dumps(resp).encode("utf-8"))
                return

            # Failure
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": "Invalid email or password."}')
            return

        # ── 2. Generic JSON API (/api/auth/login, /api/login) ──
        if path in ("/api/auth/login", "/api/login", "/auth/login"):
            try:
                data = json.loads(post_data.decode("utf-8", errors="ignore"))
            except Exception:
                data = {}

            username = data.get("username", "")
            password = data.get("password", "")

            # Probe check
            if username == "__probe__":
                self.send_response(401)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"status": "error", "message": "Probe rejected"}')
                return

            # Check SQLi
            if check_sqli(username) or check_sqli(password):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                resp = {
                    "status": "success",
                    "token": "mock-jwt-token-sqli-bypass",
                    "user": "admin",
                    "message": "Welcome back Admin (SQLi bypass)",
                }
                self.wfile.write(json.dumps(resp).encode("utf-8"))
                return

            # Check credentials
            if (username == "admin" and password in ("admin123", "password")) or (username == "root" and password == "toor"):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                resp = {
                    "status": "success",
                    "token": "mock-jwt-token-authenticated",
                    "user": username,
                    "message": f"Welcome back {username}",
                }
                self.wfile.write(json.dumps(resp).encode("utf-8"))
                return

            # Invalid
            self.send_response(401)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b'{"status": "error", "message": "Invalid username or password"}')
            return

        # ── 3. Traditional HTML Form (/login.php, /) ──
        post_str = post_data.decode("utf-8", errors="ignore")
        form_params = parse_qs(post_str)
        username = form_params.get("username", [""])[0]
        password = form_params.get("password", [""])[0]

        # Check SQL Injection
        if check_sqli(username) or check_sqli(password):
            html = """<!DOCTYPE html>
<html>
<head><title>Dashboard</title></head>
<body style="background:#0f172a; color:#fff; font-family:sans-serif; padding:40px;">
    <h1>Welcome, Admin!</h1>
    <p>Logged in successfully via SQL Injection.</p>
    <a href="/login.php">Logout</a>
</body>
</html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        # Check Brute Force valid credentials
        if (username == "admin" and password in ("password", "admin123")) or (username == "root" and password == "toor"):
            html = """<!DOCTYPE html>
<html>
<head><title>Dashboard</title></head>
<body style="background:#0f172a; color:#fff; font-family:sans-serif; padding:40px;">
    <h1>Welcome, Admin!</h1>
    <p>Logged in successfully with valid credentials.</p>
    <a href="/login.php">Logout</a>
</body>
</html>"""
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode("utf-8"))
            return

        # Failed login
        html = """<!DOCTYPE html>
<html>
<head><title>Target Lab Login</title></head>
<body style="background:#0f172a; color:#fff; font-family:sans-serif; padding:40px;">
    <p style="color:#ef4444; font-weight:bold;">Login failed. Invalid username or password.</p>
    <form method="POST" action="/login.php">
        <input type="text" name="username" placeholder="Username" />
        <input type="password" name="password" placeholder="Password" />
        <button type="submit" name="Login">Login</button>
    </form>
</body>
</html>"""
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))


class ThreadedHTTPServer(socketserver.ThreadingMixIn, HTTPServer):
    daemon_threads = True


def run(host=HOST, port=PORT):
    server = ThreadedHTTPServer((host, port), VulnerableTargetHandler)
    print("\n" + "=" * 55)
    print(f"[*] Sentinal-AI Vulnerable Test Target is RUNNING!")
    print(f"    URL: http://{host}:{port}")
    print(f"    HTML Form Target: http://{host}:{port}/login.php")
    print(f"    JSON API Target:  http://{host}:{port}/api/auth/login")
    print(f"    Juice Shop Mode:  http://{host}:{port}/rest/user/login")
    print("=" * 55 + "\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run()
