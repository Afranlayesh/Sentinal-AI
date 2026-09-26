"""
server.py — FastAPI Web Backend for Sentinal-AI Dashboard
Provides:
  - REST endpoints for scanning, hash cracking, results viewing
  - Real-time WebSockets to stream console output & findings to frontend
  - Serves modern cyber-styled dashboard UI
"""

import asyncio
import io
import json
import os
import subprocess
import sys
import threading
import time
from typing import Dict, List, Optional

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Sentinal-AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
STATIC_DIR = os.path.join(FRONTEND_DIR, "static")
FINDINGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lab", "results", "findings")
os.makedirs(FINDINGS_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Connection manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Global scan status state
current_scan_task = {
    "is_running": False,
    "target_url": "",
    "start_time": 0,
    "last_result": None,
}


class ScanRequest(BaseModel):
    url: str
    sqli: bool = True
    brute: bool = True
    ratelimit: bool = True
    ai: bool = False
    company: Optional[str] = None
    usernames: Optional[str] = None
    api_login: Optional[str] = None


class CrackRequest(BaseModel):
    hash: str
    wordlist: Optional[str] = None
    gpu: bool = False


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read(), headers={"Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"})
    return "<h1>Sentinal-AI Dashboard loading...</h1>"


@app.get("/api/status")
async def get_status():
    return {
        "status": "online",
        "engine": "Sentinal-AI v1.0.0",
        "scan_running": current_scan_task["is_running"],
        "target": current_scan_task["target_url"],
    }


@app.get("/api/findings")
async def list_findings():
    """Returns list of all stored findings reports."""
    files = []
    if os.path.exists(FINDINGS_DIR):
        for fname in sorted(os.listdir(FINDINGS_DIR), reverse=True):
            if fname.endswith(".json"):
                fpath = os.path.join(FINDINGS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        files.append({
                            "filename": fname,
                            "timestamp": data.get("scan_timestamp", ""),
                            "target": data.get("scan_target", ""),
                            "overall_risk": data.get("overall_risk", "UNKNOWN"),
                            "total_findings": data.get("total_findings", 0),
                            "critical": data.get("critical", 0),
                            "high": data.get("high", 0),
                            "medium": data.get("medium", 0),
                            "low": data.get("low", 0),
                            "data": data,
                        })
                except Exception:
                    pass
    return files


@app.get("/api/findings/{filename}")
async def get_finding(filename: str):
    fpath = os.path.join(FINDINGS_DIR, filename)
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            return json.load(f)
    return JSONResponse(status_code=404, content={"error": "Report not found"})


@app.get("/api/reports/{filename}/export", response_class=HTMLResponse)
async def export_report(filename: str):
    fpath = os.path.join(FINDINGS_DIR, filename)
    if os.path.exists(fpath):
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
        from reports.architect import generate_html_report
        return generate_html_report(data)
    return HTMLResponse("<h1>Report not found</h1>", status_code=404)


def run_scan_worker(loop, req: ScanRequest):
    """Executes main.py scan as subprocess and streams stdout to WebSocket clients."""
    global current_scan_task
    current_scan_task["is_running"] = True
    current_scan_task["target_url"] = req.url
    current_scan_task["start_time"] = time.time()

    asyncio.run_coroutine_threadsafe(
        manager.broadcast({
            "type": "scan_started",
            "url": req.url,
            "timestamp": time.time(),
        }),
        loop,
    )

    cmd = [
        sys.executable,
        "main.py",
        "scan",
        "--url",
        req.url,
    ]
    if not req.sqli:
        cmd.append("--no-sqli")
    if not req.brute:
        cmd.append("--no-brute")
    if not req.ratelimit:
        cmd.append("--no-ratelimit")
    if req.ai:
        cmd.append("--ai")
    if req.company:
        cmd.extend(["--company", req.company])
    if req.usernames:
        cmd.extend(["--usernames", req.usernames])
    if req.api_login:
        cmd.extend(["--api-login", req.api_login])

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=os.path.dirname(os.path.abspath(__file__)),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
        )

        for line in proc.stdout:
            clean_line = line.rstrip()
            asyncio.run_coroutine_threadsafe(
                manager.broadcast({"type": "log", "data": clean_line}),
                loop,
            )

        proc.wait()
    except Exception as e:
        asyncio.run_coroutine_threadsafe(
            manager.broadcast({"type": "log", "data": f"[!] Scan error: {e}"}),
            loop,
        )
    finally:
        current_scan_task["is_running"] = False
        # Fetch latest finding
        latest_report = None
        if os.path.exists(FINDINGS_DIR):
            f_list = sorted([f for f in os.listdir(FINDINGS_DIR) if f.endswith(".json")], reverse=True)
            if f_list:
                try:
                    with open(os.path.join(FINDINGS_DIR, f_list[0]), "r", encoding="utf-8") as f:
                        latest_report = json.load(f)
                except Exception:
                    pass

        asyncio.run_coroutine_threadsafe(
            manager.broadcast({
                "type": "scan_completed",
                "target": req.url,
                "report": latest_report,
                "elapsed": round(time.time() - current_scan_task["start_time"], 2),
            }),
            loop,
        )


@app.post("/api/scan")
async def start_scan(req: ScanRequest):
    if current_scan_task["is_running"]:
        return JSONResponse(status_code=400, content={"error": "A scan is already in progress"})

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.get_event_loop()
    thread = threading.Thread(target=run_scan_worker, args=(loop, req), daemon=True)
    thread.start()

    return {"status": "started", "target": req.url}


@app.post("/api/crack")
async def crack_hash(req: CrackRequest):
    """Executes hash cracking and returns result."""
    from lab.cracker import crack
    from lab.hashcat_runner import run_hashcat
    from core.config import WORDLIST_DEFAULT

    wlist = req.wordlist or WORDLIST_DEFAULT
    try:
        if req.gpu:
            res = run_hashcat(req.hash, wlist)
        else:
            res = crack(req.hash, wlist)
            if res.get("status") == "not_found":
                res = run_hashcat(req.hash, wlist)
        return res
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Send initial status
        await websocket.send_json({
            "type": "init",
            "scan_running": current_scan_task["is_running"],
            "target": current_scan_task["target_url"],
        })
        while True:
            data = await websocket.receive_text()
            # Heartbeat / ping
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


def main():
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[*] Starting Sentinal-AI Command Center Dashboard at http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()

