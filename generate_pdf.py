"""
Convert SEO_CONTENT_STRATEGY.md to a styled A4 PDF using Playwright.

Run from the project root:
    python3 generate_pdf.py                          # uses ./output/
    python3 generate_pdf.py /path/to/output/dir      # custom output dir

Requires:
    pip install playwright markdown
    playwright install chromium
"""
import asyncio, markdown, os, sys
from pathlib import Path

# Output dir: first CLI arg, else OUTPUT_DIR env var, else ./output
output_dir = Path(sys.argv[1]) if len(sys.argv) > 1 \
    else Path(os.environ.get('OUTPUT_DIR', Path(__file__).parent / 'output'))
MD_FILE  = output_dir / 'SEO_CONTENT_STRATEGY.md'
# Name the PDF after the domain slug derived from the output directory name
# e.g. ./hawthornroomsdingle-com-seo -> hawthornroomsdingle-com-seo-strategy.pdf
_dir_slug = output_dir.name.removesuffix('-seo') if output_dir.name.endswith('-seo') else output_dir.name
PDF_FILE = output_dir / f'{_dir_slug}-seo-strategy.pdf'

# Derive site name from the markdown title line (first # heading)
md_text   = MD_FILE.read_text(encoding="utf-8")
title_line = next((l.lstrip("# ").strip() for l in md_text.splitlines() if l.startswith("# ")), "SEO Content Strategy")
body_html  = markdown.markdown(md_text, extensions=["tables", "fenced_code", "toc"])

html_doc = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{title_line}</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
    font-size: 13px; line-height: 1.7; color: #1f2937; background: #ffffff;
  }}
  .page-wrap {{ max-width: 780px; margin: 0 auto; padding: 48px 56px; }}
  .cover-bar {{
    background: linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 50%, #4a9fd4 100%);
    height: 7px; margin-bottom: 32px; border-radius: 4px;
  }}
  h1 {{ font-size: 25px; font-weight: 700; color: #111827; margin-bottom: 6px; line-height: 1.2; }}
  h2 {{
    font-size: 16px; font-weight: 700; color: #111827;
    margin: 34px 0 10px 0; padding-bottom: 6px;
    border-bottom: 2.5px solid #2d6a9f; page-break-after: avoid;
  }}
  h3 {{ font-size: 13.5px; font-weight: 600; color: #1f2937; margin: 20px 0 5px 0; page-break-after: avoid; }}
  h4 {{ font-size: 13px; font-weight: 600; color: #374151; margin: 14px 0 4px 0; page-break-after: avoid; }}
  p {{ margin-bottom: 9px; }}
  ul, ol {{ margin: 5px 0 11px 20px; }}
  li {{ margin-bottom: 4px; }}
  table {{
    width: 100%; border-collapse: collapse;
    margin: 12px 0 20px 0; font-size: 11.5px; page-break-inside: auto;
  }}
  thead tr {{ background: #1e3a5f; color: #fff; }}
  thead th {{
    padding: 7px 10px; text-align: left;
    font-weight: 600; font-size: 10.5px; letter-spacing: 0.3px; white-space: nowrap;
  }}
  tbody tr:nth-child(even) {{ background: #f0f6fb; }}
  tbody tr:nth-child(odd)  {{ background: #ffffff; }}
  td {{ padding: 5px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }}
  code {{
    font-family: "Courier New", monospace; font-size: 11px;
    background: #f3f4f6; padding: 1px 5px; border-radius: 3px; color: #111827;
  }}
  pre {{
    background: #f0f6fb; border-left: 4px solid #2d6a9f;
    padding: 12px 14px; margin: 10px 0 14px 0; font-size: 11px;
    line-height: 1.55; white-space: pre-wrap; word-break: break-word;
    border-radius: 0 4px 4px 0; page-break-inside: avoid;
  }}
  pre code {{ background: none; padding: 0; }}
  blockquote {{
    margin: 10px 0; padding: 10px 14px;
    border-left: 4px solid #2d6a9f; background: #f0f6fb;
    color: #374151; border-radius: 0 4px 4px 0;
  }}
  hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }}
  a {{ color: #2d6a9f; text-decoration: none; }}
</style>
</head>
<body>
<div class="page-wrap">
  <div class="cover-bar"></div>
  {body_html}
</div>
</body>
</html>"""


async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page    = await browser.new_page()
        await page.set_content(html_doc, wait_until="domcontentloaded")
        await page.wait_for_timeout(1500)
        await page.pdf(
            path=str(PDF_FILE),
            format="A4",
            margin={"top": "20mm", "bottom": "20mm", "left": "15mm", "right": "15mm"},
            print_background=True,
            display_header_footer=True,
            header_template="<div></div>",
            footer_template=f"""
              <div style="font-family:sans-serif;font-size:9px;color:#9ca3af;
                          width:100%;padding:0 15mm;display:flex;justify-content:space-between;">
                <span>{title_line}</span>
                <span><span class='pageNumber'></span> / <span class='totalPages'></span></span>
              </div>""",
        )
        await browser.close()
    size_kb = PDF_FILE.stat().st_size // 1024
    print(f"PDF saved: {PDF_FILE}  ({size_kb} KB)")


asyncio.run(main())
