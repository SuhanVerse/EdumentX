# EdumentX AI Tutor Discovery Assistant — Full Documentation

> **Last updated**: August 2, 2026
> **Audience**: All teammates working on the AI assistant ("RAGbot")
> **Purpose**: How the assistant works, the complete request→response workflow, how to get API keys, set up the environment, deploy, and test.

---

## Table of Contents

1. [What This Assistant Is (and Isn't)](#1-what-this-assistant-is-and-isnt)
2. [System Architecture](#2-system-architecture)
3. [Complete Workflow (End-to-End)](#3-complete-workflow-end-to-end)
4. [Pipeline Stages in Detail](#4-pipeline-stages-in-detail)
5. [Mock Mode vs Real Mode](#5-mock-mode-vs-real-mode)
6. [Data Model: Firestore → Supabase](#6-data-model-firestore--supabase)
7. [Database Migrations](#7-database-migrations)
8. [Key Files Map](#8-key-files-map)
9. [Setup Guide — Getting the API Keys](#9-setup-guide--getting-the-api-keys)
10. [Project Setup — Step by Step](#10-project-setup--step-by-step)
11. [Going Live — Deployment Guide](#11-going-live--deployment-guide)
12. [Testing Checklist](#12-testing-checklist)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. What This Assistant Is (and Isn't)

The AI assistant is a **tutor discovery chatbot** — its only job is to help students find suitable tutors through natural conversation. It is **not** a general-purpose chatbot.

**What it does:**
- Understands what the student needs (subject, grade, budget, location, and preferences like gender / experience / mode)
- Searches the tutor database using structured SQL filters + semantic (vector) matching
- Presents tutor cards conversationally
- Remembers constraints across turns (and across app restarts for the same student)
- Answers questions about the EdumentX app (FAQ)

**What it refuses:**
- General knowledge questions ("What is the capital of France?")
- Code/homework/assignment requests
- Anything unrelated to tutor discovery or EdumentX — it politely redirects back

**The one-line pitch:** the LLM never generates SQL, never invents tutors, and never sees raw tutor data before the search runs. The code builds the query from extracted constraints; the search runs first; *then* the LLM describes the real results.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ React Native App (Expo)                                      │
│                                                              │
│  AIChat.tsx  ──  Zustand store (aiChatStore.ts)              │
│      │                                                        │
│      │  sendChatMessage(sessionId, message, constraints,      │
│      │                    { removed_constraints, ... })       │
│      ▼                                                        │
│  services/ai/chatService.ts                                   │
│      │                                                        │
│      │  EXPO_PUBLIC_USE_MOCK_DATA = "true" ?                  │
│      │    ──► mockChatService.ts (pure client, no network)    │
│      │                                                        │
│      ▼  POST {supabase_url}/functions/v1/chat                 │
│         headers: apikey=<ANON>, Authorization: Bearer <FB ID> │
└──────────────┬───────────────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase Edge Function (supabase/functions/chat/)            │
│                                                              │
│  index.ts → handler.ts → orchestrator.ts                     │
│    1. CORS + Firebase JWT verification (middleware.ts)       │
│    2. Request validation + rate limiting (PostgreSQL-backed) │
│    3. orchestrator.ts: get session → save message →          │
│       processMessage() → save reply → persist constraints    │
│    4. stateMachine.ts: pre-checks → intent classification    │
│       → constraint extraction → hybrid search → ranking      │
│       → response generation                                  │
└──────────────┬───────────────────────────────────────────────┘
               ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase PostgreSQL (pgvector)                               │
│  • tutors (denormalized search index)                        │
│  • tutor_embeddings (384-dim vectors, bge-small-en-v1.5)     │
│  • conversations / messages (session memory)                 │
│  • hybrid_search_tutors(...) RPC (SQL filters + vector)      │
│  • rate_limits (per-user rate limiting)                      │
│                                                              │
│ External: Groq (LLM) · HuggingFace (embeddings)              │
└──────────────────────────────────────────────────────────────┘
```

**Data flow at a glance:**
- **Firebase Auth** → student identity (JWT verified by the Edge Function)
- **Firestore** → source of truth for profiles (`users/{uid}`, `users/{uid}/tutorProfile/default`)
- **Supabase PostgreSQL** → search index; synced from Firestore by the seed script
- **Groq** → LLM calls (intent classification, constraint extraction, response generation, re-ranking)
- **HuggingFace** → embeddings (tutor profiles + query text) via `BAAI/bge-small-en-v1.5`

---

## 3. Complete Workflow (End-to-End)

Here is exactly what happens when a student sends a message in **real mode**:

### Step 1 — Client sends the message
`AIChat.tsx` → `aiChatStore.sendMessage()` → `services/ai/chatService.ts`:
- Gets the Firebase ID token from `@react-native-firebase/auth`
- Builds the payload:
  ```json
  {
    "session_id": "chat_...",
    "message": "I need a maths tutor under 15000",
    "current_constraints": { ...client mirror of accumulated constraints... },
    "removed_constraints": ["gender_preference"],   // only if a pill was tapped
    "recent_messages": [ {role, text}, ... ]         // last few turns
  }
  ```
- POSTs to `{SUPABASE_URL}/functions/v1/chat` with two headers:
  - `apikey: <EXPO_PUBLIC_SUPABASE_ANON_KEY>` (lets the Supabase gateway accept the request)
  - `Authorization: Bearer <Firebase ID token>` (verified by our middleware, since the function is deployed with `--no-verify-jwt`)

> 💡 **Mock mode:** if `EXPO_PUBLIC_USE_MOCK_DATA=true`, `chatService` short-circuits to `mockChatService.ts` (pure client-side pipeline, zero network). Same response shape, so the UI never knows the difference.

### Step 2 — Edge Function middleware (`middleware.ts`)
1. **CORS** — handles preflight
2. **Auth** — verifies the Firebase JWT, extracts `user.uid`
3. **Validation** — checks `session_id` + `message` presence, `removed_constraints` shape
4. **Rate limiting** — calls `rate_limit_check()` RPC (PostgreSQL-backed, survives cold starts)

### Step 3 — Orchestrator (`orchestrator.ts`)
1. **Get/create session** — `conversations` row keyed by `session_id` (owned by `student_id`)
2. **Save the user message** to the `messages` table
3. **Load history** — last 6 messages, formatted into a `historyString` for the LLM
4. **Call `processMessage()`** — the state machine (next step)
5. **Save the assistant reply** (marked `tutor_card` if cards were returned)
6. **Persist state** — `current_step` + merged `constraints` (with `replace: true`), and the last results

### Step 4 — State machine (`stateMachine.ts`)
Pre-checks first (cheap, deterministic, no LLM):
1. **`removed_constraints` reset** — keys tapped off as pills are wiped from the session + `query_text` is forced to rebuild
2. **Offensive content** — blocked
3. **Prompt injection** — blocked
4. **Quick off-topic** — "write a program", "what is the capital of..." caught by regex
5. **FAQ pre-check** — high-confidence keyword match (and no tutor-search signal) → FAQ answer
6. **Contact-info guard** — "what's the tutor's phone?" → privacy answer (never shares contact in chat)
7. **Acknowledgment** — "okay" / "thanks" / "sounds good" → warm acknowledgment, **no search re-run**

Then route by current state (`collecting` | `searching` | `presenting` | `followup`):

**COLLECTING** (default):
1. Location opt-out check ("anywhere", "doesn't matter") → waives location
2. **Intent classification** (Groq, with history + few-shot examples)
3. Off-topic → polite refusal · greeting → greet back · `ask_knowledge_base` → FAQ answer · `list_all` → search with whatever's known
4. **Constraint extraction** (Groq LLM + deterministic keyword pass; keywords win)
5. **Merge** with existing constraints
6. **Minimum gate:** `subject + grade + budget` present?
   - No → ask the **single** next question (subject → grade → budget, then optional ones)
   - Yes → `executeSearch()`

**PRESENTING** (results on screen):
- `refine_search` ("only female", "under 5000") → re-extract, merge, re-search
- `change_criteria` ("actually I want physics") → back to collecting
- `view_profile` / `book_tutor` → guidance on using the cards/Enroll button
- greetings / FAQ / off-topic handled regardless of state

**executeSearch():**
1. **Hybrid search** — `hybrid_search_tutors()` RPC: SQL filters + vector similarity
2. **Sort intent check** — "sort by experience/rating/cheapest" → rank a pool of 20, sort deterministically, cap at 5. Vague reorder phrases → Groq re-rank only then.
3. **Deterministic ranking** — weighted score (see §4)
4. **Empty results** → helpful message naming the most-restrictive filter (e.g. "The 'female' tutor filter looks most restrictive")
5. **Response generation** — Groq describes the ranked results; state → `presenting`

### Step 5 — Client renders
`chatService` maps snake_case → camelCase, the store appends the message + tutor cards, pills update from the returned constraints, session persists to AsyncStorage.

---

## 4. Pipeline Stages in Detail

### 4.1 Intent Classification (`ai/domain/intentClassifier.ts` + `prompts.ts`)
One Groq call per message (with conversation history). Output: `is_within_scope` + `intent`.

| Intent | Example |
|--------|---------|
| `search_tutors` | "I need a Maths tutor" |
| `refine_search` | "only female", "under 5000" (has existing results) |
| `ask_knowledge_base` | "What is a verified tutor?" |
| `greeting` | "Hi", "Hello", "Good morning" |
| `off_topic` | "Write a Python program" |
| `offensive` | abusive content |
| `feedback` | "You're helpful" |
| `compare_tutors` | "Which one has better ratings?" |
| `view_profile` | "Tell me more about Saraswoti" |
| `book_tutor` | "I want to book Ramesh" |
| `change_criteria` | "Actually, I want a different subject" |
| `clarify` | "What do you mean?" |
| `list_all` | "Show me all tutors" |

Few-shot examples in the prompt teach it to handle **bare answers** ("12" after a grade question → grade, not money), **refinements** ("Female" → update gender, not a new search), and the FAQ vs search distinction.

### 4.2 Constraint Extraction (`ai/agents/constraintExtractor.ts`)
Two paths merged:
- **LLM path** — extracts structured constraints from the message
- **Deterministic keyword path** — regex tables for subject synonyms, gender words, budget patterns (`12k` → `12000`, `Rs. 5,000` → `5000`), grades (`XII` → `12`, `11`/`12` → `+2`), experience (`6+ years` → `min_experience: 6`), etc.

**Merge rule — keywords win.** For `gender`, `subject`, and `grade`, a deterministic keyword match always overrides the LLM (this kills hallucinations like "Kathmandu → man → male" and "capital of France → Computer Science"). An LLM-only gender/subject is dropped unless the message literally contains a matching keyword.

**Minimum constraints:** `subject` + `grade` + `budget_max`. Location is **optional** (can be waived with "anywhere" / a chip). Secondary constraints (gender, mode, language, min experience, min rating) refine results when stated.

**Budget parsing** handles: `5000`, `Rs 5000`, `NPR 5000`, `5,000`, `12k`, `12k+`, `under 7000`, `max 15000`.

**Grade normalization:** `11`/`12` → `+2` (both grades are one Nepali "+2" level); roman numerals supported (`XII` → `12`, word-boundary so "maximum" never false-matches).

### 4.3 Hybrid Search (`ai/retrieval/hybridSearch.ts` + `sqlFilterBuilder.ts`)
Calls the `hybrid_search_tutors(...)` RPC. Filters:
- **subject** → `subjects` ILIKE ANY of the subject + all its synonyms
- **grade** → overlap via `grade_to_terms(g) && grade_to_terms('12')` (handles "Grade XII (Science)", "Grade 9-10", "+2")
- **budget** → `monthly_rate_npr <= budget_max`
- **gender** → `gender = 'female'` (etc.)
- **tutoring mode / language** → SQL-only filters (not in vector similarity)
- **verified only** → `is_verified_professional = true` (only when the user explicitly asks — the "Verified tutors" chip)

**Vector part:** query text embedding (built from the current constraints) → cosine similarity via `tutor_embeddings`, LEFT JOINed so tutors **without** embedding rows still appear (similarity 0, ranked last).

**Fallback chain (budget-only relaxation):** exact → budget +50% → budget +100%. Subject/gender/grade are **never** dropped. Exhausted fallback returns `[]` — never the whole directory.

### 4.4 Ranking (`ai/retrieval/rankingEngine.ts`)
Deterministic weighted score:
- Similarity: **0.35**
- Budget proximity: **0.30** (closer to the student's budget = better)
- Rating: **0.25**
- Experience: **0.10**

**Sort intents** override this: "sort by experience" → highest experience first, "cheapest" → price ascending, "highest rated" → rating descending. Explicit sorts re-rank a pool of 20 then cap at 5 (so the most-experienced tutor surfaces even if they ranked 6th by score). Vague reorder phrases ("best tutors") go to `groqRank` (Groq) — and **only then** (saves the LLM call for normal searches).

### 4.5 Response Generation (`ai/agents/responseGenerator.ts`)
- Takes ranked results + constraints, asks Groq for a natural summary
- **Never invents tutors** — names/prices/ratings come exclusively from the returned cards
- Empty results → names the most-restrictive filter + suggests the relax phrasing ("Try saying 'anywhere'")
- Post-generation guardrail verifies no hallucinated tutor names or leaked contact info

### 4.6 Memory (`supabase/ai/memory/`)
- **Sessions** (`sessionStore.ts`) — per-student conversation row holding `current_step`, `constraints`, `last_results`, `fallback_attempted`, message counts. TTL + inactivity cleanup.
- **Messages** (`messageStore.ts`) — last **6 messages** are kept as LLM context (`buildHistoryString`).
- **Client store** (`store/aiChatStore.ts`) — persisted to AsyncStorage (messages, sessionId, constraints), so reopening the app continues the same session. Constraints survive app restarts; a 30-minute inactivity window resets the session.
- **Pill removal** — tapping a pill sends `removed_constraints` with the next message; the server resets those keys + rebuilds `query_text` before merging, so a removed filter can never silently come back.

### 4.7 Guardrails (`ai/domain/guardrails.ts`)
- **Pre-gen:** offensive content, prompt injection — deterministic, before any LLM call
- **Post-gen:** hallucinated-tutor + contact-leak checks on the generated response

---

## 5. Mock Mode vs Real Mode

Toggle with `EXPO_PUBLIC_USE_MOCK_DATA` in `.env`:

| | Mock mode (`true`) | Real mode (`false` or unset) |
|---|---|---|
| Network | None (offline) | Edge Function call |
| Tutor data | `lib/mock/tutors.ts` (in-memory) | Supabase `tutors` table (synced from Firestore) |
| Constraint extraction | Keyword parser only (`clientConstraintParser.ts`) | Groq LLM + keywords (keywords win) |
| Search | `MockTutorRepository.searchTutors()` | `hybrid_search_tutors()` RPC (SQL + vectors) |
| Embeddings | None | HuggingFace |
| Ranking | Deterministic + optional Groq re-rank | Deterministic + optional Groq re-rank |
| Auth | None needed | Firebase JWT required |

**Both modes return the exact same `ChatResponse` shape** — the UI, store, pills, and guardrail behaviors are identical. Mock mode exists so you can test the conversation logic + filters offline without seeding or deploying anything.

> ⚠️ **Parity note:** mock and real were once out of sync (real showed 0 tutors while mock worked — empty `grades_teaching` in Supabase, and a `verified_only` default that silently filtered everything). This is fixed: mock filters and RPC filters now behave identically. Keep the mock pipeline in sync when you change filtering behavior.

---

## 6. Data Model: Firestore → Supabase

**Firestore (source of truth):**
- `users/{uid}` — auth role, verification status
- `users/{uid}/tutorProfile/default` — **rich profile**: subjects, `gradesTeaching`, gender, bio, headline, `monthlyRateNpr`, `tutoringMode`, `languages`, ratings, verification docs
- `tutors/{uid}` — denormalized directory card (admin approval writes it)

**Supabase PostgreSQL (search index):**
- `tutors` — denormalized from Firestore, one row per approved tutor
- `tutor_embeddings` — 384-dim vector per tutor (built from headline + bio + subjects + grade + budget context)
- `conversations` / `messages` — chat session memory
- `embedding_cache` — dedupe HuggingFace calls
- `rate_limits` — per-user rate limiting
- `hybrid_search_tutors(...)` — the search RPC
- `grade_to_terms(...)` — grade normalization function used by the RPC

**Sync:** `npm run seed:tutors` reads approved tutors from Firestore (merging the rich profile subcollection), generates embeddings via HuggingFace, and upserts into Supabase. Run it after onboarding/approving new tutors or after profile edits.

---

## 7. Database Migrations

All in `supabase/migrations/`. Applied with `npx supabase db push`:

| Migration | Purpose |
|-----------|---------|
| 001 | Enable `pgvector` |
| 002 | `tutors` table |
| 003 | `tutor_embeddings` table |
| 004 | `conversations` table |
| 005 | `messages` table |
| 006 | `embedding_cache` table |
| 007 | `hybrid_search_tutors` function |
| 008 | `gender` on tutors |
| 009 | `tutoring_mode` + `languages` on tutors |
| 010 | Extend hybrid search (gender + mode + language filters) |
| 011 | IVFFlat embedding index |
| 012 | `rate_limits` table + `rate_limit_check()` RPC |
| 013 | Fix hybrid search: LEFT JOIN embeddings + subject synonyms (`subject_terms`) |
| 014 | `grade_to_terms()` + grade overlap matching |

---

## 8. Key Files Map

```
ai/                          # Server-side AI core (Deno-compatible, shared with Edge Function)
  agents/constraintExtractor.ts    # LLM + keyword constraint extraction
  agents/responseGenerator.ts      # Groq response generation
  domain/guardrails.ts             # offensive/injection/hallucination checks
  domain/intentClassifier.ts       # quick off-topic regex + intent orchestration
  domain/prompts.ts                # system prompts + few-shot examples
  domain/keywords.ts               # canonical subject/synonym/gender tables
  embeddings/buildEmbeddingText.ts # what goes into a tutor embedding
  embeddings/generateEmbedding.ts  # HuggingFace call
  knowledgeBase/faq.ts             # FAQ entries
  knowledgeBase/faqMatcher.ts      # FAQ keyword scoring
  memory/constraintMerger.ts       # merge + minimum-constraint gate
  memory/sessionStore.ts           # conversation persistence
  memory/messageStore.ts           # message persistence + history string
  retrieval/hybridSearch.ts        # RPC invocation + fallback chain
  retrieval/rankingEngine.ts       # weighted score + sort intents
  retrieval/sqlFilterBuilder.ts    # SQL WHERE clause construction
  state/stateMachine.ts            # the 4-state conversation machine
  state/states.ts                  # getNextQuestion etc.
  types/                           # shared types
  utils/groqClient.ts              # runtime-agnostic Groq client
  utils/supabaseClient.ts          # service-role Supabase client (server only)

supabase/functions/chat/      # Edge Function
  index.ts                     # entry point (Deno.serve)
  handler.ts                   # CORS/auth/validate/rate-limit + respond
  middleware.ts                # Firebase JWT verification + validation + rate limit
  orchestrator.ts              # session → message → state machine → persist

supabase/ai/                  # Server-side copy of the AI core (Edge Function imports this)
supabase/migrations/          # 001–014 SQL migrations

services/ai/chatService.ts    # client API wrapper (real mode)
services/ai/mockChatService.ts# client-side mock pipeline (mock mode)
services/ai/groqRanker.ts     # optional LLM re-ranking + refinement
services/tutors/              # MockTutorRepository / FirebaseTutorRepository / dataSource
store/aiChatStore.ts          # Zustand chat state (persisted)
hooks/useAiChat.ts            # React hook exposing the store
lib/ai/clientConstraintParser.ts  # mock-mode keyword parser
lib/ai/minimumConstraints.ts  # mock-mode minimum gate + question picker
lib/mock/tutors.ts            # mock tutor dataset
scripts/seedSupabaseTutors.ts # Firestore → Supabase sync + embeddings
```

---

## 9. Setup Guide — Getting the API Keys

The assistant runs on 4 services. This section walks you through creating accounts and collecting keys for each. **Everything is free** (no credit card required).

### What each key does (at a glance)

| Service | Key(s) | What it's used for | Secret? |
|---------|--------|--------------------|---------|
| **Groq** | `EXPO_PUBLIC_GROQ_API_KEY` | The LLM "brain" — intent, constraint extraction, responses, re-ranking | Personal |
| **HuggingFace** | `EXPO_PUBLIC_HF_API_TOKEN` | Embeddings — turns profiles + searches into vectors for semantic matching | Personal |
| **Supabase** | `EXPO_PUBLIC_SUPABASE_URL`<br>`EXPO_PUBLIC_SUPABASE_ANON_KEY` | Database, search RPC, Edge Function hosting | Shared (safe) |
| **Supabase** | `SUPABASE_SERVICE_ROLE_KEY` | Full database admin — **only** for the seed script | 🔴 **YES** |
| **Supabase** | database password | **Only** for `db push` (direct Postgres access) | 🔴 **YES** |
| **Firebase** | `EXPO_PUBLIC_FIREBASE_*` | Auth + Firestore — the app's identity layer | Shared |
| **Firebase** | service account JSON | Firebase Admin — **only** for the seed script | 🔴 **YES** |

### 9.1 Groq — the LLM brain

1. Go to **https://console.groq.com** and sign up (Google/GitHub login works)
2. Open **API Keys** in the left sidebar
3. Click **Create API Key** → name it (e.g. `edumentx-dev`) → copy the value (starts with `gsk_...`)
4. It's only shown **once** — store it in `.env` as `EXPO_PUBLIC_GROQ_API_KEY`

> Free tier: generous rate limits, plenty for development. If you hit a rate-limit error, wait a minute and retry (or use a second account for heavy load).

### 9.2 HuggingFace — embeddings

1. Go to **https://huggingface.co** and sign up
2. Click your avatar → **Settings** → **Access Tokens**
3. **Create new token** → Type: **Read** → name it `edumentx` → copy the value (starts with `hf_...`)
4. Store it in `.env` as `EXPO_PUBLIC_HF_API_TOKEN`

> Used for tutor + query embeddings (model `BAAI/bge-small-en-v1.5`). HuggingFace Serverless Inference is free for development use.

### 9.3 Supabase — database, search & hosting

1. Go to **https://supabase.com** and sign in. If you're not already a member of the project, ask the owner to add you (**Project Settings → Access → Invite**, role *Developer* or higher)
2. Open the project → **Project Settings** (gear icon) → **API**
3. Copy what you need:

| Value | Where | Goes into |
|-------|-------|-----------|
| Project URL (`https://cuedmkwgkpipczhedpem.supabase.co`) | Settings → API | `EXPO_PUBLIC_SUPABASE_URL` |
| `anon` public key | Settings → API | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | Settings → API | `SUPABASE_SERVICE_ROLE_KEY` (seed only) |

Also note your **project ref** — `cuedmkwgkpipczhedpem` — the string after `/project/` in the dashboard URL. It's **not a secret**; you'll use it with the Supabase CLI (`--project-ref`).

> ⚠️ **The `service_role` key is powerful** — full database access that bypasses all security rules. Keep it only in your local `.env` (never `EXPO_PUBLIC_*`, never committed, never in the app). You do **not** need it to use the assistant — only to run the seed script.

### 9.4 Firebase — auth & Firestore

The Firebase project config is already wired into the repo (`google-services.json`, `GoogleService-Info.plist`, `app.json`). You only need fresh values if you're setting up a brand-new machine:

1. Go to **https://console.firebase.google.com** → open the EdumentX project
2. **Project Settings** → your app → copy the `EXPO_PUBLIC_FIREBASE_*` values into `.env`
3. **Seed-only:** Project Settings → **Service accounts** → **Generate new private key** → save the JSON as `firebase-service-account.json` in the project root (this is a 🔴 secret — don't commit it)

---

## 10. Project Setup — Step by Step

### 10.1 Prerequisites

- **Node.js ≥ 20.19.4** (`node --version`) and npm (bundled with Node)
- A phone/emulator for the app (or run on web)
- The Supabase CLI runs via `npx supabase` — no global install needed

### 10.2 Clone & install

```bash
git clone <repo-url> edumentx
cd edumentx
npm install
```

### 10.3 Create your `.env` file

```bash
cp .env.example .env
```

Open `.env` and fill in the values (each one comes from §9):

```bash
# ── Firebase (Auth + Firestore) ──
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# ── Supabase ──
EXPO_PUBLIC_SUPABASE_URL=            # https://cuedmkwgkpipczhedpem.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=       # anon public key
SUPABASE_SERVICE_ROLE_KEY=           # service_role key — ONLY if you run the seed

# ── AI ──
EXPO_PUBLIC_GROQ_API_KEY=            # gsk_... (your own)
EXPO_PUBLIC_HF_API_TOKEN=            # hf_... (your own)

# ── Mode ──
EXPO_PUBLIC_USE_MOCK_DATA=true       # true = offline mock · false = live Edge Function
```

### 10.4 Which keys do YOU need? (by what you want to do)

| I want to... | Keys I need | Service key? |
|--------------|-------------|--------------|
| Run the app + chat (mock mode) | URL + anon key, Groq, HF | ❌ |
| Run the app + chat (real mode) | URL + anon key, Firebase keys | ❌ (the deployed function holds its own) |
| Deploy the Edge Function | Supabase account + project access | ❌ |
| Run the seed script | Service role key + HF token + Firebase service JSON | ✅ (only here) |
| Push database migrations | Database password (not the service key) | ❌ |

### 10.5 First run

```bash
npm start          # then press "a" (Android) / "i" (iOS) / "w" (web)
```

With `EXPO_PUBLIC_USE_MOCK_DATA=true` you can chat with the assistant immediately using the built-in sample tutor dataset — no backend needed. Flip it to `false` and restart Expo to talk to the live Edge Function.

---

## 11. Going Live — Deployment Guide

> Only needed when the backend changes. Run these **in order**. If you're just developing the app, you can skip this section entirely — the function is already deployed.

### 11.1 The full command sequence

> ℹ️ **About `--project-ref`:** the flag is **optional once your machine is linked**
> (step 2 caches the project in `supabase/.temp/`). After linking, plain
> `npx supabase functions deploy chat` works fine. The flag is included so the
> commands also work on a **fresh machine that hasn't linked yet**, and to make
> the target project unambiguous.

```bash
# 1. Log in with YOUR Supabase account (a browser window opens)
npx supabase login

# 2. Link to the EdumentX project (once per machine — after this,
#    the --project-ref flag on later commands becomes optional)
npx supabase link --project-ref cuedmkwgkpipczhedpem

# 3. Apply new migrations — ONLY if new files were added to supabase/migrations/
npx supabase db push --project-ref cuedmkwgkpipczhedpem
#    You'll be asked for the DATABASE password (set at project creation).

# 4. Sync tutor data Firestore → Supabase (+ embeddings)
npm run seed:tutors
#    Requires: SUPABASE_SERVICE_ROLE_KEY + HF_API_TOKEN in .env
#    + firebase-service-account.json in the project root.

# 5. Set Edge Function secrets — ONE-TIME per environment, don't re-run casually
npx supabase secrets set GROQ_API_KEY=gsk_... HF_API_TOKEN=hf_... --project-ref cuedmkwgkpipczhedpem
#    (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically)

# 6. Deploy the Edge Function (ships the latest chatbot code)
npx supabase functions deploy chat --project-ref cuedmkwgkpipczhedpem

# 7. Firestore rules — only if auth/verification rules changed
npm run deploy:rules
```

### 11.2 What each step does

| Step | What it does | When you need it |
|------|-------------|------------------|
| `login` | Authenticates the CLI with your Supabase account | Once per machine |
| `link` | Tells the CLI which project to talk to | Once per machine |
| `db push` | Applies SQL migrations (creates tables, functions, indexes) | When a teammate adds a migration file |
| `seed:tutors` | Copies approved tutors + their embeddings into Supabase | After onboarding/approving tutors or profile edits |
| `secrets set` | Stores Groq/HF keys for the deployed function | One-time per environment |
| `functions deploy` | Ships the latest chatbot code to the live endpoint | After any change to `supabase/ai/` or `supabase/functions/chat/` |
| `deploy:rules` | Publishes Firestore security rules | Rarely — only when rules change |

### 11.3 Who can run what

| Command | Credential needed | Service key? |
|---------|-------------------|--------------|
| `npx supabase login` | Your own Supabase account (free signup) | ❌ |
| `npx supabase link` | Account added as project member by the owner | ❌ |
| `npx supabase db push` | **Database password** (direct Postgres access) | ❌ |
| `npm run seed:tutors` | `SUPABASE_SERVICE_ROLE_KEY` + `HF_API_TOKEN` + Firebase service JSON | ✅ |
| `npx supabase functions deploy chat` | Supabase login + project access | ❌ |
| `npx supabase secrets set` | Supabase login + project access | ❌ |

> **Practical tip:** one trusted person can run `db push`, `seed:tutors`, and `functions deploy` for the whole team. Everyone else just `git pull` the migration files and uses the already-deployed function. Nobody else needs any secret.

### 11.4 Secrets & safety rules

1. **`SUPABASE_SERVICE_ROLE_KEY` and the database password are equally powerful** — both grant full database access. Keep them out of git, out of the app binary, and in trusted hands only.
2. **Don't re-run `secrets set` casually** — it overwrites the project-wide secrets for everyone. Teammates should deploy with the existing secrets, not their own.
3. **`EXPO_PUBLIC_*` variables are bundled into the app binary** — never put a secret (service role key, DB password, Firebase service JSON) in any `EXPO_PUBLIC_*` variable.
4. **The Firebase service account JSON is a secret too** — it grants Firebase Admin access. Keep it out of the repo (it's git-ignored).

> ⚠️ The function is deployed with `--no-verify-jwt` — the Edge Function verifies the Firebase JWT itself in middleware. If it's ever redeployed with JWT verification enabled, requests would be rejected before reaching our handler.

---

## 12. Testing Checklist

### Mock mode (no backend needed)
| # | Test | Expected |
|---|------|----------|
| 1 | "I need a maths tutor" → "12" → "around 7000" | Asks subject → grade → budget, then searches — **no repeated questions** |
| 2 | "Female tutor" / "only female" | Gender pill appears; only female tutors shown |
| 3 | "What is a verified tutor?" | FAQ answer, not a search |
| 4 | "Write a Python program" / "capital of France" | Polite off-topic refusal |
| 5 | "Hi" / "Hello" / "Good morning" | Greets back |
| 6 | "12k" | Budget pill shows Rs 12,000 (not 12) |
| 7 | "6+ years of experience" | `min_experience: 6`; only 6+ years tutors |
| 8 | "sort by experience" | Most experienced tutor on top (no LLM error) |
| 9 | "okay" / "thanks" after results | Warm ack, **no re-run** |
| 10 | Cross out a pill, search again | Filter gone; does not come back |

### Real mode (requires deploy + seed)
| # | Test | Expected |
|---|------|----------|
| 1 | "Maths grade 12 under Rs 15k" | Matching tutors show (grade overlap works) |
| 2 | "Female maths tutor" | Only female tutors |
| 3 | "anywhere" at the location question | Location waived; search proceeds |
| 4 | Seed sanity SQL: `SELECT id, grades_teaching, gender FROM tutors;` | Grades/gender populated, not `{}`/null |
| 5 | A tutor without an embedding row | Still appears (LEFT JOIN), ranked last |

---

## 13. Troubleshooting

| Symptom | Cause / Fix |
|---------|-------------|
| `WARN [groqRanker] ... using deterministic order` | Groq returned non-JSON or errored. The pipeline falls back to deterministic order — **not fatal**. Check the Groq key + rate limits. |
| `HF request failed: getaddrinfo ENOTFOUND` | Network/DNS on your machine (or HF briefly down). Re-run `npm run seed:tutors` later. Search still works — only semantic ranking is reduced. |
| "No tutors match your current requirements" but tutors exist | Re-seed (`npm run seed:tutors`) — likely empty `grades_teaching`/`gender` in Supabase from an old seed. Also check `has_pending_update` — tutors with pending edits are hidden. |
| A removed pill keeps coming back | Old client/function. The `removed_constraints` fix requires the redeployed Edge Function (client + function must both be current). |
| "Kathmandu" became a male filter / "capital of France" became Computer Science | Old extractor behavior. The keyword-wins merge fix is server-side — **redeploy the function**. |
| FAQ questions answered with tutors | Old function. FAQ pre-check + intent routing are fixed in the current code — redeploy. |
| Grade pill shows "Grade 12" when typing 11 | Now normalized: 11 and 12 both show "Grade +2" and search both grades. Needs function redeploy for real mode. |
| Real mode ≠ mock mode behavior | Check `EXPO_PUBLIC_USE_MOCK_DATA` value and that the function was redeployed after the last code change. |

---

## Appendix — Why It's Built This Way (Brief)

- **Not pure RAG** — tutor search is structured (budget ≤ X, grade matches, gender = Y). Vector similarity alone can't enforce these. We use **hybrid**: SQL filters for hard constraints + pgvector for soft semantic matching ("patient", "exam-focused").
- **The LLM never writes SQL** — constraints are extracted as JSON; the query is built from templates (no injection risk).
- **The LLM never invents tutors** — search runs first, then the LLM describes real ranked results.
- **State machine, not LangGraph** — 4 states is simpler to maintain and debug for an MVP.
- **Zero-budget** — Groq (free tier), HuggingFace Serverless (free), Supabase free tier, no paid APIs anywhere.
