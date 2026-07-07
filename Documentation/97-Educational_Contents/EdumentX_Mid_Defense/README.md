# EdumentX — Mid-Term Project Report

LaTeX source for the mid-term defense of the EdumentX minor
project, prepared in the same format as the reference proposal
(`Documentation/97-Educational_Contents/Mid_defense/`).

## Build

The report is built with a standard `pdflatex` / `latexmk` toolchain.
A typical build from this folder:

```bash
# One-shot build
latexmk -pdf main.tex

# Or, if you prefer the explicit two-pass flow used by IOE
# supervisors who insist on a separate bibtex pass:
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

The first build will fail with `File 'ncelogo.jpg' not found`
until the institutional logo is dropped into `Images/` — that
is expected, see `Images/README.md` for the full asset list.

## Files

| File                            | Purpose                                                                        |
|---------------------------------|--------------------------------------------------------------------------------|
| `titlepage.tex`                 | TU / IOE / NCE title page with the 4 team members. `\include`-d by `main.tex`. |
| `main.tex`                      | The full report. Mirrors the reference structure: front matter → Introduction → Literature Review → Related Theory → Methodology → Task Accomplished → Tasks Remaining → References. |
| `ref.bib`                       | BibTeX entries for every `\citep{}` and `\citet{}` call in `main.tex`.         |
| `Images/`                       | Raster figures referenced by `main.tex`. Empty at the mid-term milestone; see `Images/README.md` for the asset list. |
| `pdfs/`                         | Reserved for compiled PDFs and source PDFs (signed approval page, design cheat sheet, etc.). |

## Placeholder contract

The team has agreed on the following placeholders, all of which
are clearly marked in the source as `\textit{[To be filled in.]}`
or as `\chapter*{...}` blocks with a centered note:

- **Approval Page** — drop in the signed PDF page once
  available; replace the body of the `\chapter*{Approval Page}`
  block in `main.tex` with `\includegraphics{pdfs/approval-page.pdf}`.
- **Acknowledgement** — short note from the team to supervisor,
  family, and friends. Limit to one page.
- **Abstract** — 200--300 words covering the problem, the
  methodology, the current progress, and the expected outcome.
- **Tasks Remaining** (Chapter 5) — placeholder structure with
  one `\section` per remaining stage (C through J). The team
  will fill in the deliverables, rationale, and target sprint
  for each as work progresses.

Everything outside the placeholders is finalized academic
content drawn from `Documentation/97-Educational_Contents/Minor_Final_Report.pdf`
and the current codebase.

## Citation key contract

All citation keys in `main.tex` are lower-case author-year
strings (e.g. `bray2007shadow`, `lewis2021rag`). They must
match the keys in `ref.bib` exactly — BibTeX is case-sensitive.
When adding a new citation, add the matching entry to `ref.bib`
in the same edit; do not leave dangling `\citep{...}` calls.
