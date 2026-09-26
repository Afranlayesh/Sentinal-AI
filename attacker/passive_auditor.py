"""
passive_auditor.py — Passive Cookie & HTTP Security Headers Auditor
Audits authentication targets for security posture:
  - Cookie security flags: HttpOnly, Secure, SameSite
  - Critical HTTP security headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options
"""

import requests
from typing import Dict, List
from urllib.parse import urlparse

SECURITY_HEADERS = {
    "Strict-Transport-Security": {
        "severity": "LOW",
        "title": "Missing HSTS Header",
        "detail": "Strict-Transport-Security (HSTS) is missing, leaving users vulnerable to SSL stripping attacks.",
        "cwe": "CWE-319",
        "owasp": "A05:2021 - Security Misconfiguration",
    },
    "Content-Security-Policy": {
        "severity": "LOW",
        "title": "Missing Content-Security-Policy",
        "detail": "Content-Security-Policy (CSP) is missing, increasing exposure to cross-site scripting (XSS) and injection.",
        "cwe": "CWE-1021",
        "owasp": "A05:2021 - Security Misconfiguration",
    },
    "X-Frame-Options": {
        "severity": "LOW",
        "title": "Missing X-Frame-Options",
        "detail": "X-Frame-Options is missing, allowing the authentication page to be framed in clickjacking attacks.",
        "cwe": "CWE-1021",
        "owasp": "A05:2021 - Security Misconfiguration",
    },
    "X-Content-Type-Options": {
        "severity": "INFO",
        "title": "Missing X-Content-Type-Options",
        "detail": "X-Content-Type-Options: nosniff is missing, allowing MIME-type sniffing by browsers.",
        "cwe": "CWE-16",
        "owasp": "A05:2021 - Security Misconfiguration",
    },
}


def audit_passive_security(target_url: str) -> List[Dict]:
    """
    Performs passive HTTP inspection on the target URL for cookie & header hardening.
    Returns a list of finding dicts ready for detective.py.
    """
    findings = []
    try:
        resp = requests.get(target_url, timeout=6, verify=False, allow_redirects=True)
    except Exception as e:
        return findings

    # 1. Audit Set-Cookie Headers
    cookies = resp.cookies
    for c in cookies:
        cookie_name = c.name
        
        # Check HttpOnly
        is_httponly = c.has_nonstandard_attr("httponly") or c.has_nonstandard_attr("HttpOnly")
        if not is_httponly:
            findings.append({
                "type": "Cookie Security (HttpOnly)",
                "severity": "MEDIUM",
                "target": target_url,
                "detail": f"Cookie '{cookie_name}' lacks HttpOnly flag — accessible to client-side scripts via XSS.",
                "cvss_score": 5.3,
                "cwe": "CWE-1004",
                "owasp": "A07:2021 - Identification and Authentication Failures",
                "evidence": [{"cookie": cookie_name, "issue": "Missing HttpOnly"}],
                "remediation": f"Configure cookie '{cookie_name}' with HttpOnly=true in your application session config.",
            })

        # Check Secure flag
        if not c.secure and target_url.startswith("https://"):
            findings.append({
                "type": "Cookie Security (Secure Flag)",
                "severity": "MEDIUM",
                "target": target_url,
                "detail": f"Cookie '{cookie_name}' lacks Secure flag on an HTTPS origin — transmitted in plaintext if intercepted.",
                "cvss_score": 4.8,
                "cwe": "CWE-614",
                "owasp": "A05:2021 - Security Misconfiguration",
                "evidence": [{"cookie": cookie_name, "issue": "Missing Secure flag"}],
                "remediation": f"Set Secure=true on '{cookie_name}' to restrict cookie transmission to encrypted HTTPS only.",
            })

        # Check SameSite
        samesite = getattr(c, "_rest", {}).get("samesite") or getattr(c, "_rest", {}).get("SameSite")
        if not samesite:
            findings.append({
                "type": "Cookie Security (SameSite)",
                "severity": "LOW",
                "target": target_url,
                "detail": f"Cookie '{cookie_name}' lacks SameSite attribute — increased risk of Cross-Site Request Forgery (CSRF).",
                "cvss_score": 3.7,
                "cwe": "CWE-1275",
                "owasp": "A01:2021 - Broken Access Control",
                "evidence": [{"cookie": cookie_name, "issue": "Missing SameSite"}],
                "remediation": f"Set SameSite=Lax or SameSite=Strict on '{cookie_name}'.",
            })

    # 2. Audit Security Headers
    headers_lower = {k.lower(): v for k, v in resp.headers.items()}
    for header, info in SECURITY_HEADERS.items():
        if header.lower() not in headers_lower:
            findings.append({
                "type": f"Security Header ({header})",
                "severity": info["severity"],
                "target": target_url,
                "detail": info["detail"],
                "cvss_score": 3.1 if info["severity"] == "LOW" else 1.5,
                "cwe": info["cwe"],
                "owasp": info["owasp"],
                "evidence": [{"missing_header": header}],
                "remediation": f"Add the HTTP header '{header}' to your web server or reverse proxy responses.",
            })

    return findings
