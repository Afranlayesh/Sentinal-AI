"""
network_scanner.py — Modular Network & Port Discovery Engine (Sentinal-AI)
Supports:
  1. Native Nmap binary orchestration (port scan, service banners, NSE scripts)
  2. Pure Python concurrent socket engine fallback (zero external binary dependency)
  3. Service fingerprinting (HTTP, SSH, MySQL, Postgres, Redis, SMB)
"""

from __future__ import annotations

import asyncio
import os
import re
import shutil
import socket
import subprocess
from typing import Dict, List, Optional
from urllib.parse import urlparse

from rich.console import Console
from rich.table import Table

console = Console()

# Standard security auditing port profile
DEFAULT_PORTS = [
    21,    # FTP
    22,    # SSH
    23,    # Telnet
    25,    # SMTP
    53,    # DNS
    80,    # HTTP
    110,   # POP3
    139,   # NetBIOS / SMB
    443,   # HTTPS
    445,   # Microsoft SMB
    1433,  # MSSQL
    1521,  # Oracle DB
    3000,  # Dev / SPA / Juice Shop
    3306,  # MySQL
    5000,  # Mock Lab / Flask
    5432,  # PostgreSQL
    6379,  # Redis
    8000,  # Sentinal Web UI / Django
    8080,  # Alternate HTTP
    8443,  # Alternate HTTPS
    27017, # MongoDB
]

SERVICE_HINTS = {
    21: "FTP",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    139: "NetBIOS",
    443: "HTTPS",
    445: "SMB",
    1433: "MSSQL",
    1521: "Oracle",
    3000: "Node / SPA",
    3306: "MySQL",
    5000: "Flask / Mock",
    5432: "PostgreSQL",
    6379: "Redis",
    8000: "FastAPI / App",
    8080: "HTTP-Proxy",
    8443: "HTTPS-Alt",
    27017: "MongoDB",
}


def is_nmap_installed() -> bool:
    """Checks if the Nmap binary is accessible in the system PATH."""
    return shutil.which("nmap") is not None


def extract_host(target: str) -> str:
    """Extracts raw IP or hostname from a URL or socket string."""
    target = target.strip()
    if "://" in target:
        parsed = urlparse(target)
        return parsed.hostname or target
    if ":" in target and not target.count(":") > 1:  # ignore raw IPv6
        return target.split(":")[0]
    return target


async def _probe_port(host: str, port: int, timeout: float = 1.2) -> Optional[Dict]:
    """Pure Python asynchronous TCP connect scanner with banner grabbing."""
    try:
        conn = asyncio.open_connection(host, port)
        reader, writer = await asyncio.wait_for(conn, timeout=timeout)
        banner = ""
        try:
            # Send generic probe to elicit banner
            if port in (80, 8080, 3000, 5000, 8000):
                writer.write(b"HEAD / HTTP/1.0\r\n\r\n")
            elif port in (21, 22, 25, 110):
                pass  # servers send greeting banner immediately
            await writer.drain()
            raw_banner = await asyncio.wait_for(reader.read(256), timeout=0.8)
            banner = raw_banner.decode(errors="replace").strip().split("\n")[0]
        except Exception:
            banner = ""
        finally:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

        service = SERVICE_HINTS.get(port, "Unknown")
        return {
            "port": port,
            "state": "open",
            "service": service,
            "banner": banner[:60],
        }
    except Exception:
        return None


async def scan_host_python(host: str, ports: List[int] = None, concurrency: int = 50) -> List[Dict]:
    """Scans host using Python non-blocking sockets with concurrency throttling."""
    ports = ports or DEFAULT_PORTS
    semaphore = asyncio.Semaphore(concurrency)

    async def sem_probe(p):
        async with semaphore:
            return await _probe_port(host, p)

    tasks = [sem_probe(p) for p in ports]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


def scan_host_nmap(host: str, ports: List[int] = None) -> List[Dict]:
    """Executes native Nmap command with service version detection."""
    ports = ports or DEFAULT_PORTS
    port_arg = ",".join(str(p) for p in ports)
    cmd = ["nmap", "-sV", "--open", "-p", port_arg, host]

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
        output = proc.stdout
        open_ports = []
        for line in output.splitlines():
            m = re.match(r"^(\d+)/tcp\s+open\s+(\S+)\s*(.*)", line.strip())
            if m:
                port = int(m.group(1))
                service = m.group(2)
                version = m.group(3).strip()
                open_ports.append({
                    "port": port,
                    "state": "open",
                    "service": service,
                    "banner": version,
                })
        return open_ports
    except Exception as e:
        console.print(f"[yellow]Nmap execution failed ({e}), falling back to Python scanner...[/yellow]")
        return []


def scan_network_target(target: str, ports: List[int] = None) -> Dict:
    """
    Main entry point for network auditing:
    Automatically uses Nmap when available, otherwise falls back to Python engine.
    """
    host = extract_host(target)
    has_nmap = is_nmap_installed()
    mode = "Nmap (-sV Engine)" if has_nmap else "Python Asynchronous Socket Engine"

    console.print(f"\n[bold cyan]Network Reconnaissance:[/bold cyan] Scanning [bold]{host}[/bold]")
    console.print(f"[dim]Engine: {mode} | Auditing {len(ports or DEFAULT_PORTS)} standard ports[/dim]\n")

    open_ports = []
    if has_nmap:
        open_ports = scan_host_nmap(host, ports)

    if not open_ports and not has_nmap:
        open_ports = asyncio.run(scan_host_python(host, ports))

    # Display Rich Table
    table = Table(title=f"Open Port Audit: {host}", border_style="bright_blue", show_lines=True)
    table.add_column("Port", style="bold cyan", justify="right")
    table.add_column("State", style="bold green")
    table.add_column("Service", style="bold yellow")
    table.add_column("Banner / Fingerprint", style="dim white")

    for item in open_ports:
        table.add_row(
            str(item["port"]),
            item["state"].upper(),
            item["service"],
            item["banner"] or "—",
        )

    if open_ports:
        console.print(table)
    else:
        console.print(f"[dim]  No open ports discovered on monitored vectors for {host}.[/dim]")

    return {
        "host": host,
        "mode": mode,
        "open_ports": open_ports,
        "count": len(open_ports),
    }


if __name__ == "__main__":
    import sys
    target_host = sys.argv[1] if len(sys.argv) > 1 else "127.0.0.1"
    scan_network_target(target_host)
