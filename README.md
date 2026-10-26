# HSE Financial Markets — Exam Trainer 2026

Standalone static exam trainer: 200 author-created practice questions across 4 blocks of 50.
No backend, external APIs, analytics, tracking or third-party scripts.
The entire question bank is inlined in `index.html`; browser localStorage stores learner progress.

## Public website
GitHub Pages from `main` branch, `/(root)`. `index.html` is the entry point.
Download the complete project source archive at `downloads/HSE_FinMarkets_Exam_Trainer_200.zip`.

## Privacy
The website contains the generated educational question bank, **not** the original lecture PDFs, exam spreadsheet, or any student private data.
Answers are stored only in the current browser; exporting progress produces a local JSON download.

## QA checklist
- 4 blocks; 50 questions per block, 25 multiple-choice and 25 open responses.
- Verify MC scoring requires exactly the whole correct set; reveal feedback after each submission.
- Open responses are evaluated heuristically, with learner self-assessment override.
- Verify progress reload, export, restart a single block, and ZIP download.
- Verify https://OWNER.github.io/hse-finmarkets-exam-2026/ and https://OWNER.github.io/hse-finmarkets-exam-2026/downloads/HSE_FinMarkets_Exam_Trainer_200.zip return HTTP 200.

Use as a study aid; not an official HSE exam platform.
