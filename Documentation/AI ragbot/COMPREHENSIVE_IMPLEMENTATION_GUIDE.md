# EdumentX — AI Ragbot: Complete Implementation Guide

> **Document Version:** 1.0  
> **Last Updated:** July 22, 2026  
> **Author:** AI Systems Team  
> **Status:** Edge Function Deployed ✅ — Pending Mobile App Integration

---

## Table of Contents

1. [What We Built](#1-what-we-built)
2. [Why We Called It "RAG" (Is It Really RAG?)](#2-why-we-called-it-rag-is-it-really-rag)
3. [Complete Folder Structure](#3-complete-folder-structure)
4. [Database: PostgreSQL + pgvector (7 Migrations)](#4-database-postgresql--pgvector-7-migrations)
5. [AI Engine (25 TypeScript Files)](#5-ai-engine-25-typescript-files)
6. [Edge Function (The Server)](#6-edge-function-the-server)
7. [Client-Side React Native Code](#7-client-side-react-native-code)
8. [Why Two `ai/` Folders?](#8-why-two-ai-folders)
9. [Sync Script for Keeping Both `ai/` Folders In Sync](#9-sync-script-for-keeping-both-ai-folders-in-sync)
10. [Supabase Dashboard Setup](#10-supabase-dashboard-setup)
11. [What Each Service Does](#11-what-each-service-does)
12. [Conversation Flow (How It Works End-to-End)](#12-conversation-flow-how-it-works-end-to-end)
13. [What's Next](#13-whats-next)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. What We Built

We built an **AI-powered tutor recommendation chatbot** for the EdumentX mobile app. Instead of browsing through lists or using filters, students can just chat naturally:

> **Student:** *"I need a Maths tutor under Rs 5000"*  
> **Bot:** *"I found 3 Maths tutors under Rs 5,000 near Baneshwor. Let me tell you about them..."*

Key capabilities:
- **Intent classification** — Detects if the user wants tutor search, FAQ, or is off-topic
- **Constraint extraction** — Parses natural language into structured filters (subject, budget, location)
- **Hybrid search** — Combines SQL filters (subject, budget) + vector similarity (semantic bio matching)
- **Ranking** — Scores tutors by similarity, budget fit, rating, experience
- **Conversation memory** — Remembers context across multiple messages
- **Domain guardrails** — Blocks unrelated questions ("write Python code")
- **Knowledge base** — Answers EdumentX-specific FAQ (verification, enrollment)

---

## 2. Why We Called It "RAG" (Is It Really RAG?)

**Short answer:** It's technically a Hybrid Search + Agentic system, not pure RAG. But we call it "Ragbot" because it's catchier.

### What Traditional RAG Does:
1. User asks a question
2. System searches for similar documents in a vector database
3. Passes those document chunks to the LLM
4. LLM answers based on those chunks

### Why That Doesn't Work for Tutor Search:
- Tutor search has **structured constraints** (budget ≤ 5000, subject = "Mathematics")
- Pure vector search can't enforce numeric filters
- The LLM might hallucinate tutor profiles if given too many in context
- It's wasteful to dump 20 full tutor profiles into every prompt

### What We Actually Built:
```
Hybrid SQL + Vector Search + Tool-Calling Agent
│
├── SQL Filters → subject, budget, rating, location
├── Vector Search → semantic match on bio, teaching style
├── State Machine → collect → search → present → followup
├── Intent Classifier → detects what the user wants
└── Guardrails → blocks off-topic questions
```

So it's **RAG-inspired** but more accurately a **Hybrid Search Agent**.

---

## 3. Complete Folder Structure

Here's every new file and folder we created:

```
edumentx/
│
├── ai/                                    ← 🔵 AI Module (used by React Native app)
│   ├── agents/
│   │   ├── constraintExtractor.ts         # LLM call → structured filters
│   │   ├── responseGenerator.ts           # LLM call → natural response
│   │   └── tutorAgent.ts                  # Helper utilities for formatting
│   │
│   ├── domain/
│   │   ├── intentClassifier.ts            # Classifies user message intent
│   │   ├── guardrails.ts                  # Safety checks (hallucination, off-topic)
│   │   └── prompts.ts                     # All system prompt templates
│   │
│   ├── embeddings/
│   │   ├── generateEmbedding.ts           # Calls HuggingFace API for vectors
│   │   ├── buildEmbeddingText.ts          # Builds text from tutor profile for embedding
│   │   └── embeddingCache.ts              # Caches embeddings in memory + PostgreSQL
│   │
│   ├── knowledgeBase/
│   │   ├── faq.ts                         # 12 FAQ entries about EdumentX
│   │   └── faqMatcher.ts                  # Keyword matching for FAQ lookup
│   │
│   ├── location/
│   │   ├── LocationService.ts             # Interface for geocoding abstraction
│   │   └── MockLocationService.ts         # Phase 1: 17 hardcoded KTM locations
│   │
│   ├── memory/
│   │   ├── sessionStore.ts                # CRUD for conversation state in PostgreSQL
│   │   ├── messageStore.ts                # CRUD for chat messages
│   │   └── constraintMerger.ts            # Merges new constraints with existing ones
│   │
│   ├── retrieval/
│   │   ├── hybridSearch.ts                # Calls PostgreSQL hybrid_search_tutors()
│   │   ├── sqlFilterBuilder.ts            # Builds SQL WHERE clauses (template-based)
│   │   └── rankingEngine.ts               # Weighted scoring algorithm
│   │
│   ├── state/
│   │   ├── stateMachine.ts                # Collect → Search → Present → Follow-up
│   │   └── states.ts                      # State handler type definitions
│   │
│   ├── types/
│   │   ├── index.ts                       # Re-exports all types
│   │   ├── constraints.types.ts           # SearchConstraints type
│   │   ├── conversation.types.ts          # SessionState, Message, Intent types
│   │   └── search.types.ts                # RankingWeights, HybridSearchResult types
│   │
│   └── utils/
│       ├── groqClient.ts                  # Groq API wrapper (for Edge Function)
│       └── supabaseClient.ts              # Supabase client (for Edge Function)
│
├── supabase/
│   ├── import_map.json                    ← 📝 Deno import map for @/ → ../ resolution
│   │
│   ├── ai/                                ← 🟢 AI Module COPY (used by Edge Function / Deno)
│   │   [Mirrors the root ai/ folder but with:]
│   │   - @/ai/ imports → ../ relative paths
│   │   - Added .ts extensions to all imports
│   │
│   ├── migrations/
│   │   ├── 001_enable_pgvector.sql        # Enables vector extension
│   │   ├── 002_create_tutors_table.sql    # Tutors table + RLS
│   │   ├── 003_create_tutor_embeddings.sql # Embeddings table + RLS
│   │   ├── 004_create_conversations.sql   # Sessions table + RLS
│   │   ├── 005_create_messages.sql        # Messages table + RLS
│   │   ├── 006_create_embedding_cache.sql # Cache table + RLS
│   │   └── 007_create_hybrid_search_function.sql  # PostgreSQL search function
│   │
│   └── functions/
│       └── chat/                          ← 🚀 Edge Function (deployed!)
│           ├── index.ts                   # Entry point (Deno.serve)
│           ├── handler.ts                 # Request routing + auth
│           ├── orchestrator.ts            # Wires all AI modules together
│           └── middleware.ts              # CORS, Firebase JWT, rate limiting
│
├── scripts/
│   ├── seedSupabaseTutors.ts              # Copies Firestore tutors → Supabase PostgreSQL
│   └── fix_imports.ts                     # Adds .ts extensions to imports for Deno compat
│
├── services/
│   └── ai/
│       ├── chatService.ts                 # Client-side API call to Edge Function
│       └── streamingClient.ts             # SSE stream parser
│
├── store/
│   └── aiChatStore.ts                     # Zustand store for chat state
│
├── hooks/
│   ├── useAiChat.ts                       # React hook for sending/receiving messages
│   └── useConversation.ts                 # Session lifecycle management
│
└── Documentation/
    └── AI ragbot/                         ← 📚 You are here
        └── COMPREHENSIVE_IMPLEMENTATION_GUIDE.md
```

---

## 4. Database: PostgreSQL + pgvector (7 Migrations)

### Why Supabase PostgreSQL Instead of Firestore?

Firestore (NoSQL) is great for real-time mobile sync but **cannot do vector similarity search**. PostgreSQL + pgvector can. So we:

- **Keep Firebase Firestore** as the source of truth for all user/tutor data
- **Sync a copy** to Supabase PostgreSQL for the AI search engine
- **Supabase Storage** was already being used for images/videos

### Migration 001: Enable pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
```
Enables the pgvector extension for storing and searching embeddings.

### Migration 002: Tutors Table

```sql
CREATE TABLE public.tutors (
  id TEXT PRIMARY KEY,
  full_name TEXT, headline TEXT, bio TEXT,
  subjects TEXT[], grades_teaching TEXT[],
  monthly_rate_npr INTEGER,
  neighborhood TEXT, city TEXT,
  latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
  rating REAL, review_count INTEGER,
  verification_status TEXT CHECK (...),
  ...
);
```

**RLS Policy:** Public read (tutor profiles are discovery data), service_role only for writes.

**Special column:** `location_text` is a **generated column** that combines neighborhood + city.

### Migration 003: Tutor Embeddings Table

```sql
CREATE TABLE public.tutor_embeddings (
  tutor_id TEXT REFERENCES tutors(id),
  embedding VECTOR(384),  -- bge-small-en-v1.5
  source_text TEXT,
  ...
);
```

**384 dimensions** — matches the `bge-small-en-v1.5` embedding model from HuggingFace.

### Migration 004: Conversations Table

Stores AI chat session state: current step, accumulated constraints, last search results.

### Migration 005: Messages Table

Stores individual chat messages. Immutable — never updated after creation.

### Migration 006: Embedding Cache Table

Caches query embeddings to avoid redundant HuggingFace API calls. Uses SHA-256 hashing (not MD5, because Web Crypto API doesn't support MD5).

### Migration 007: Hybrid Search Function (The Brain)

```sql
CREATE FUNCTION hybrid_search_tutors(
  constraints_json JSONB,
  query_embedding VECTOR(384),
  result_limit INTEGER
)
```

This function:
1. Extracts filters from JSON (subject, budget, rating, etc.)
2. Builds a dynamic SQL query with safe parameter handling
3. If embedding is provided: adds `ORDER BY embedding <=> $query_embedding` (cosine similarity)
4. If no embedding: fallback to `ORDER BY rating DESC`
5. Returns matching tutors

Called via: `supabase.rpc("hybrid_search_tutors", {...})`

---

## 5. AI Engine (25 TypeScript Files)

### 5.1 Types (`ai/types/`)

| File | Purpose | Key Types |
|------|---------|-----------|
| `constraints.types.ts` | Search constraint definitions | `SearchConstraints` — subject, budget, location, etc. |
| `conversation.types.ts` | Conversation models | `SessionState`, `Message`, `Intent`, `TutorResult` |
| `search.types.ts` | Search & ranking types | `RankingWeights`, `ScoredTutor`, `HybridSearchResult` |
| `index.ts` | Barrel exports | Re-exports everything |

### 5.2 Domain Guard (`ai/domain/`)

**`intentClassifier.ts`** — The first thing called when a message arrives:
- Sends message + history to Groq LLM
- Returns intent: `search_tutors`, `ask_knowledge_base`, `off_topic`, `greeting`, etc.
- Also extracts initial constraints (subject, budget) in the same call
- Has a `quickOffTopicCheck()` function that catches obvious off-topic patterns without an API call

**`guardrails.ts`** — Safety checks:
- `checkHallucinatedTutors()` — Verifies the bot doesn't invent tutor names
- `checkContactInfoLeak()` — Checks no phone/email is leaked
- `containsOffensiveContent()` — Blocks abusive language
- `checkPromptInjection()` — Detects "ignore previous instructions" attacks

**`prompts.ts`** — All system prompt templates. The main system prompt includes:
- Role definition (tutor discovery assistant)
- Domain boundaries (rejects coding, essays, general knowledge)
- FAQ knowledge base (12 questions about EdumentX)
- Conversation style guidelines

### 5.3 Embeddings (`ai/embeddings/`)

**`generateEmbedding.ts`** — Calls HuggingFace Serverless Inference API:
- Model: `BAAI/bge-small-en-v1.5` (384-dim, free tier)
- Caches in `embedding_cache` table via PostgreSQL functions
- Retries on 503 (model cold start) up to 2 times

**`buildEmbeddingText.ts`** — Builds rich text from tutor profile:
- Concatenates headline + bio + subjects + qualifications + location
- Makes a natural paragraph that captures teaching style

**`embeddingCache.ts`** — Two-tier caching:
- Tier 1: In-memory Map (fast, session-scoped, max 100 entries)
- Tier 2: PostgreSQL table (persistent)

### 5.4 Retrieval (`ai/retrieval/`)

**`hybridSearch.ts`** — The main search orchestrator:
1. Build query text from constraints
2. Generate embedding via HuggingFace
3. Call `hybrid_search_tutors()` via `supabase.rpc()`
4. If no results, relax constraints (fallback tiers)
5. Deduplicate and return

**`sqlFilterBuilder.ts`** — Template-based SQL builder (used by PostgreSQL function):
- **Critical rule:** SQL is NEVER generated by the LLM
- Builds WHERE clause from constraints using templates
- Prevents SQL injection

**`rankingEngine.ts`** — Weighted scoring algorithm:
```typescript
Score = 0.30 × similarity + 
        0.25 × budget_fit + 
        0.20 × rating + 
        0.15 × experience + 
        0.10 × response_rate
```
- Weights can be **dynamically adjusted** based on conversation context
- If student emphasizes budget → budget weight increases

### 5.5 Memory (`ai/memory/`)

**`sessionStore.ts`** — CRUD for conversation sessions:
- `getOrCreateSession()` — Creates or resumes a session
- `updateSessionStep()` — Moves state machine forward
- `updateSessionConstraints()` — Merges new constraints
- `storeSearchResults()` — Caches last results for follow-ups
- Sessions expire after 30 minutes of inactivity

**`messageStore.ts`** — CRUD for messages:
- Saves user & assistant messages
- Gets recent messages (last 6 for LLM context)
- Builds history string for prompts

**`constraintMerger.ts`** — Merges constraints incrementally:
```
Turn 1: "I need Maths" → { subject: "Mathematics" }
Turn 2: "Under 5000"  → { subject: "Mathematics", budget_max: 5000 }
Turn 3: "In Baneshwor" → { subject: "Mathematics", budget_max: 5000, location: "Baneshwor" }
```

### 5.6 State Machine (`ai/state/`)

**`stateMachine.ts`** — 4-state conversation flow:

```
COLLECTING → (enough info?) → SEARCHING → (has results?) → PRESENTING
  ↑                                                              │
  │                    (new criteria) ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
  │                                                              │
  └── (no results, relax constraints) ← FOLLOWUP ← (follow-up?)
```

Each state has a handler:
- **COLLECTING** — Asks questions, gathers constraints, classifies intent
- **SEARCHING** — Runs the hybrid search (quick pass-through state)
- **PRESENTING** — Shows results, handles follow-up requests
- **FOLLOWUP** — Refines existing results with new filters

### 5.7 Knowledge Base (`ai/knowledgeBase/`)

**`faq.ts`** — 12 FAQ entries covering:
- Verification (what is verified, how it works, required documents)
- Enrollment (how to book, check status)
- Recommendations (how matching works, no results)
- Account (sign up, role change)
- Privacy (data safety)
- General (what is EdumentX)

**`faqMatcher.ts`** — Keyword-based matching:
- Scores matches by keyword overlap
- Returns best FAQ answer or null

### 5.8 Location (`ai/location/`)

**`LocationService.ts`** — Interface for parallel development:
- `geocode(text)` → coordinates
- `getStudentLocation()` → student's saved location
- `calculateDistance()` → haversine formula
- `filterByRadius()` → filter tutors by distance

**`MockLocationService.ts`** — Phase 1 implementation:
- 17 hardcoded Kathmandu Valley locations
- No real geocoding API calls
- Ready to be swapped with `RealLocationService` when map teammate finishes

### 5.9 Agents (`ai/agents/`)

**`constraintExtractor.ts`** — Uses Groq LLM to extract structured constraints from messages:
- Calls LLM with current constraints + new message
- Returns updated constraints
- Has a **keyword-based fallback** if LLM call fails

**`responseGenerator.ts`** — Generates natural language responses:
- Passes ranked tutor results + constraints to Groq LLM
- Streams response back
- Falls back to a template response if LLM fails

**`tutorAgent.ts`** — Formatting utilities:
- `formatTutorResult()` → human-readable tutor description
- `formatPrice()` → "Rs 5,000"
- `isBudgetMatch()` → checks if tutor is within budget

### 5.10 Utilities (`ai/utils/`)

**`groqClient.ts`** — Groq API wrapper for Deno:
- `groqChat()` — Non-streaming completion
- `groqChatJSON()` — JSON response (for intent classification, constraint extraction)
- `groqChatStream()` — Streaming completion (for response generation)
- Uses raw `fetch()` (Deno-compatible, no npm dependency)
- Model: `llama-3.1-70b-versatile` (free tier on Groq)

**`supabaseClient.ts`** — Supabase client singleton:
- Creates client with `service_role` key
- Uses `jsr:@supabase/supabase-js@2` (Deno-compatible)
- Lazy initialization

---

## 6. Edge Function (The Server)

### Why Edge Function Instead of a Traditional Backend?

- **Zero cost** — Supabase Edge Functions are included in the free tier
- **No server to manage** — Just deploy with one command
- **Fast cold starts** — Deno is optimized for serverless
- **Same Supabase ecosystem** — Direct database access with service_role key

### Architecture

```
POST /chat
  │
  ├── CORS check
  ├── Firebase JWT verification (extracts student UID)
  ├── Rate limiting (20 req/min per user)
  ├── Request validation
  │
  ├── Get or create session
  ├── Save user message
  ├── Get recent message history
  ├── Process through state machine
  │   ├── classifyIntent() → Groq LLM
  │   ├── extractConstraints() → Groq LLM  
  │   ├── hybridSearch() → PostgreSQL function
  │   ├── rankTutors() → ranking algorithm
  │   └── generateResponse() → Groq LLM
  ├── Save assistant response
  ├── Update session state
  └── Return JSON response
```

### Files

| File | Purpose |
|------|---------|
| `index.ts` | Entry point — `Deno.serve()` handler |
| `handler.ts` | Routes request through middleware, calls orchestrator, returns response |
| `orchestrator.ts` | Ties all AI modules together (session, state machine, search) |
| `middleware.ts` | CORS headers, Firebase JWT verification, request validation, rate limiting |

### The Import Map (`supabase/import_map.json`)

```json
{
  "imports": {
    "@/ai/": "./ai/"
  }
}
```

This tells Deno: "When you see `import from "@/ai/..."`, look in `./ai/` (relative to the `supabase/` folder). This was necessary because the AI module files use `@/ai/` path aliases that Deno doesn't understand by default. The copy in `supabase/ai/` has these resolved to relative `../` paths.

### Deployment

```
npx supabase functions deploy chat
```

Deployed URL: `https://[project].supabase.co/functions/v1/chat`

---

## 7. Client-Side React Native Code

### Why New Client Code?

The existing `AIChat.tsx` screen used **canned replies** (hardcoded responses). We built the real infrastructure to connect it to the deployed Edge Function.

### Files Created

| File | Purpose |
|------|---------|
| `services/ai/chatService.ts` | `sendChatMessage()` — calls the Edge Function with Firebase auth token |
| `services/ai/streamingClient.ts` | `streamingClient()` — parses SSE events from the function |
| `store/aiChatStore.ts` | Zustand store: manages messages, loading state, errors, quick prompts |
| `hooks/useAiChat.ts` | React hook: `{ messages, sendMessage, isLoading }` |
| `hooks/useConversation.ts` | Session lifecycle: generate session ID, persist across app restarts |

### Data Flow

```
AIChat.tsx
  → useAiChat().sendMessage("I need Maths")
    → aiChatStore.sendMessage()
      → chatService.sendChatMessage(sessionId, message)
        → Fetch POST to Edge Function with Firebase JWT
          → Returns JSON { content, state, tutor_cards }
      → aiChatStore updates messages[]
  → AIChat.tsx re-renders with new messages
```

### Upcoming Work

The `AIChat.tsx` screen needs to be updated to:
1. Import `useAiChat` hook
2. Replace canned replies with `sendMessage()`
3. Show thinking indicator during loading
4. Render tutor cards from `tutor_cards` data

---

## 8. Why Two `ai/` Folders?

### The Problem

The AI module code is shared between two **completely different runtimes**:

| Runtime | Bundler | Import Style | Extensions |
|---------|---------|-------------|-----------|
| **React Native** (client app) | Metro | Supports `@/` path aliases | No `.ts` needed |
| **Edge Function** (server) | Deno | Needs relative paths `../` | Needs `.ts` extensions |

If we only had one `ai/` folder:
- The React Native app would work ✅
- But the Edge Function would fail ❌ (Deno can't resolve `@/` paths)
- OR the Edge Function would work but React Native would fail (if we added `.ts` extensions)

### The Solution: Two Copies

| Folder | Used By | Import Style |
|--------|---------|-------------|
| `ai/` (root) | **React Native app** | `@/ai/...` aliases, no `.ts` |
| `supabase/ai/` (copy) | **Edge Function** | `../` relative paths, with `.ts` |

### How to Keep Them In Sync

When you edit a file in `ai/` (root), run:
```bash
cp -r ai supabase/ai && npx ts-node scripts/fix_imports.ts
```

This:
1. Copies the root `ai/` folder over `supabase/ai/`
2. Runs the `fix_imports.ts` script to add `.ts` extensions

We can (and should) automate this into a single npm script later.

---

## 9. Scripts

### `scripts/seedSupabaseTutors.ts`

**Purpose:** Copy approved tutors from Firebase Firestore into Supabase PostgreSQL.

**What it does:**
1. Reads all tutors from Firestore `tutors/{uid}` collection via REST API
2. Filters: only `verificationStatus === "approved"` and no pending updates
3. For each tutor:
   - Builds rich text from profile (bio + subjects + qualifications)
   - Upserts tutor data into Supabase `tutors` table
   - Generates 384-dim embedding via HuggingFace
   - Upserts embedding into `tutor_embeddings` table
4. Reports progress and errors

**How to run:**
```bash
npx ts-node scripts/seedSupabaseTutors.ts
```

**Prerequisites:**
- Firebase service account JSON saved as `firebase-service-account.json` (or set `GOOGLE_APPLICATION_CREDENTIALS`)
- Or set `FIREBASE_API_KEY` env var as fallback

### `scripts/fix_imports.ts`

**Purpose:** Add `.ts` extensions to all relative imports in `supabase/ai/` for Deno compatibility.

**How it works:**
1. Walks all `.ts` files in `supabase/ai/`
2. Finds `from "../something"` patterns
3. Adds `.ts` → `from "../something.ts"`
4. Skips imports that already have `.ts`

**Why needed:** Deno requires explicit file extensions in imports. The `ai/` files were written for React Native (Metro) which doesn't need them.

---

## 10. Supabase Dashboard Setup

### Environment Secrets (Edge Function)

Set in: **Supabase Dashboard → Project Settings → Environment Variables**

| Variable | Source | Purpose |
|----------|--------|---------|
| `GROQ_API_KEY` | `EXPO_PUBLIC_GROQ_API_KEY` from `.env` | LLM calls via Groq |
| `HF_API_TOKEN` | `EXPO_PUBLIC_HF_API_TOKEN` from `.env` | Embeddings via HuggingFace |
| `FIREBASE_PROJECT_ID` | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` from `.env` | Verify Firebase JWTs |

**Note:** `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by Supabase — no need to add them.

### Database Management

| Task | Location |
|------|----------|
| Run migrations | Supabase Dashboard → SQL Editor |
| View table data | Supabase Dashboard → Table Editor |
| Monitor Edge Function | Supabase Dashboard → Edge Functions → chat → Logs |

---

## 11. What Each Service Does

| Service | Free Tier | What We Use It For | API Key Needed? |
|---------|-----------|-------------------|-----------------|
| **Firebase Auth** | Spark plan (free) | Student authentication (Email/Password, Google) | Already set |
| **Firebase Firestore** | Spark plan (free) | Source of truth for user/tutor profiles | Already set |
| **Supabase PostgreSQL** | 500 MB free | AI search database, conversation storage | Already set |
| **Supabase Storage** | 1 GB free | File uploads (avatars, docs) — pre-existing | Already set |
| **Supabase Edge Functions** | 500k invocations/mo | AI chatbot server (Deno) | Already set |
| **Groq** | 30 req/min, 1,000 req/day | LLM inference (Llama 3.1 70B) | Need `gsk_...` key |
| **HuggingFace** | Free tier | Embedding generation (bge-small-en-v1.5) | Need `hf_...` token |

---

## 12. Conversation Flow (How It Works End-to-End)

```
Student: "I need a Maths tutor under Rs 5000"
  │
  ▼
[Edge Function receives POST /chat]
  │
  ├── 1. Verify Firebase JWT (extracts student UID)
  ├── 2. Get or create session from conversations table
  ├── 3. Save user message to messages table
  ├── 4. Get last 6 messages for context
  │
  ▼
[State Machine → COLLECTING state]
  │
  ├── 5. Intent Classification (Groq LLM) → "search_tutors"
  ├── 6. Constraint Extraction (Groq LLM) → {subject: "Maths", budget_max: 5000}
  ├── 7. Check if we have enough info → Yes, proceed to search
  │
  ▼
[State Machine → SEARCHING state]
  │
  ├── 8. Build query text → "Mathematics tutor under Rs 5000 teaching help"
  ├── 9. Generate embedding (HuggingFace) → 384-dim vector
  ├── 10. Call hybrid_search_tutors() → SQL filters + vector similarity
  ├── 11. Rank results → weighted score
  │
  ▼
[State Machine → PRESENTING state]
  │
  ├── 12. Generate response (Groq LLM) → natural language
  ├── 13. Save assistant response
  ├── 14. Update session state (constraints, results, step)
  │
  ▼
[Response sent back to app]
  │
  ▼
Student sees: "I found 2 Maths tutors under Rs 5,000..."
```

---

## 13. What's Next

### Phase 4: Frontend Integration (Current)

| Task | Files | Status |
|------|-------|--------|
| Update AIChat.tsx to call Edge Function | `screens/student/AIChat.tsx` | ⏳ Pending |
| Build chat UI components | `components/chat/MessageBubble.tsx`, `components/chat/TutorCard.tsx` | ⏳ Pending |
| Wire up quick prompts | `components/chat/QuickPromptChip.tsx` | ⏳ Pending |
| Show thinking indicator | `components/chat/ThinkingIndicator.tsx` | ⏳ Pending |

### Phase 5: Refinement

- Add fallback conversation flow (relaxed constraints on empty results)
- Add feedback buttons (thumbs up/down on responses)
- Polish off-topic detection
- Improve response formatting

### Phase 6: Map Integration

After map teammate finishes:
- Swap `MockLocationService` → `RealLocationService`
- Add distance weight to ranking
- Add `ST_DWithin` geospatial filter

### Phase 7: Future Enhancements

- LangGraph state machine (if conversation flow becomes more complex)
- Nepali language support
- Enrollment via chat ("I want to enroll with this tutor")
- Voice input
- Analytics dashboard (popular searches, subject demand)

---

## 14. Troubleshooting

### Edge Function Deployment Failures

| Error | Cause | Fix |
|-------|-------|-----|
| `Module not found` | File missing from import chain | Run `cp -r ai supabase/ai && npx ts-node scripts/fix_imports.ts` |
| `Expected '{', got 'interface'` | Inline `import()` type reference | Replace with top-level `import type { ... }` |
| `@/... not prefixed with / or ./ or ../` | Import map not picked up | Convert `@/` paths to relative `../` paths |
| JWT verification fails | Wrong FIREBASE_PROJECT_ID | Check Supabase Dashboard → Environment Variables |

### API Rate Limits

| Service | Limit | What Happens |
|---------|-------|-------------|
| Groq | 30 req/min, 1,000 req/day | Returns HTTP 429 — wait and retry |
| HuggingFace | Model-dependent | Returns 503 on cold start — retry after 15s |
| Nominatim | 1 req/sec (Phase 2) | Returns 429 — cache aggressively |

### Common Issues

**Q: The chatbot responds with "I'm having trouble..."**
A: Groq API key might be invalid or rate limited. Check the Edge Function logs.

**Q: No tutors found even though they exist in Firestore**
A: Run the seed script to copy tutors from Firestore to Supabase.

**Q: Edge Function deploys but returns 500**
A: Check the function logs in Supabase Dashboard → Edge Functions → chat → Logs.

---

*End of Document*

---

*"We didn't just build a chatbot — we built a complete AI tutor-recommendation engine with intent detection, hybrid search, ranking, conversation memory, and domain guardrails. Deployed on free tier. Zero credit card required."*
