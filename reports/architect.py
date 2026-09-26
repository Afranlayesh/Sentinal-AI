"""
architect.py — Executive Security Audit Report Generator (Sentinal-AI)
Generates standalone, printable/exportable HTML reports formatted for
C-Suite and technical engineering teams, with OWASP Top 10 & NIST alignments.
"""

import html
import json
import os
from datetime import datetime
from typing import Dict


def generate_html_report(report_data: Dict) -> str:
    """
    Renders an executive-grade HTML vulnerability audit report.
    Includes print stylesheets so users can Save as PDF directly in browser.
    """
    target = html.escape(str(report_data.get("scan_target", "Unknown Target")))
    timestamp = html.escape(str(report_data.get("scan_timestamp", datetime.now().isoformat())))
    overall_risk = html.escape(str(report_data.get("overall_risk", "UNKNOWN")))
    total = report_data.get("total_findings", 0)
    critical = report_data.get("critical", 0)
    high = report_data.get("high", 0)
    medium = report_data.get("medium", 0)
    low = report_data.get("low", 0)
    findings = report_data.get("findings", [])

    risk_colors = {
        "CRITICAL": "#ff3344",
        "HIGH": "#ffaa00",
        "MEDIUM": "#00ff66",
        "LOW": "#3b82f6",
        "INFO": "#94a3b8",
    }
    banner_color = risk_colors.get(overall_risk, "#00ff66")

    # Render findings rows
    findings_html = ""
    for idx, f in enumerate(findings, 1):
        f_type = html.escape(f.get("type", "Security Finding"))
        f_sev = html.escape(f.get("severity", "INFO"))
        f_target = html.escape(f.get("target", target))
        f_detail = html.escape(f.get("detail", "No details available."))
        f_cvss = f.get("cvss_score", "N/A")
        f_owasp = html.escape(f.get("owasp", "OWASP Top 10"))
        f_cwe = html.escape(f.get("cwe", "CWE"))
        f_remed = html.escape(f.get("remediation", "Review and apply security best practices."))

        sev_color = risk_colors.get(f_sev, "#94a3b8")

        # Code snippets
        fix_code = f.get("fix_code", {})
        code_blocks_html = ""
        if fix_code:
            code_blocks_html += "<div class='remed-code-box'>"
            for lang, code in fix_code.items():
                code_blocks_html += f"<div><strong>{lang.upper()}:</strong><pre><code>{html.escape(code)}</code></pre></div>"
            code_blocks_html += "</div>"

        findings_html += f"""
        <div class="finding-block" style="border-left: 5px solid {sev_color};">
            <div class="finding-header">
                <div>
                    <span class="finding-num">#{idx}</span>
                    <span class="finding-title">{f_type}</span>
                </div>
                <span class="badge" style="background:{sev_color}22; color:{sev_color}; border: 1px solid {sev_color};">
                    {f_sev} (CVSS {f_cvss})
                </span>
            </div>
            <div class="meta-row">
                <span><strong>Target:</strong> <code>{f_target}</code></span>
                <span><strong>OWASP:</strong> {f_owasp}</span>
                <span><strong>CWE:</strong> {f_cwe}</span>
            </div>
            <p class="finding-desc"><strong>Description & Impact:</strong> {f_detail}</p>
            <div class="remed-box">
                <div class="remed-title">🛡️ Recommended Mitigation:</div>
                <p>{f_remed}</p>
                {code_blocks_html}
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title>Sentinal-AI Security Audit — {target}</title>
    <style>
        @page {{ margin: 15mm; size: A4; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            background: #f8fafc;
            margin: 0;
            padding: 2rem;
            line-height: 1.6;
        }}
        .report-wrapper {{
            max-width: 1000px;
            margin: 0 auto;
            background: #ffffff;
            padding: 3rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.06);
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 1.5rem;
            margin-bottom: 2rem;
        }}
        .brand h1 {{
            margin: 0;
            font-size: 1.8rem;
            color: #0f172a;
            letter-spacing: -0.5px;
        }}
        .brand span {{
            color: #059669;
            font-size: 0.85rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        .print-btn {{
            background: #059669;
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
        }}
        .summary-card {{
            background: #f1f5f9;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 2.5rem;
            border-left: 6px solid {banner_color};
        }}
        .risk-banner {{
            display: inline-block;
            font-weight: 800;
            font-size: 1.1rem;
            color: {banner_color};
            margin-bottom: 0.5rem;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
            margin-top: 1rem;
        }}
        .stat-item {{
            background: #fff;
            padding: 1rem;
            border-radius: 6px;
            text-align: center;
            border: 1px solid #e2e8f0;
        }}
        .stat-val {{
            font-size: 1.8rem;
            font-weight: 700;
        }}
        .stat-val.crit {{ color: #dc2626; }}
        .stat-val.high {{ color: #d97706; }}
        .stat-val.med {{ color: #059669; }}
        .stat-val.low {{ color: #2563eb; }}
        .stat-lbl {{
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
        }}
        .finding-block {{
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            page-break-inside: avoid;
        }}
        .finding-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.75rem;
        }}
        .finding-num {{
            font-size: 0.85rem;
            font-weight: 700;
            color: #64748b;
            margin-right: 6px;
        }}
        .finding-title {{
            font-size: 1.15rem;
            font-weight: 700;
            color: #0f172a;
        }}
        .badge {{
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 700;
        }}
        .meta-row {{
            display: flex;
            gap: 1.5rem;
            font-size: 0.85rem;
            color: #475569;
            margin-bottom: 0.75rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px dashed #e2e8f0;
        }}
        .meta-row code {{
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
        }}
        .remed-box {{
            background: #ecfdf5;
            border: 1px solid #a7f3d0;
            border-radius: 6px;
            padding: 1rem 1.25rem;
            margin-top: 1rem;
            font-size: 0.9rem;
        }}
        .remed-title {{
            font-weight: 700;
            color: #065f46;
            margin-bottom: 0.3rem;
        }}
        .remed-code-box pre {{
            background: #0f172a;
            color: #38bdf8;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            overflow-x: auto;
            margin-top: 4px;
        }}
        @media print {{
            body {{ background: #fff; padding: 0; }}
            .report-wrapper {{ box-shadow: none; padding: 0; }}
            .print-btn {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="report-wrapper">
        <div class="header">
            <div class="brand">
                <h1>SENTINAL-AI AUDIT REPORT</h1>
                <span>Executive Credential & Authentication Assessment</span>
            </div>
            <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <div class="summary-card">
            <div class="risk-banner">OVERALL POSTURE: {overall_risk} RISK</div>
            <div><strong>Target Scope:</strong> <code>{target}</code></div>
            <div><strong>Evaluation Timestamp:</strong> {timestamp}</div>
            <div><strong>Assessment Engine:</strong> Sentinal-AI Autonomous Credential Intelligence Engine v1.0.0</div>

            <div class="stats-grid">
                <div class="stat-item"><div class="stat-val crit">{critical}</div><div class="stat-lbl">Critical</div></div>
                <div class="stat-item"><div class="stat-val high">{high}</div><div class="stat-lbl">High</div></div>
                <div class="stat-item"><div class="stat-val med">{medium}</div><div class="stat-lbl">Medium</div></div>
                <div class="stat-item"><div class="stat-val low">{low}</div><div class="stat-lbl">Low / Info</div></div>
            </div>
        </div>

        <h2>Detailed Vulnerability Findings & Engineering Remediations</h2>
        {findings_html if findings else "<p>No vulnerabilities identified.</p>"}

        <div style="margin-top:3rem; padding-top:1.5rem; border-top:1px solid #e2e8f0; font-size:0.8rem; color:#94a3b8; text-align:center;">
            Report generated by Sentinal-AI Security Platform. Strictly for authorized evaluation and defensive remediation.
        </div>
    </div>
</body>
</html>"""
    return html_content
