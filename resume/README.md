# Résumé source

`resume.html` is the source for **`../Shiv-Kanojiya-Resume.pdf`** (the file the
site's "Resume" button downloads).

## Edit
Edit `resume.html` (plain HTML/CSS, ATS-friendly single page).

## Regenerate the PDF
Print it to PDF with headless Chrome, from this folder:

```bash
chrome --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="../Shiv-Kanojiya-Resume.pdf" \
  "file://$(pwd)/resume.html"
```

(On Windows, use the full Chrome path, e.g.
`"/c/Program Files/Google/Chrome/Application/chrome.exe"`.)

Then commit the updated `Shiv-Kanojiya-Resume.pdf` and push.
