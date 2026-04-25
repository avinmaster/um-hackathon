"""Render a markdown doc to a print-styled HTML for chrome --print-to-pdf."""

import argparse
import re
import sys
from pathlib import Path

import markdown


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; }}
  :root {{
    --bg: #111117; --gold: #E8BC6C; --blue: #93C5FD;
    --t-ink: #1B1B22;     /* near-black body text */
    --t-mute: #5A5A66;
    --t-faint: #9A9AA6;
    --rule: #E5E5EA;
    --code-bg: #F5F5F7;
    --serif: 'DM Serif Display', Georgia, serif;
    --sans: 'Outfit', system-ui, sans-serif;
    --mono: 'JetBrains Mono', ui-monospace, monospace;
  }}

  /* ────────── Page setup ────────── */
  @page {{ size: A4; margin: 22mm 20mm 22mm 20mm; }}
  @page :first {{ margin: 0; }}

  html, body {{ margin: 0; padding: 0; }}
  body {{
    font-family: var(--sans);
    font-size: 11pt;
    line-height: 1.62;
    color: var(--t-ink);
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  /* ────────── Cover page (dark, matches deck) ────────── */
  .cover {{
    page-break-after: always;
    break-after: page;
    height: 297mm;
    padding: 52mm 24mm 28mm;
    background: var(--bg);
    color: #F1F0ED;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }}
  .cover::before {{
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at 18% 20%, rgba(232,188,108,0.10) 0%, transparent 55%),
                radial-gradient(circle at 80% 90%, rgba(147,197,253,0.08) 0%, transparent 55%);
  }}
  .cover-eye {{
    font-family: var(--mono); font-size: 9.5pt; letter-spacing: 3px;
    text-transform: uppercase; color: rgba(241,240,237,0.42);
  }}
  .cover-title {{
    font-family: var(--serif); font-weight: 400;
    font-size: 56pt; line-height: 1.04; margin-top: 32pt;
  }}
  .cover-title em {{ font-style: italic; color: var(--gold); }}
  .cover-sub {{
    font-family: var(--sans); font-size: 14pt; line-height: 1.55;
    color: rgba(241,240,237,0.78); margin-top: 22pt; max-width: 520pt;
  }}
  .cover-rule {{ width: 64pt; height: 1px; background: var(--gold); margin-top: 32pt; opacity: 0.7; }}
  .cover-meta {{
    font-family: var(--mono); font-size: 9pt; letter-spacing: 1.5px;
    color: rgba(241,240,237,0.55); text-transform: uppercase;
    display: flex; gap: 24pt; flex-wrap: wrap;
  }}
  .cover-brand {{ font-family: var(--serif); font-size: 24pt; }}
  .cover-brand-sub {{
    font-family: var(--mono); font-size: 9pt; letter-spacing: 1.8px;
    color: rgba(241,240,237,0.55); text-transform: uppercase; margin-top: 4pt;
  }}

  /* ────────── Body ────────── */
  .body {{ }}
  .body h1 {{
    font-family: var(--serif); font-weight: 400;
    font-size: 26pt; line-height: 1.15;
    margin: 32pt 0 14pt;
    border-bottom: 1px solid var(--rule); padding-bottom: 10pt;
  }}
  .body h2 {{
    font-family: var(--serif); font-weight: 400;
    font-size: 17pt; line-height: 1.2;
    margin: 26pt 0 10pt; color: var(--t-ink);
  }}
  .body h3 {{
    font-family: var(--sans); font-weight: 600;
    font-size: 12pt; letter-spacing: 0.2px;
    margin: 20pt 0 6pt; color: var(--t-ink);
  }}
  .body h4 {{
    font-family: var(--mono); font-weight: 500;
    font-size: 9.5pt; letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--t-mute);
    margin: 16pt 0 4pt;
  }}
  .body p {{ margin: 0 0 10pt; }}
  .body strong {{ color: var(--t-ink); font-weight: 600; }}
  .body em {{ font-style: italic; color: var(--t-ink); }}
  .body a {{ color: var(--t-ink); text-decoration: underline; }}

  .body ul, .body ol {{ padding-left: 18pt; margin: 6pt 0 12pt; }}
  .body li {{ margin: 3pt 0; }}

  .body code {{
    font-family: var(--mono); font-size: 9.5pt;
    background: var(--code-bg); padding: 1pt 5pt; border-radius: 3pt;
  }}
  .body pre {{
    font-family: var(--mono); font-size: 8.5pt; line-height: 1.5;
    background: var(--code-bg); padding: 12pt 14pt; border-radius: 6pt;
    overflow: auto; margin: 8pt 0 14pt;
    white-space: pre; word-wrap: normal;
  }}
  .body pre code {{ background: transparent; padding: 0; }}

  .body blockquote {{
    border-left: 3pt solid var(--gold);
    padding: 4pt 14pt; margin: 10pt 0;
    color: var(--t-mute); font-style: italic;
    background: rgba(232,188,108,0.06);
  }}

  .body hr {{
    border: none; height: 1px; background: var(--rule);
    margin: 24pt 0;
  }}

  .body table {{
    border-collapse: collapse; width: 100%;
    font-size: 9.5pt; margin: 8pt 0 16pt;
  }}
  .body th, .body td {{
    text-align: left; padding: 7pt 10pt;
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
  }}
  .body th {{
    font-family: var(--mono); font-weight: 500;
    font-size: 8.5pt; letter-spacing: 1px; text-transform: uppercase;
    color: var(--t-mute);
    border-bottom: 1.5px solid var(--t-ink);
  }}
  .body td code {{ font-size: 9pt; }}

  /* Avoid orphaned headings / table breaks */
  .body h1, .body h2, .body h3 {{ break-after: avoid; page-break-after: avoid; }}
  .body table, .body pre, .body blockquote {{ break-inside: avoid; page-break-inside: avoid; }}

  /* Footer (running) */
  @page {{
    @bottom-center {{
      content: counter(page);
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt; color: #9A9AA6;
    }}
  }}
</style>
</head>
<body>

<section class="cover">
  <div>
    <div class="cover-eye">UMHackathon 2026 · Domain 1 · AI Systems &amp; Agentic Workflow Automation</div>
    <div class="cover-title">{cover_title}</div>
    <div class="cover-sub">{cover_sub}</div>
    <div class="cover-rule"></div>
  </div>
  <div>
    <div class="cover-brand">ONBOARD</div>
    <div class="cover-brand-sub">Powered by Z.AI GLM · Regulated Onboarding Engine</div>
    <div class="cover-meta" style="margin-top: 18pt;">
      <span>{doc_kind}</span>
      <span>April 2026</span>
      <span>Submission release</span>
    </div>
  </div>
</section>

<section class="body">
{html_body}
</section>

</body>
</html>
"""


META = {
    "prd": dict(
        cover_title='<em>Product</em><br>Requirements.',
        cover_sub="The product the platform is, the users it serves, the scope it commits to for the UMHackathon 2026 submission.",
        doc_kind="PRD · Product Requirements",
    ),
    "sad": dict(
        cover_title='<em>Software</em><br>Architecture.',
        cover_sub="The shipped system: surfaces, components, runtime data flows, and the audit substrate behind every GLM decision.",
        doc_kind="SAD · Software Architecture",
    ),
    "tad": dict(
        cover_title='<em>Technical</em><br>Architecture.',
        cover_sub="Stack, ILMU/GLM integration, the workflow engine, and the trade-offs we made to ship the MVP.",
        doc_kind="TAD · Technical Architecture",
    ),
}


def strip_first_h1_block(md_text: str) -> str:
    """Remove the first H1 + its leading metadata block; the cover page replaces it."""
    lines = md_text.splitlines()
    out = []
    seen_h1 = False
    skipping_meta = False
    for i, line in enumerate(lines):
        if not seen_h1 and line.startswith("# "):
            seen_h1 = True
            skipping_meta = True
            continue
        if skipping_meta:
            # Skip the bold metadata lines (**Product:** ..., **Submission:** ..., **Scope:** ..., **Status:** ...)
            if line.strip().startswith("**") or line.strip() == "" or line.strip() == "---":
                continue
            skipping_meta = False
        out.append(line)
    return "\n".join(out)


def render(slug: str, src: Path, dst: Path) -> None:
    md_text = strip_first_h1_block(src.read_text(encoding="utf-8"))
    # Insert a blank line before any line-start bullet that immediately follows
    # a non-blank, non-list line (so python-markdown recognises it as a list).
    fixed_lines: list[str] = []
    prev_blank = True
    prev_was_list = False
    for line in md_text.splitlines():
        is_list = bool(re.match(r"\s*[-*]\s", line)) or bool(re.match(r"\s*\d+\.\s", line))
        is_blank = line.strip() == ""
        if is_list and not prev_blank and not prev_was_list:
            fixed_lines.append("")
        fixed_lines.append(line)
        prev_blank = is_blank
        prev_was_list = is_list
    md_text = "\n".join(fixed_lines)

    html_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "attr_list"],
    )
    cfg = META[slug]
    html = HTML_TEMPLATE.format(
        title=cfg["doc_kind"],
        cover_title=cfg["cover_title"],
        cover_sub=cfg["cover_sub"],
        doc_kind=cfg["doc_kind"],
        html_body=html_body,
    )
    dst.write_text(html, encoding="utf-8")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("slug", choices=list(META.keys()))
    p.add_argument("--src", type=Path, required=True)
    p.add_argument("--dst", type=Path, required=True)
    args = p.parse_args()
    render(args.slug, args.src, args.dst)
    return 0


if __name__ == "__main__":
    sys.exit(main())
