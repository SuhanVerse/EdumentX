# Images

This folder holds every raster figure referenced by
`main.tex`. Drop each image in with the **exact filename** that
`main.tex` expects, otherwise LaTeX will throw `File not found`
at `\includegraphics` time.

## Required files

| Filename             | Where it is referenced                       | Notes                                                                                                       |
|----------------------|----------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `ncelogo.jpg`        | `titlepage.tex` (institutional header)       | NCE logo, ~1.5 in tall, JPEG. Use the same image as the reference `Mid_defense/main.tex` uses.              |
| `sdlc.png`           | Figure 3.1 — Phases of the Iterative-Incremental Model | A clean block diagram of the iterative-incremental SDLC. Source: GeeksforGeeks (re-render allowed). |
| `system-arch.png`    | Figure 3.2 — System Architecture of EdumentX  | Three-layer architecture (Client Side / Serverless Backend / External Services). The current implementation drops Cloud Functions; remember to update the diagram before the final defense to remove the Cloud Functions box. |
| `use-case.png`       | Figure 3.3 — Use Case Diagram                | Three actors: Students/Parents, Tutors, Admin. Ellipses for each use case.                                  |
| `dfd0.png`           | Figure 3.4 — Level 0 DFD                     | Single EdumentX process with Students/Parents, Tutors, and Database.                                         |
| `dfd1.png`           | Figure 3.5 — Level 1 DFD                     | Expanded sub-processes: Auth, Tutor Search, AI Chatbot, Enrollment, Verification, Rating.                    |
| `rag.png`            | Figure 3.6 — RAG-Based AI Chatbot Workflow   | Six-step pipeline (User Query → Vector DB → Context Retrieval → Generation → Response). Source: freeCodeCamp (re-render allowed). |

## Optional figures to add later

- A Gantt chart of the actual 14-week timeline as `gantt.png`
  (Figure 4.1 in the Minor Final Proposal).
- A `night-sand-palette.png` of the design tokens (helps the
  committee visualize the ``Night & Sand'' palette).
- Screenshots of the mid-term build for the
  ``Task Accomplished'' chapter.

## Build tip

If you change an image, run a clean LaTeX build to flush the
`*.aux` and `*.lof` files:

```bash
latexmk -C && latexmk -pdf main.tex
```
