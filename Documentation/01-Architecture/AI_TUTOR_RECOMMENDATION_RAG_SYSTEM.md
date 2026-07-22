# EdumentX — AI Tutor Recommendation Chatbot: Complete Architecture & Implementation Guide

> **Status**: Design Document (Pre-Implementation)
> **Last updated**: July 17, 2026
> **Author**: AI Staff Engineer
> **Target audience**: A Computer Engineering student ready to build the system

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Why Agentic SQL + RAG (Not Pure RAG)](#2-why-agentic-sql--rag-not-pure-rag)
3. [Database Schema](#3-database-schema)
4. [Tutor Embeddings Strategy](#4-tutor-embeddings-strategy)
5. [Query Flow Pipeline](#5-query-flow-pipeline)
6. [Distance Filtering](#6-distance-filtering)
7. [Budget Filtering & Ranking Algorithm](#7-budget-filtering--ranking-algorithm)
8. [Conversation Memory](#8-conversation-memory)
9. [Agent Design (Tool-Calling)](#9-agent-design-tool-calling)
10. [LLM & Embedding Model Choices](#10-llm--embedding-model-choices)
11. [Folder Structure](#11-folder-structure)
12. [Supabase Edge Functions vs React Native vs LLM](#12-supabase-edge-functions-vs-react-native-vs-llm)
13. [Prompt Engineering](#13-prompt-engineering)
14. [Evaluation Metrics](#14-evaluation-metrics)
15. [Security](#15-security)
16. [API Design](#16-api-design)
17. [Conversation Flow Diagram](#17-conversation-flow-diagram)
18. [LangGraph Workflow](#18-langgraph-workflow)
19. [Production Deployment Plan](#19-production-deployment-plan)
20. [Step-by-Step Implementation Roadmap](#20-step-by-step-implementation-roadmap)
21. [Timeline Estimate](#21-timeline-estimate)
22. [Common Mistakes & How to Avoid Them](#22-common-mistakes--how-to-avoid-them)

---

## 1. Architecture Overview

### High-Level Architecture

```mermaid
graph TB
    subgraph "React Native Client (Expo)"
        AIChat[AIChat.tsx UI]
        ConvStore[Conversation Memory<br/>Zustand + AsyncStorage]
        ToolRegistry[Tool Calling Registry]
    end

    subgraph "Supabase Edge Functions (Deno)"
        EP[Entry Point: /chat]
        SE[Session Manager]
        OPT[Optimizer<br/>Constraint Extraction]
        RET[Retriever<br/>Hybrid Search]
        RANK[Ranking Engine]
        LLM_GATE[LLM Gateway<br/>Groq/HuggingFace]
    end

    subgraph "Supabase PostgreSQL + pgvector"
        PG[(PostgreSQL)]
        VEC[(pgvector<br/>embeddings)]
    end

    subgraph "Firebase"
        FA[Firebase Auth]
        FS[(Firestore<br/>users, tutorProfiles)]
    end

    subgraph "External LLM APIs"
        GROQ[Groq Cloud<br/>Llama 3.1 70B/8B]
        HF[HuggingFace<br/>Serverless Inference]
    end

    AIChat --> |HTTPS| EP
    EP --> SE
    SE --> OPT
    OPT --> RET
    RET --> PG
    RET --> VEC
    RET --> RANK
    RANK --> LLM_GATE
    LLM_GATE --> GROQ
    LLM_GATE --> HF
    LLM_GATE --> |Response| EP
    EP --> |Streamed Response| AIChat

    PG -.-> |Sync every 5 min| FS
```

### Why This Architecture

Your project has a **hybrid stack**: Firebase Auth + Firestore for identity and user profiles, and Supabase PostgreSQL + pgvector for structured querying and vector search. This means:

1. **Firestore** stays the source of truth for user profiles (auth, roles, verification status)
2. **Supabase PostgreSQL** becomes the search index — denormalized tutor data is synced from Firestore to Supabase
3. **pgvector** enables semantic search on tutor embeddings
4. **Edge Functions** run the orchestration (no Spark-Plan cloud functions on Firebase)
5. **Groq** provides the LLM reasoning (free tier, fast inference)

---

## 2. Why Agentic SQL + RAG (Not Pure RAG)

### Critical Evaluation

| Approach | Works for this problem? | Why |
|----------|------------------------|-----|
| **Pure RAG** | ❌ No | RAG retrieves documents by semantic similarity. Tutor search is a **structured recommendation** problem: you need exact filters on budget (numeric range), distance (geospatial), subject (exact match), and availability (boolean/time). Vector similarity alone cannot enforce `monthlyRateNpr <= 5000`. RAG would retrieve "close" tutors even when they're over budget, and you'd have to filter them out in post-processing — wasting tokens and slowing response. |
| **SQL Only** | ❌ No | SQL can handle structured filters perfectly, but cannot understand the **semantic intent** behind free-text queries like "I need someone who explains concepts patiently" or "I want a teacher who's good with struggling students." You'd miss good tutors whose bio captures the intent but uses different wording. |
| **Hybrid Search (SQL + Vector)** | ✅ **Yes** | Best of both. Vector search captures semantic matching on bio/teaching style/qualifications. SQL filters enforce hard constraints (budget, location radius, subjects, availability). Combined = high precision + high recall. |
| **Metadata Filtering with pgvector** | ✅ Yes | pgvector supports `WHERE` clauses directly on the vector query. This is the ideal approach: `SELECT * FROM tutor_embeddings WHERE monthly_rate <= 5000 AND subject ILIKE '%math%' ORDER BY embedding <=> $query_embedding LIMIT 10`. |
| **Tool Calling** | ✅ **Yes (crucial)** | The chatbot needs to **decide when to search** vs. when to ask a clarifying question. Tool calling lets the LLM say "I need to search for tutors now" vs. "I need more information first." Without tools, the LLM either hallucinates tutors or searches prematurely. |
| **Agentic Workflow (LangGraph)** | ✅ **Yes (recommended)** | The conversation has a clear state machine: collect constraints → search → present results → handle follow-ups → relax constraints on no results. LangGraph models this as a graph with explicit state transitions, which is more maintainable than a linear chain. |
| **Query Planner** | ⚠️ Overkill | A query planner (decomposing queries into sub-queries) is useful for multi-hop QA over document corpora. For tutor search, the queries are single-hop (find tutors matching these constraints). The constraint extraction + single search is simpler and more reliable. |
| **MCP (Model Context Protocol)** | ❌ Not needed | MCP is for connecting LLMs to external tools in a standardized way. Your tool surface is small (search tutors, get profile, calculate distance). Implementing MCP adds protocol overhead with no benefit. Direct tool-calling in LangGraph is simpler. |
| **Multi-step Retrieval** | ⚠️ Overkill | Multi-step (retrieve → re-rank → re-retrieve) is useful when the initial retrieval misses relevant documents. For tutor search, a single hybrid search with fallback logic covers the same ground without the complexity. |

### Recommended Architecture: **Agentic Hybrid Search with Tool Calling**

```
SQL + Vector Hybrid Search
├── Hard constraints applied via SQL WHERE clauses
│   ├── monthlyRateNpr ≤ budget (± fallback tiers)
│   ├── subjects @> ARRAY[subject]
│   ├── ST_DWithin(location, student_loc, radius)
│   └── verification_status = 'approved'
├── Soft matching via pgvector cosine similarity
│   ├── bio
│   ├── teaching_style
│   ├── qualifications
│   └── headline
├── Tool-calling LLM orchestrates
│   ├── Decides when to search vs. ask
│   ├── Extracts constraints from conversation
│   ├── Manages fallback strategy
│   └── Generates human-readable recommendations
└── LangGraph manages state
    ├── Collect → Search → Present → Follow-up
    └── Relax constraints → re-search on empty results
```

---

## 3. Database Schema

### Supabase PostgreSQL Schema

All tables live in the `public` schema of your Supabase PostgreSQL database. This is the **search index** — the source of truth remains Firestore, and a sync process keeps this denormalized.

```sql
-- ============================================================
-- 1. TUTORS TABLE (denormalized from Firestore)
-- ============================================================
CREATE TABLE tutors (
    id              TEXT PRIMARY KEY,          -- Firebase uid
    firestore_id    TEXT UNIQUE NOT NULL,      -- Same as uid, for auditing
    full_name       TEXT NOT NULL,
    username        TEXT,
    headline        TEXT,
    bio             TEXT,
    subjects        TEXT[] NOT NULL DEFAULT '{}',  -- PostgreSQL array for GIN index
    grades_teaching TEXT[] NOT NULL DEFAULT '{}',
    years_experience INTEGER DEFAULT 0,
    monthly_rate_npr INTEGER NOT NULL,         -- In NPR, integer for range queries
    teaching_style  TEXT,                      -- e.g. "patient", "exam-focused", "activity-based"
    languages       TEXT[] DEFAULT '{}',
    
    -- Location (geospatial)
    neighborhood    TEXT,
    city            TEXT,
    latitude        DOUBLE PRECISION,          -- From Nominatim geocoding
    longitude       DOUBLE PRECISION,
    location_geom   GEOGRAPHY(Point, 4326),    -- PostGIS if enabled, otherwise use lat/lng
    
    -- Verification & status
    verification_status TEXT DEFAULT 'pending',
    is_verified_professional BOOLEAN DEFAULT false,
    response_rate   INTEGER DEFAULT 0,
    
    -- Rating (denormalized from reviews collection)
    rating          DOUBLE PRECISION DEFAULT 0,
    review_count    INTEGER DEFAULT 0,
    
    -- Availability (stored as JSON for flexibility)
    availability    JSONB DEFAULT '{}',        -- e.g. {"weekdays": "evenings", "weekends": true}
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Metadata for sync
    firestore_updated_at TIMESTAMPTZ,
    synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tutors_subjects ON tutors USING GIN (subjects);
CREATE INDEX idx_tutors_city ON tutors (city);
CREATE INDEX idx_tutors_verification ON tutors (verification_status);
CREATE INDEX idx_tutors_monthly_rate ON tutors (monthly_rate_npr);
CREATE INDEX idx_tutors_rating ON tutors (rating DESC);
CREATE INDEX idx_tutors_geom ON tutors USING GIST (location_geom);  -- Only if PostGIS

-- ============================================================
-- 2. TUTOR EMBEDDINGS TABLE (pgvector)
-- ============================================================
-- Requires: CREATE EXTENSION vector;
CREATE TABLE tutor_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id        TEXT NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    
    -- Combined embedding of (headline + bio + teaching_style + subjects + qualifications)
    embedding       VECTOR(384),               -- 384 for BGE/GTE-small, 768 for BGE-large
    embedding_model TEXT DEFAULT 'BAAI/bge-small-en-v1.5',
    
    -- Metadata copied from tutors for efficient filtered search
    monthly_rate_npr INTEGER NOT NULL,
    subjects        TEXT[] NOT NULL DEFAULT '{}',
    city            TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    rating          DOUBLE PRECISION DEFAULT 0,
    verification_status TEXT DEFAULT 'pending',
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tutor_id)  -- One embedding per tutor
);

-- IVFFlat index for approximate nearest neighbor search
-- Adjust 'lists' based on data size: sqrt(n) * 2 is a good starting point
-- For 1000 tutors: lists = ~63
-- For 10000 tutors: lists = ~200
CREATE INDEX idx_embedding_ann 
ON tutor_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- ============================================================
-- 3. CONVERSATIONS TABLE
-- ============================================================
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      TEXT NOT NULL,             -- Firebase uid of student
    session_id      TEXT UNIQUE NOT NULL,      -- Client-generated session ID
    
    -- Current state (for LangGraph)
    current_state   TEXT DEFAULT 'collecting', -- collecting | searching | presenting | followup
    
    -- Extracted constraints (updated as conversation progresses)
    extracted_constraints JSONB DEFAULT '{}',
    -- Example shape:
    -- {
    --   "subject": "Mathematics",
    --   "budget_max": 5000,
    --   "location": {"neighborhood": "Baneshwor", "city": "Kathmandu"},
    --   "radius_km": 5,
    --   "gender_preference": null,
    --   "availability": null,
    --   "tutoring_mode": null,
    --   "grade_level": "10",
    --   "language": "English",
    --   "min_rating": null
    -- }
    
    -- Last search results (for follow-up refinement)
    last_search_results JSONB DEFAULT '[]',
    last_search_sql   TEXT,                    -- For debugging
    
    -- Fallback state
    fallback_attempted BOOLEAN DEFAULT false,
    fallback_level    INTEGER DEFAULT 0,       -- 0 = none, 1 = budget, 2 = distance, 3 = subject
    
    -- Timestamps
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_student ON conversations (student_id);
CREATE INDEX idx_conversations_session ON conversations (session_id);

-- ============================================================
-- 4. MESSAGE HISTORY TABLE
-- ============================================================
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content         TEXT NOT NULL,
    
    -- For tool messages
    tool_name       TEXT,
    tool_call_id    TEXT,
    tool_result     JSONB,
    
    -- Metadata
    metadata        JSONB DEFAULT '{}',        -- tokens used, latency, etc.
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at);

-- ============================================================
-- 5. RETRIEVED DOCUMENTS TABLE (for RAG audit trail)
-- ============================================================
CREATE TABLE retrieved_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id      UUID REFERENCES messages(id) ON DELETE SET NULL,
    tutor_id        TEXT NOT NULL,
    rank            INTEGER NOT NULL,          -- Position in results (1-based)
    relevance_score DOUBLE PRECISION,
    retrieval_type  TEXT DEFAULT 'hybrid',     -- vector | sql | hybrid
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_retrieved_conv ON retrieved_documents (conversation_id);

-- ============================================================
-- 6. SEARCH LOGS TABLE (for analytics + evaluation)
-- ============================================================
CREATE TABLE search_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id),
    student_id      TEXT NOT NULL,
    
    -- Input
    raw_query       TEXT NOT NULL,             -- What the student typed
    extracted_constraints JSONB,
    
    -- Query composition
    sql_query       TEXT,
    embedding_query VECTOR(384),              -- The query embedding (nullable for audit)
    
    -- Results
    result_count    INTEGER,
    result_tutor_ids TEXT[],
    
    -- Performance
    latency_ms      INTEGER,
    retrieval_model TEXT,
    
    -- Outcome
    user_clicked_profile BOOLEAN DEFAULT false,
    user_sent_message    BOOLEAN DEFAULT false,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_logs_student ON search_logs (student_id);
CREATE INDEX idx_search_logs_created ON search_logs (created_at DESC);

-- ============================================================
-- 7. FEEDBACK TABLE
-- ============================================================
CREATE TABLE feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    student_id      TEXT NOT NULL,
    
    -- Thumbs up/down on the assistant response
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback_text   TEXT,
    
    -- Granular feedback
    relevant        BOOLEAN,                   -- Were the recommendations relevant?
    accurate        BOOLEAN,                   -- Was the information accurate?
    helpful         BOOLEAN,                   -- Was the response helpful?
    
    -- Which tutors were shown
    shown_tutor_ids TEXT[],
    clicked_tutor_id TEXT,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_conversation ON feedback (conversation_id);

-- ============================================================
-- 8. FUNCTION: IVFFlat index maintenance
-- ============================================================
-- Run this periodically (e.g., after bulk inserts) to rebuild the index
-- CREATE OR REPLACE FUNCTION reindex_embeddings()
-- RETURNS void AS $$
-- BEGIN
--     REINDEX INDEX idx_embedding_ann;
-- END;
-- $$ LANGUAGE plpgsql;
```

### Sync from Firestore to Supabase

Since Firestore is the source of truth for tutor profiles, and Supabase is the search index, you need a sync mechanism:

**Option A: Supabase Edge Function (recommended for MVP)**
- Runs on a cron (via `pg_cron` or an external cron trigger like GitHub Actions)
- Reads Firestore's `tutors/{uid}` collection
- Upserts into Supabase PostgreSQL
- Runs every 5 minutes, or on-demand when a tutor updates their profile

**Option B: Webhook from Firestore**
- Use Firebase Extensions or Cloud Functions (requires Firebase Blaze)
- Not feasible on Spark plan

**Option C: Client-side sync (simplest for MVP)**
- After a tutor saves their profile in Firestore, also call a Supabase Edge Function to upsert their data
- This is what we'll do: `TutorProfileScreen.handleSubmit` → write to Firestore → call Edge Function `/sync-tutor`

---

## 4. Tutor Embeddings Strategy

### Should tutor profiles be embedded? **YES**

#### What text to embed

The embedding should capture the **semantic essence** of a tutor's profile — what makes them unique and suitable for a student's needs.

**Fields to include in the embedding text** (concatenated into a single string):

```
full_name: "Saraswoti Adhikari"
headline: "Mathematics + SEE prep · 8 yrs"
bio: "Patient, exam-focused tutor. Specialises in SEE and +2 Mathematics. Lessons in English or Nepali."
subjects: ["Mathematics"]
teaching_style: "Patient, exam-focused"
qualifications: "B.Ed in Mathematics"
languages: ["English", "Nepali"]
```

**What to exclude from embeddings** (these remain metadata filters):

| Field | Why it's metadata, not embedding |
|-------|----------------------------------|
| `monthly_rate_npr` | Numeric range — must be exact, not semantic |
| `city`, `neighborhood` | Geospatial — filtering, not matching |
| `latitude`, `longitude` | Distance calculation needs exact coordinates |
| `verification_status` | Boolean constraint — must be exact |
| `grades_teaching` | Enum matching — "Grade 10" must match exactly |
| `availability` | Boolean/time — exact match, not semantic |
| `rating` | Numeric — must be exact |
| `years_experience` | Numeric range — not semantic |
| `is_verified_professional` | Boolean filter |

#### Embedding text template

```typescript
function buildEmbeddingText(tutor: Tutor): string {
  const parts = [
    `Name: ${tutor.fullName}`,
    `Headline: ${tutor.headline}`,
    `Bio: ${tutor.bio}`,
    `Subjects: ${tutor.subjects.join(", ")}`,
    `Teaching Style: ${tutor.teachingStyle || "Not specified"}`,
    `Qualifications: ${tutor.qualifications?.join(", ") || "Not specified"}`,
    `Languages: ${tutor.languages?.join(", ") || "Not specified"}`,
  ];
  return parts.filter(Boolean).join("\n");
}
```

#### Embedding model recommendation

| Model | Dimensions | Quality | Speed | Free tier | Recommendation |
|-------|-----------|---------|-------|-----------|----------------|
| **BAAI/bge-small-en-v1.5** | **384** | **Good** | **Fast** | **HuggingFace free** | ✅ **BEST CHOICE for MVP** |
| BAAI/bge-base-en-v1.5 | 768 | Better | Slower | HuggingFace free | For Phase 2 improvements |
| BAAI/bge-large-en-v1.5 | 1024 | Best | Slowest | HuggingFace free | Overkill for this scale |
| intfloat/e5-small-v2 | 384 | Good | Fast | HuggingFace free | Good alternative |
| sentence-transformers/all-MiniLM-L6-v2 | 384 | Decent | Fastest | HuggingFace free | Too generic |
| Nomic Embed Text v1 | 768 | Good | Medium | HuggingFace free | Needs separate API |
| OpenAI text-embedding-3-small | 1536 | Excellent | Fast | **PAID** | ❌ No (budget constraint) |
| Gemini Embeddings | 768 | Excellent | Fast | **Free (60 req/min)** | Alternative for Phase 2 |

**Recommendation: Start with `BAAI/bge-small-en-v1.5` (384 dims)**

Rationale:
- 384 dimensions → faster queries, smaller index, less memory
- Good quality for tutor matching
- Available via HuggingFace Serverless Inference (free)
- Can run locally via `@xenova/transformers` on the Edge Function (no API call needed for embedding generation)
- The 384-dim vector fits in a single Supabase row without TOAST compression

#### Embedding generation strategy

**For batch embedding (initial seed):**
```bash
# Run as a Supabase Edge Function triggered by a seed script
# Uses HuggingFace Inference API or local ONNX runtime
```

```typescript
// ai/embeddings/generateEmbedding.ts
async function generateEmbedding(text: string): Promise<number[]> {
  // Option 1: HuggingFace Serverless (free, no card)
  const response = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
    {
      headers: {
        Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
    }
  );
  const result = await response.json();
  // Returns [[0.001, 0.002, ...]]  - 384 numbers
  return result[0];
}
```

**For real-time embedding (when a tutor updates their profile):**
Same function called from the `/sync-tutor` Edge Function.

#### Embedding update strategy

1. **On tutor profile update**: Re-embed and upsert `tutor_embeddings` row
2. **On tutor verification change**: Update `verification_status` in embeddings table (no re-embed needed)
3. **Bulk re-embed**: Run a scheduled job weekly to re-embed all tutors (catching any model updates)

#### Metadata filtering combined with vector search

```sql
-- The magic query: filtered vector search in one SQL statement
SELECT 
    t.id,
    t.full_name,
    t.headline,
    t.subjects,
    t.monthly_rate_npr,
    t.city,
    t.rating,
    te.embedding <=> $query_embedding AS similarity
FROM tutor_embeddings te
JOIN tutors t ON t.id = te.tutor_id
WHERE 
    -- Metadata filters (exact constraints)
    te.verification_status = 'approved'
    AND te.subjects @> ARRAY[$subject]         -- Subject overlap
    AND te.monthly_rate_npr <= $budget_max
    AND te.city ILIKE $city_pattern
    AND te.rating >= $min_rating
    -- Distance filter (Haversine)
    AND calculate_distance(
        te.latitude, te.longitude, 
        $student_lat, $student_lng
    ) <= $radius_km
ORDER BY 
    -- Combined score: similarity + metadata bonus
    te.embedding <=> $query_embedding
LIMIT 20;
```

---

## 5. Query Flow Pipeline

### Complete Execution Pipeline

```mermaid
sequenceDiagram
    participant Student
    participant AIChat as AIChat UI (RN)
    participant EF as Edge Function
    participant LLM as LLM (Groq)
    participant EMB as Embedding Service
    participant PG as PostgreSQL + pgvector
    participant MEM as Memory

    Student->>AIChat: "I need a Maths tutor under Rs 5000 near Baneshwor"
    AIChat->>EF: POST /chat { message, session_id }
    
    EF->>MEM: Get conversation state + history
    MEM-->>EF: { constraints: { subject, budget_max, city }, messages: [...] }
    
    EF->>LLM: Step 1: Intent Detection + Constraint Extraction
    Note over EF,LLM: Prompt: "Extract structured constraints from this message. Consider conversation history."
    LLM-->>EF: { intent: "search_tutors", constraints: { subject: "Mathematics", budget_max: 5000, location: "Baneshwor" } }
    
    EF->>EF: Step 2: Merge with existing constraints from memory
    Note over EF: New constraints override old ones. Unspecified fields keep previous values.
    
    EF->>EF: Step 3: Geocode location
    Note over EF: Call Nominatim: "Baneshwor, Kathmandu, Nepal" → { lat: 27.68, lng: 85.34 }
    
    EF->>EMB: Step 4: Generate query embedding
    Note over EF,EMB: "Mathematics tutor patient exam-focused teaching near Baneshwor"
    EMB-->>EF: embedding[384]
    
    EF->>PG: Step 5: Hybrid Search
    Note over EF,PG: 
    -- SQL: 
    -- SELECT t.*, te.embedding <=> $query_emb AS sim
    -- FROM tutor_embeddings te
    -- JOIN tutors t ON t.id = te.tutor_id
    -- WHERE te.subjects @> ARRAY['Mathematics']
    --   AND te.monthly_rate_npr <= 5000
    --   AND calculate_distance(...) <= 10
    --   AND te.verification_status = 'approved'
    -- ORDER BY sim
    -- LIMIT 10
    
    PG-->>EF: [tutor1, tutor2, ...]
    
    EF->>EF: Step 6: Check if results empty
    Note over EF: If count = 0, trigger fallback strategy
    alt Results empty
        EF->>EF: Step 6a: Relax constraint (e.g., budget_max → 6000)
        EF->>PG: Step 6b: Re-search with relaxed constraint
        PG-->>EF: [relaxed results]
    end
    
    EF->>EF: Step 7: Ranking
    Note over EF: Combine: similarity score + budget proximity + rating bonus + distance bonus
    
    EF->>LLM: Step 8: Generate Response
    Note over EF,LLM: Prompt: "Given these tutors and constraints, write a natural response. Mention name, subjects, rate, distance, and rating."
    LLM-->>EF: "I found 3 Maths tutors near Baneshwor under Rs 5,000..."
    
    EF->>MEM: Step 9: Update conversation + store results
    EF-->>AIChat: Streamed response
    AIChat-->>Student: Display formatted response
```

### Each Stage Explained

#### Stage 1: Intent Detection

The LLM classifies the user's message into one of these intents:

| Intent | Example | Action |
|--------|---------|--------|
| `search_tutors` | "I need a Maths tutor" | Extract constraints, search |
| `refine_search` | "What about under 5000?" | Override specific constraint, re-search |
| `ask_clarification` | "How do I enroll?" | Answer from FAQ/knowledge base |
| `compare_tutors` | "Which one has better ratings?" | Compare retrieved tutors |
| `view_profile` | "Tell me more about Saraswoti" | Fetch full profile |
| `book_tutor` | "I want to book Ramesh" | Initiate enrollment flow |
| `greeting` | "Hi" | Respond with greeting + prompt |
| `off_topic` | "What's the weather?" | Politely redirect |

#### Stage 2: Constraint Extraction

The LLM extracts structured constraints from the message + conversation history:

```typescript
type Constraints = {
  subject?: string;           // "Mathematics", "Physics", "English"
  budget_max?: number;        // 5000
  budget_min?: number;        // Optional
  location?: {                 // "Baneshwor, Kathmandu"
    neighborhood?: string;
    city?: string;
  };
  radius_km?: number;         // 5 (default from location presence)
  gender_preference?: "male" | "female" | null;
  availability?: string;       // "weekends", "evenings", "weekdays"
  tutoring_mode?: "online" | "home_tuition" | null;
  grade_level?: string;        // "10", "11", "12"
  language?: string;           // "English", "Nepali"
  min_rating?: number;         // 4.0
  min_experience?: number;     // 3
  verified_only?: boolean;     // true
  max_distance_km?: number;    // 5
};
```

#### Stage 3: Metadata Filter Construction

The constraints are converted into SQL WHERE clauses:

```typescript
function buildWhereClause(constraints: Constraints): string {
  const conditions: string[] = [
    "te.verification_status = 'approved'",
    "t.is_verified_professional = true",
  ];

  if (constraints.subject) {
    conditions.push(`te.subjects @> ARRAY['${escapeSql(constraints.subject)}']`);
  }

  if (constraints.budget_max) {
    conditions.push(`te.monthly_rate_npr <= ${constraints.budget_max}`);
  }

  if (constraints.budget_min) {
    conditions.push(`te.monthly_rate_npr >= ${constraints.budget_min}`);
  }

  if (constraints.city) {
    conditions.push(`t.city ILIKE '%${escapeSql(constraints.city)}%'`);
  }

  if (constraints.min_rating) {
    conditions.push(`te.rating >= ${constraints.min_rating}`);
  }

  if (constraints.language) {
    conditions.push(`t.languages @> ARRAY['${escapeSql(constraints.language)}']`);
  }

  if (constraints.grade_level) {
    conditions.push(`t.grades_teaching @> ARRAY['${escapeSql(constraints.grade_level)}']`);
  }

  return conditions.join(" AND ");
}
```

#### Stage 4: Vector Search

The query embedding is compared against all tutor embeddings using cosine similarity:

```sql
te.embedding <=> $query_embedding AS similarity
```

This returns a `similarity` score from 0 (identical) to 2 (opposite). Lower = more similar.

#### Stage 5: SQL Filtering

The vector search and SQL filtering happen in **one query** (thanks to pgvector's filter support):

```sql
SELECT 
    t.id, t.full_name, t.headline, t.subjects, 
    t.monthly_rate_npr, t.city, t.rating,
    t.latitude, t.longitude,
    te.embedding <=> $query_embedding AS similarity
FROM tutor_embeddings te
JOIN tutors t ON t.id = te.tutor_id
WHERE ${whereClause}
ORDER BY similarity
LIMIT 20;
```

#### Stage 6: Distance Calculation

If the student specified a location, filter by distance:

```sql
-- Haversine formula implementation in PostgreSQL
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    R DOUBLE PRECISION := 6371; -- Earth's radius in km
    dlat DOUBLE PRECISION;
    dlon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat / 2)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2)^2;
    c := 2 * asin(sqrt(a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

Then add to WHERE clause:
```sql
AND calculate_distance(te.latitude, te.longitude, $student_lat, $student_lng) <= $radius_km
```

#### Stage 7: Ranking

The final ranking combines multiple factors (see §7 for the formula).

#### Stage 8: Context Building

Build the LLM prompt context with retrieved tutors:

```typescript
function buildTutorContext(tutors: ScoredTutor[]): string {
  return tutors
    .map((t, i) => 
      `[${i + 1}] ${t.fullName}
  - Subjects: ${t.subjects.join(", ")}
  - Rate: Rs ${t.monthly_rate_npr}/month
  - Location: ${t.neighborhood}, ${t.city}
  - Rating: ${t.rating}/5 (${t.review_count} reviews)
  - Distance: ${t.distance_km.toFixed(1)} km
  - Headline: ${t.headline}
  - Bio: ${t.bio}`
    )
    .join("\n\n");
}
```

#### Stage 9: LLM Response Generation

The LLM receives the system prompt + constraints + tutor context + conversation history, and generates a natural response.

#### Stage 10: Conversation Memory Update

The conversation state is updated with the new constraints, search results, and response.

---

## 6. Distance Filtering

### Production Approach

| Approach | Works? | Recommendation |
|----------|--------|----------------|
| **PostGIS** | ✅ Yes | Best for production. Full geospatial support, spatial indexes, ST_DWithin, etc. Requires enabling PostGIS extension on Supabase. Very fast with GIST index. |
| **pgvector + Haversine function** | ✅ Yes | Good enough for MVP. Define `calculate_distance()` as a PL/pgSQL function. Works without PostGIS. Slower on large datasets but fine for <10K tutors. |
| **Client-side Haversine** | ❌ No | Filtering happens after database fetch — you fetch all tutors and filter on the client. Doesn't scale. |
| **Supabase Edge Function** | ⚠️ Partial | Edge Function runs the SQL query. The distance calculation itself should be in SQL (either PostGIS or Haversine). Edge Function just orchestrates. |

### Recommendation: **Haversine via PL/pgSQL for MVP, PostGIS for production**

**MVP (Phase 1):**
```sql
-- Haversine as a PostgreSQL function (no PostGIS needed)
CREATE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
    SELECT 6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat2 - lat1) / 2), 2) +
        COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
        POWER(SIN(RADIANS(lon2 - lon1) / 2), 2)
    ));
$$ LANGUAGE SQL IMMUTABLE;
```

**Production (Phase 2, when tutor count > 5000):**
Enable PostGIS on Supabase (`CREATE EXTENSION postgis;`) and use:
```sql
-- PostGIS: much faster with GIST spatial index
CREATE INDEX idx_tutors_geom ON tutors USING GIST (location_geom);

-- Query
SELECT *
FROM tutors
WHERE ST_DWithin(
    location_geom,
    ST_SetSRID(ST_MakePoint($lon, $lat), 4326),
    $radius_km * 1000  -- ST_DWithin uses meters
);
```

### Geocoding flow for student location

1. Student types "near Baneshwor" or "near [neighborhood], [city]"
2. Edge Function calls Nominatim: `https://nominatim.openstreetmap.org/search?q=Baneshwor,+Kathmandu&format=json&limit=1`
3. Returns lat/lng + display name
4. Store lat/lng in the conversation constraints
5. Use in the distance WHERE clause

### Important: Rate-limit Nominatim

Nominatim has a 1 request/second limit. **Always cache geocoding results** in a `geocoding_cache` table:

```sql
CREATE TABLE geocoding_cache (
    query_hash TEXT PRIMARY KEY,  -- MD5 hash of query string
    query_text TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Budget Filtering & Ranking Algorithm

### Budget Filtering Strategy

#### Exact Match
```sql
WHERE te.monthly_rate_npr <= $budget_max
  AND te.monthly_rate_npr >= $budget_min  -- if specified
```

#### Near Match (Fallback)
```sql
-- If exact match returns 0 results, try relaxed:
WHERE te.monthly_rate_npr <= $budget_max * 1.5  -- 50% over budget
   OR te.monthly_rate_npr BETWEEN $budget_max AND $budget_max * 1.5
```

#### Fallback Tiers

| Tier | Budget | Distance | Subject | Why this order |
|------|--------|----------|---------|----------------|
| 0 (exact) | ≤ 5000 | ≤ 5 km | Exact | Ideal |
| 1 | ≤ 6000 | ≤ 5 km | Exact | Budget is the most flexible constraint for most students |
| 2 | ≤ 5000 | ≤ 10 km | Exact | Distance second — students often willing to travel a bit more |
| 3 | ≤ 6000 | ≤ 10 km | Exact | Combined relaxation |
| 4 | ≤ 5000 | ≤ 5 km | Related | Broaden subject if nothing works (e.g., "Applied Math" instead of "Pure Math") |
| 5 | ≤ 10000 | Any | Any | Maximum relaxation — show nearest matches regardless |

### Ranking Formula

```typescript
function calculateScore(
  tutor: Tutor,
  query: Constraints,
  similarity: number
): number {
  // Normalize all factors to 0-1 range
  const SIM_WEIGHT = 0.30;       // Semantic match weight
  const BUDGET_WEIGHT = 0.25;    // Budget proximity
  const DISTANCE_WEIGHT = 0.20;  // Distance proximity
  const RATING_WEIGHT = 0.15;    // Rating weight
  const EXPERIENCE_WEIGHT = 0.10; // Experience weight

  // 1. Cosine similarity (converted to 0-1 where 1 = most similar)
  const simScore = 1 - (similarity / 2);  // similarity is 0-2 (cosine distance)

  // 2. Budget proximity score
  // Perfect match: score = 1.0
  // 50% over budget: score = 0.5
  // 100% over budget: score = 0.0
  const budgetRatio = tutor.monthly_rate_npr / (query.budget_max || tutor.monthly_rate_npr);
  const budgetScore = budgetRatio <= 1 
    ? 1.0 
    : Math.max(0, 1 - (budgetRatio - 1) * 2);

  // 3. Distance score
  // 0 km from student: score = 1.0
  // At exactly max radius: score = 0.5
  // Beyond 2x max radius: score = 0.0
  const maxRadius = query.radius_km || 10;
  const distanceScore = tutor.distance_km !== undefined
    ? Math.max(0, 1 - (tutor.distance_km / (maxRadius * 2)))
    : 0.5; // Default if no location constraint

  // 4. Rating score (linear: 0-5 mapped to 0-1)
  const ratingScore = (tutor.rating || 0) / 5;

  // 5. Experience score (capped at 10 years)
  const experienceScore = Math.min((tutor.years_experience || 0) / 10, 1);

  // Weighted combination
  return (
    SIM_WEIGHT * simScore +
    BUDGET_WEIGHT * budgetScore +
    DISTANCE_WEIGHT * distanceScore +
    RATING_WEIGHT * ratingScore +
    EXPERIENCE_WEIGHT * experienceScore
  );
}
```

### Why This Weight Distribution

1. **Semantic match (30%)** — Most important. A tutor whose teaching style matches the student's needs is better than a closer/cheaper one
2. **Budget (25%)** — Very important for students in Nepal. Many have strict budgets
3. **Distance (20%)** — Important for home tuition, less for online
4. **Rating (15%)** — Quality signal, but less important than constraints
5. **Experience (10%)** — Weakest signal. New tutors can be excellent

**The weights should be dynamic** based on the conversation:
- If student says "preferably within 2 km" → increase DISTANCE_WEIGHT
- If student says "I don't care about distance, only budget" → decrease DISTANCE_WEIGHT, increase BUDGET_WEIGHT
- If student says "Top rated only" → increase RATING_WEIGHT

---

## 8. Conversation Memory

### Architecture: **LangGraph State Machine + Message History**

The conversation memory uses **three layers**:

#### Layer 1: Short-term (Within Session) — LangGraph State

The LangGraph state carries:
```typescript
type ConversationState = {
  // Current step in the conversation flow
  step: "collecting" | "searching" | "presenting" | "followup" | "booked";
  
  // Extracted constraints (accumulated across turns)
  constraints: Constraints;
  
  // Last search results
  lastResults: TutorResult[];
  lastResultCount: number;
  
  // Fallback state
  fallbackLevel: number;
  
  // Which constraints have been modified in this session
  modifiedConstraints: Set<string>;
  
  // Student profile (cached)
  studentInfo?: {
    grade?: string;
    preferredLocation?: { lat: number; lng: number };
  };
};
```

#### Layer 2: Medium-term (Within Conversation) — Message History

Stored in the `messages` table. The last N messages (configurable, default 10) are included in the LLM prompt as context.

```typescript
// Messages included in the prompt
const recentMessages = messages.slice(-10);
```

#### Layer 3: Long-term (Across Sessions) — Summary Memory

When a conversation ends (or exceeds N messages), generate a summary and store it:
```typescript
type ConversationSummary = {
  studentId: string;
  preferredSubjects: string[];
  typicalBudget: number;
  preferredLocation: string;
  pastSearchResults: string[]; // tutor IDs they've interacted with
};
```

This summary is injected into the system prompt for future conversations with the same student.

### Why LangGraph State + Message History?

| Approach | Recommendation | Why |
|----------|----------------|-----|
| **LangGraph State** | ✅ **Yes (primary)** | Explicit state transitions prevent the LLM from getting confused about where in the flow the conversation is. "I need a tutor" → state = collecting → LLM knows to ask for more info. "Show me female tutors" → state = followup → LLM knows to apply filter to existing results. |
| **Message History** | ✅ Yes (supplement) | Raw conversation history is needed for the LLM to understand the full context. Includes system messages, tool calls, and results. |
| **Summary Memory** | ✅ Yes (future) | Helps personalize across sessions. Not critical for MVP. |
| **Vector Memory** | ❌ Overkill | Vector memory (storing conversation embeddings) is useful for open-domain chatbots. For a narrow domain (tutor search), state + message history is sufficient. |
| **State Machine only** | ❌ Not enough | Without message history, the LLM loses the raw conversation context and produces generic responses. |

---

## 9. Agent Design (Tool-Calling)

### Tool Architecture

The LLM (via LangGraph) has access to these tools:

```typescript
// ============================================================
// TOOL 1: search_tutors
// ============================================================
{
  name: "search_tutors",
  description: "Search for tutors matching specified criteria. Returns tutor profiles with scores.",
  parameters: {
    type: "object",
    properties: {
      subject: { type: "string", description: "Subject to search for" },
      budget_max: { type: "number", description: "Maximum monthly rate in NPR" },
      budget_min: { type: "number", description: "Minimum monthly rate in NPR" },
      city: { type: "string", description: "City or neighborhood name" },
      radius_km: { type: "number", description: "Search radius in kilometers" },
      min_rating: { type: "number", description: "Minimum rating (0-5)" },
      gender: { type: "string", enum: ["male", "female"] },
      availability: { type: "string", description: "When the student is available" },
      mode: { type: "string", enum: ["online", "home_tuition"] },
      grade_level: { type: "string" },
      language: { type: "string" },
      min_experience: { type: "number" },
      verified_only: { type: "boolean" },
      query_text: { type: "string", description: "Free-text query for semantic search" },
    },
    required: ["query_text"],
  },
}

// ============================================================
// TOOL 2: get_tutor_profile
// ============================================================
{
  name: "get_tutor_profile",
  description: "Get detailed profile information for a specific tutor.",
  parameters: {
    type: "object",
    properties: {
      tutor_id: { type: "string", description: "The tutor's unique ID" },
    },
    required: ["tutor_id"],
  },
}

// ============================================================
// TOOL 3: calculate_distance
// ============================================================
{
  name: "calculate_distance",
  description: "Calculate distance between the student and a tutor.",
  parameters: {
    type: "object",
    properties: {
      tutor_id: { type: "string" },
      student_lat: { type: "number" },
      student_lng: { type: "number" },
    },
    required: ["tutor_id", "student_lat", "student_lng"],
  },
}

// ============================================================
// TOOL 4: compare_tutors
// ============================================================
{
  name: "compare_tutors",
  description: "Compare multiple tutors side by side on selected criteria.",
  parameters: {
    type: "object",
    properties: {
      tutor_ids: { type: "array", items: { type: "string" } },
      criteria: { type: "array", items: { type: "string" }, description: "Criteria to compare" },
    },
    required: ["tutor_ids"],
  },
}

// ============================================================
// TOOL 5: enroll_with_tutor
// ============================================================
{
  name: "enroll_with_tutor",
  description: "Initiate an enrollment request with a tutor.",
  parameters: {
    type: "object",
    properties: {
      tutor_id: { type: "string" },
      subject: { type: "string" },
      message: { type: "string", description: "Message to the tutor" },
    },
    required: ["tutor_id", "subject"],
  },
}

// ============================================================
// TOOL 6: ask_clarification
// ============================================================
{
  name: "ask_clarification",
  description: "Ask the student for more information before searching.",
  parameters: {
    type: "object",
    properties: {
      question: { type: "string", description: "The question to ask the student" },
      missing_fields: { 
        type: "array", 
        items: { type: "string", enum: ["subject", "budget", "location", "grade", "availability"] },
      },
    },
    required: ["question"],
  },
}
```

### Why Tool-Calling?

Without tools, the LLM would have to:
1. Decide when to search (bad — it might search prematurely or not at all)
2. Construct SQL queries itself (dangerous — SQL injection risk)
3. Remember all tutor data in context (impossible — token limits)

With tools:
1. The LLM calls `search_tutors` ONLY when it has enough constraints
2. If constraints are missing, it calls `ask_clarification`
3. The search is handled by the Edge Function (safe, fast, deterministic)
4. Results are inserted into context for the response generation

---

## 10. LLM & Embedding Model Choices

### LLM Recommendations

| Model | Provider | Free Tier | Quality | Speed | Recommendation |
|-------|----------|-----------|---------|-------|----------------|
| **Llama 3.1 70B** | **Groq** | **Free (30 req/min, 6K/min)** | **Excellent** | **Fast (<1s)** | ✅ **BEST CHOICE** |
| Llama 3.1 8B | Groq | Free | Good | Very fast | ✅ Fallback for simple tasks |
| Mixtral 8x7B | Groq | Free | Very good | Fast | ✅ Good alternative |
| Gemma 2 9B | Groq | Free | Good | Fast | ⚠️ Alternative |
| **Llama 3.1 70B** | HuggingFace | Free (Serverless) | Excellent | Slow (cold start) | ⚠️ Backup |
| Mistral 7B | HuggingFace | Free | Good | Slow | ⚠️ Too slow for chat |
| GPT-4o-mini | OpenAI | **PAID** | Excellent | Fast | ❌ No (paid) |
| Claude 3 Haiku | Anthropic | **PAID** | Excellent | Fast | ❌ No (paid) |
| Gemini 1.5 Flash | Google | Free (60 req/min) | Very good | Fast | ✅ Good alternative |

### Recommendation: Groq + Llama 3.1 70B (primary), with Llama 3.1 8B (fast fallback)

- **Reasoning + recommendations**: Llama 3.1 70B (high quality, still free)
- **Constraint extraction**: Llama 3.1 8B (fast, good enough for structured output)
- **Embedding**: BAAI/bge-small-en-v1.5 via HuggingFace

### Embedding Model Comparison

| Model | Dims | MTEB Score | Speed | Free | Recommendation |
|-------|------|-----------|-------|------|----------------|
| bge-small-en-v1.5 | 384 | 61.0 | Fast | ✅ HF Free | ✅ **MVP** |
| bge-base-en-v1.5 | 768 | 63.4 | Medium | ✅ HF Free | ✅ **Production** |
| bge-large-en-v1.5 | 1024 | 64.2 | Slow | ✅ HF Free | ❌ Overkill |
| e5-small-v2 | 384 | 60.5 | Fast | ✅ HF Free | ⚠️ Alternative |
| all-MiniLM-L6-v2 | 384 | 58.8 | Fastest | ✅ HF Free | ⚠️ Less accurate |
| nomic-embed-text-v1 | 768 | 62.3 | Medium | ✅ HF Free | ⚠️ Good but less tested |
| text-embedding-3-small | 1536 | 62.3 | Fast | ❌ Paid | N/A |

---

## 11. Folder Structure

```
edumentx/
├── ai/                                    # AI subsystem (the entire RAG system)
│   ├── README.md
│   │
│   ├── agents/                            # LangGraph agent definitions
│   │   ├── tutorAgent.ts                  # Main tutor recommendation agent
│   │   ├── constraintAgent.ts             # Constraint extraction agent
│   │   ├── searchAgent.ts                 # Search execution agent
│   │   └── fallbackAgent.ts              # Fallback strategy agent
│   │
│   ├── retriever/                         # Retrieval logic
│   │   ├── hybridSearch.ts               # Main hybrid search function
│   │   ├── vectorSearch.ts               # Pure pgvector search
│   │   ├── sqlFilter.ts                  # SQL filter builder
│   │   ├── queryComposer.ts             # Full query composition
│   │   └── rankingEngine.ts             # Scoring and ranking
│   │
│   ├── embeddings/                        # Embedding generation
│   │   ├── generateEmbedding.ts          # Embed text via HuggingFace API
│   │   ├── buildEmbeddingText.ts         # Build text from tutor profile
│   │   ├── batchEmbedTutors.ts           # Batch re-embedding script
│   │   └── embeddingConfig.ts            # Model config, dims, etc.
│   │
│   ├── tools/                             # Tool definitions (for LLM)
│   │   ├── searchTutors.tool.ts
│   │   ├── getTutorProfile.tool.ts
│   │   ├── calculateDistance.tool.ts
│   │   ├── compareTutors.tool.ts
│   │   ├── enrollWithTutor.tool.ts
│   │   └── askClarification.tool.ts
│   │
│   ├── memory/                            # Conversation memory
│   │   ├── conversationStore.ts           # Supabase CRUD for conversations
│   │   ├── messageStore.ts               # Message history CRUD
│   │   ├── summaryStore.ts               # Long-term summary storage
│   │   └── constraintMerger.ts           # Merge old + new constraints
│   │
│   ├── prompts/                           # All prompt templates
│   │   ├── system.prompt.ts               # Main system prompt
│   │   ├── chat.prompt.ts                 # Chat response generation
│   │   ├── constraintExtraction.prompt.ts # Constraint extraction
│   │   ├── recommendation.prompt.ts       # Tutor recommendation
│   │   ├── fallback.prompt.ts             # Fallback explanation
│   │   ├── safety.prompt.ts               # Safety guardrails
│   │   └── greeting.prompt.ts             # Initial greeting
│   │
│   ├── evaluation/                        # Evaluation framework
│   │   ├── goldenDataset.ts              # Test queries + expected results
│   │   ├── metrics.ts                    # Precision@k, Recall, MRR, etc.
│   │   ├── runEvaluation.ts             # Run evaluation suite
│   │   └── reportGenerator.ts           # Generate evaluation report
│   │
│   ├── types/                             # AI-specific types
│   │   ├── index.ts                      # Re-export all types
│   │   ├── constraints.types.ts
│   │   ├── conversation.types.ts
│   │   ├── search.types.ts
│   │   ├── ranking.types.ts
│   │   └── tools.types.ts
│   │
│   └── utils/
│       ├── geocode.ts                     # Nominatim geocoding
│       ├── haversine.ts                   # Distance calculation
│       ├── supabaseClient.ts             # Supabase client for AI service
│       └── envConfig.ts                  # Environment variable access
│
├── supabase/
│   ├── functions/
│   │   ├── chat/                          # MAIN EDGE FUNCTION
│   │   │   ├── index.ts                  # Entry point: POST /chat
│   │   │   ├── handler.ts               # Request routing
│   │   │   ├── orchestrator.ts          # LangGraph orchestration
│   │   │   ├── middleware.ts            # Auth, rate limiting, logging
│   │   │   └── types.ts                 # Function-specific types
│   │   │
│   │   ├── sync-tutor/                   # Sync tutor from Firestore → Supabase
│   │   │   ├── index.ts
│   │   │   └── sync.ts
│   │   │
│   │   └── embed-tutor/                  # Generate + store tutor embedding
│   │       ├── index.ts
│   │       └── embed.ts
│   │
│   └── migrations/
│       ├── 001_enable_pgvector.sql
│       ├── 002_create_tutors_table.sql
│       ├── 003_create_embeddings_table.sql
│       ├── 004_create_conversations_table.sql
│       ├── 005_create_messages_table.sql
│       ├── 006_create_search_logs.sql
│       ├── 007_create_feedback_table.sql
│       ├── 008_create_geocoding_cache.sql
│       └── 009_create_haversine_function.sql
│
├── services/
│   ├── ai/
│   │   ├── chatService.ts                # Client-side chat API calls
│   │   ├── streamingClient.ts            # SSE stream parser
│   │   └── groqClient.ts                # Groq API wrapper (if needed client-side)
│   │
│   └── nominatim/
│       ├── geocode.ts                    # Geocoding for locations
│       └── cache.ts                     # Geocoding cache
│
├── screens/
│   └── student/
│       └── AIChat.tsx                    # Updated AI Chat UI
│
├── components/
│   └── chat/
│       ├── MessageBubble.tsx            # Enhanced message bubble
│       ├── TutorCard.tsx                # Inline tutor card (in chat)
│       ├── QuickPromptChip.tsx          # Quick action chips
│       ├── TypingIndicator.tsx          # Typing indicator
│       ├── FeedbackButtons.tsx          # Thumbs up/down
│       └── ProfileCard.tsx             # Expandable tutor profile
│
├── store/
│   └── aiChatStore.ts                   # Client-side chat state (Zustand)
│
├── hooks/
│   ├── useAiChat.ts                     # Chat hook (send msg, stream response)
│   ├── useConversation.ts              # Conversation management
│   └── useStreamingResponse.ts         # SSE streaming hook
│
└── __tests__/
    └── ai/
        ├── retriever.test.ts
        ├── ranking.test.ts
        ├── constraints.test.ts
        └── conversation.test.ts
```

---

## 12. Supabase Edge Functions vs React Native vs LLM

### What goes where

| Logic | Location | Why |
|-------|----------|-----|
| **Chat orchestration** | Edge Function | Needs to orchestrate multiple services (LLM, DB, embedding). Cannot run on client (API keys would be exposed). |
| **Conversation state management** | Edge Function | Centralized state needed for multi-turn conversations. Client state is just UI sync. |
| **Constraint extraction (LLM call)** | Edge Function | LLM API key must be server-side. |
| **Tutor context building** | Edge Function | Database queries + LLM prompt assembly belongs on the server. |
| **Response generation (LLM call)** | Edge Function | Same as above — API key security. |
| **Vector search query** | Edge Function | PostgreSQL queries must be server-side. The Edge Function has access to service_role key for the DB. |
| **Geocoding** | Edge Function | Nominatim rate limiting and caching should be centralized. |
| **Ranking calculation** | Edge Function | Python-level ranking math runs here (or in PostgreSQL if using PL/pgSQL functions). |
| **UI rendering** | React Native | All UI belongs on the client. |
| **Message input handling** | React Native | Typing, validation, send button. |
| **Quick chip actions** | React Native | Client-side UI only. |
| **Local chat history cache** | React Native | Zustand + AsyncStorage for offline resilience. |
| **Streaming response display** | React Native | Parse SSE stream, render tokens as they arrive. |
| **Final response generation** | LLM | The LLM generates the natural language response. |
| **Constraint extraction** | LLM | The LLM understands natural language and extracts structured data. |
| **Fallback decision** | LLM (guided by system prompt) | The LLM decides when to apply fallback, guided by the system prompt. |
| **Intent classification** | LLM | Natural language understanding is the LLM's job. |
| **SQL query generation** | ❌ NOT the LLM | Never let the LLM generate SQL. SQL injection risk. Use template-based SQL with sanitized parameters. |
| **Distance calculation** | PostgreSQL | Haversine function in SQL is faster than fetching all data and calculating client-side. |

### Data flow summary

```
[User Message] 
    → React Native (send + show typing indicator)
        → Edge Function /chat (authenticate, get session)
            → LLM: extract constraints
            → PostgreSQL: hybrid search
            → LLM: generate response
            → PostgreSQL: save conversation
        → React Native (stream response, show messages)
    → User sees response
```

---

## 13. Prompt Engineering

### System Prompt

```typescript
// ai/prompts/system.prompt.ts
export const SYSTEM_PROMPT = `You are EdumentX AI, an intelligent tutor matching assistant for the EdumentX platform in Nepal.

## Your Role
You help students find the right tutor by understanding their needs and searching the tutor database. You do NOT make up tutors — every recommendation comes from a database search.

## Conversation Flow
1. FIRST: Collect key information (subject, budget, location, grade).
2. THEN: Search for tutors.
3. THEN: Present results in a helpful, conversational way.
4. FINALLY: Offer to refine or take action (compare, enroll).

## Critical Rules
- NEVER invent tutor profiles. Only discuss tutors returned by the search_tutors tool.
- NEVER share students' personal information with tutors.
- NEVER make promises about tutor availability or pricing — this can change.
- ALWAYS use Rs/NPR for pricing. The currency is Nepali Rupee.
- BE CONVERSATIONAL: Don't sound like a robot listing filters. Ask natural follow-up questions.
- BE HONEST: If no tutors match, say so and suggest alternatives.
- BE CONCISE: Students want quick answers. Don't over-explain.
- HANDLE NEPALI LOCATIONS: Know Kathmandu Valley neighborhoods (Baneshwor, Baluwatar, Patan, Bhaktapur, etc.).

## When You Don't Have Enough Information
Call the ask_clarification tool. Ask for what's missing:
- "What subject are you looking for help with?"
- "Do you have a monthly budget in mind?"
- "Which area are you located in?"
- "What grade or level is this for?"
- "Do you prefer home tuition or online classes?"

## When Presenting Results
Format naturally:
"I found {N} tutors who teach {subject} {within your budget} {near {location}}:"
Then briefly describe each with: name, headline, rate, distance (if relevant), rating.
End with: "Would you like me to tell you more about any of them? Or shall I narrow down by something else?"
`;
```

### Constraint Extraction Prompt

```typescript
// ai/prompts/constraintExtraction.prompt.ts
export const CONSTRAINT_EXTRACTION_PROMPT = `
Extract structured tutor search constraints from the user's message.

Consider the conversation history — the user may be adding or changing specific constraints.

Conversation History (recent messages):
{{MESSAGES}}

Current existing constraints:
{{EXISTING_CONSTRAINTS}}

User message: {{USER_MESSAGE}}

Return a JSON object with ONLY the fields that are explicitly mentioned or implied. 
If no value for a field, omit it (don't include null).

Fields:
- subject: The subject/topic they want tutoring in (e.g., "Mathematics", "Physics", "English")
- budget_max: Maximum monthly budget in NPR (number, not string)
- budget_min: Minimum monthly budget in NPR (if specified)
- location_text: Location text (e.g., "Baneshwor", "Kathmandu", "near Baneshwor")
- radius_km: Search radius in kilometers (if specified)
- gender_preference: "male" or "female" or null (if specified)
- availability: When they need tutoring (e.g., "evenings", "weekends", "weekdays")
- tutoring_mode: "online" or "home_tuition" or null
- grade_level: Grade or class level (e.g., "10", "11", "12", "+2")
- language: Preferred teaching language (e.g., "English", "Nepali")
- min_rating: Minimum rating (1-5)
- min_experience: Minimum years of experience
- verified_only: true or false, default true
- query_text: A free-text search query describing what they want. Combine subject + any teaching style or preferences they mention.

Examples:
"I need a Maths tutor" → { "subject": "Mathematics", "query_text": "Mathematics tutor" }
"Physics under 5000" → { "subject": "Physics", "budget_max": 5000, "query_text": "Physics tutor affordable" }
"I want a female English tutor near Baneshwor" → { "subject": "English", "gender_preference": "female", "location_text": "Baneshwor", "query_text": "English tutor female Baneshwor" }
"I need someone for Grade 10 Science, budget Rs 3000" → { "subject": "Science", "grade_level": "10", "budget_max": 3000, "query_text": "Science tutor Grade 10" }
"Show only female tutors" (after previously searching for Maths) → { "gender_preference": "female" }
`;
```

### Recommendation Prompt

```typescript
// ai/prompts/recommendation.prompt.ts
export const RECOMMENDATION_PROMPT = `
You are recommending tutors to a student.

## Search Results
{{SEARCH_RESULTS}}

## Student's Requirements
{{CONSTRAINTS}}

## Instructions
1. Present the tutors in a natural, conversational way. Don't just list them.
2. For each tutor, mention:
   - Their name (highlight it)
   - What they teach (subjects)
   - Their rate (Rs/month)
   - Their rating (if notable, e.g., "4.9 stars from 81 reviews")
   - Distance from the student (if location was specified)
   - One standout thing from their bio
3. If only 1-2 tutors match, go into more detail.
4. If 3+ tutors match, give a brief overview and ask if they want details.
5. Always end with a suggestion: narrow down, compare, or enroll.

## Important
- Format rates as "Rs {{amount}}" (e.g., "Rs 5,000")
- Use Nepali-style formatting for large numbers
- Be encouraging but honest
`;
```

### Fallback Prompt

```typescript
// ai/prompts/fallback.prompt.ts
export const FALLBACK_PROMPT = `
The initial search returned NO results for:
{{CONSTRAINTS}}

The system automatically tried relaxed versions:
{{FALLBACK_ATTEMPTS}}

And found these tutors:
{{FALLBACK_RESULTS}}

## Instructions
Present the results honestly but helpfully:
1. Acknowledge the original constraint that couldn't be met
2. Explain what was adjusted (e.g., "I couldn't find tutors under Rs 5,000, so I expanded the search to Rs 6,000")
3. Show the alternative tutors
4. Ask if the adjusted constraints work for them

Examples:
Good: "I couldn't find any Maths tutors under Rs 3,000. However, here are some tutors charging between Rs 3,000 and Rs 4,500 who might work..."
Good: "There aren't any Physics tutors in Baneshwor at the moment. But here are tutors in nearby areas within 5 km..."
Bad: "No tutors found." (Too blunt)
Bad: "I found 0 tutors." (Not helpful)
`;
```

### Safety Prompt

```typescript
// ai/prompts/safety.prompt.ts
export const SAFETY_PROMPT = `
## Safety & Guardrails
- You are an educational assistant. Do NOT discuss topics unrelated to education or tutoring.
- Do NOT collect or request sensitive personal information (passwords, payment details, addresses).
- If a user asks for inappropriate content (homework cheating, exam fraud, etc.), politely decline and redirect.
- If a user is being abusive, disengage politely.
- Never pretend to be a human. You are an AI assistant.
- Never say you can "guarantee" results from any tutor.
- Never make medical, legal, or financial recommendations outside of tutoring.
`;
```

---

## 14. Evaluation Metrics

### Metrics that Matter for This Project

| Metric | What It Measures | Priority | Why for This Project |
|--------|------------------|----------|---------------------|
| **Recall@k** | How many relevant tutors are in the top-k results | 🔴 **Critical** | A student must see all good options. Missing a great tutor = lost opportunity. |
| **Precision@k** | What fraction of top-k results are relevant | 🔴 **Critical** | Irrelevant recommendations frustrate users. |
| **Hit Rate** | Whether at least one relevant tutor appears in top-k | 🟡 **High** | Is the system working at all for this query? |
| **MRR (Mean Reciprocal Rank)** | How early the first relevant tutor appears | 🟡 **High** | Students want the best match at the top. |
| **Faithfulness** | Does the LLM response only use retrieved tutors? | 🔴 **Critical** | Hallucinating tutors = instant trust loss. |
| **Answer Relevance** | Does the response address the student's query? | 🟡 **High** | Relevant results but useless response = bad UX. |
| **Latency (p95)** | How fast does the full pipeline respond? | 🟡 **High** | Students expect < 3 seconds for a response. |
| **Constraint Accuracy** | Did the system extract the right constraints? | 🔴 **Critical** | Wrong constraints = wrong results. |
| **Fallback Relevance** | Are fallback suggestions still useful? | 🟢 **Medium** | Bad fallback = frustrated user. |
| **User Satisfaction** | Did the student find a tutor through the chat? | 🟢 **Medium** | Ultimate measure, but slow to collect. |

### Evaluation Datasets

#### Golden Dataset (20-30 hand-crafted queries)

```typescript
// ai/evaluation/goldenDataset.ts
export const GOLDEN_DATASET = [
  {
    query: "I need a Maths tutor near Baneshwor under Rs 5000",
    expectedConstraints: {
      subject: "Mathematics",
      location_text: "Baneshwor",
      budget_max: 5000,
    },
    expectedTutorIds: ["t-002"], // Ramesh Karki teaches Maths in New Baneshwor at Rs 20,000 ... hmm this will fail
    // Actually this should test fallback: Ramesh is Rs 20,000, so fallback to higher budget
    expectFallback: true,
    expectedFallbackSubject: "Mathematics",
  },
  {
    query: "I need a physics tutor",
    expectedConstraints: {
      subject: "Physics",
    },
    expectSearch: true,
  },
  {
    query: "What's the weather like?",
    expectedIntent: "off_topic",
    expectRedirect: true,
  },
  // ... 20-30 more queries
];
```

### Evaluation Framework

**Use RAGAS or a custom evaluation script** (RAGAS requires Python, which you can run in a GitHub Action or locally):

```bash
# Python evaluation script (run separately, not in the app)
# pip install ragas datasets
python scripts/evaluate_rag.py --dataset golden.json --endpoint https://[project].supabase.co/functions/v1/chat
```

For **TypeScript-based evaluation** (runs in Node):
```typescript
// npm install @langchain/community (for evaluation utilities)
// Or write your own evaluation runner
```

### Continuous Evaluation

1. **Per-deployment**: Run golden dataset, compare precision@k and MRR against baseline
2. **Weekly**: Sample 100 real chat logs, manually label relevance
3. **Monthly**: Update golden dataset with new edge cases found in production

---

## 15. Security

### Prompt Injection Protection

```typescript
// Edge Function middleware
function sanitizeInput(input: string): string {
  // 1. Strip system prompt override attempts
  input = input.replace(/ignore\s+(all\s+)?(previous\s+)?instructions/i, "");
  input = input.replace(/you\s+are\s+(not\s+)?edumentx/i, "");
  
  // 2. Prevent prompt leaking
  input = input.replace(/print\s+your\s+(system\s+)?prompt/i, "");
  
  // 3. Length limit
  if (input.length > 2000) {
    input = input.substring(0, 2000);
  }
  
  return input;
}
```

### SQL Injection Prevention

**NEVER let the LLM generate SQL.** Use parameterized queries only:

```typescript
// ✅ SAFE: Parameterized query
const result = await supabase.rpc("search_tutors", {
  p_subject: constraints.subject,
  p_budget_max: constraints.budget_max,
  p_student_lat: studentLat,
  p_student_lng: studentLng,
  p_radius_km: constraints.radius_km || 10,
});

// ❌ DANGEROUS: Never do this
const query = `SELECT * FROM tutors WHERE subject = '${userInput}'`; // SQL injection!
```

### Hallucination Prevention

1. **Tool-enforced retrieval**: The LLM can only discuss tutors returned by `search_tutors`
2. **Context watermarking**: Each tutor in the context has a unique ID. The LLM is instructed to only reference IDs it sees
3. **Response validation**: After LLM generates a response, check that all mentioned tutor IDs exist in the search results
4. **Confidence check**: If search returns < 3 results, the LLM must show ALL of them (no cherry-picking)

### Rate Limiting

```typescript
// Edge Function rate limiting using Supabase
const RATE_LIMITS = {
  perUser: {
    window: 60_000,    // 1 minute
    maxRequests: 20,    // 20 requests per minute per user
  },
  perIP: {
    window: 60_000,
    maxRequests: 60,    // 60 requests per minute per IP
  },
};
```

### Abuse Prevention

1. **Authentication**: All `/chat` requests require Firebase Auth token verification
2. **Request validation**: Validate message length, session ID format, etc.
3. **Concurrent session limit**: Max 1 active conversation per student
4. **Model cost protection**: Cap daily LLM calls per user (e.g., 100/day)

### Authentication & Authorization

```typescript
// Edge Function middleware
async function authenticate(request: Request): Promise<string> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid authorization header");
  }
  
  const token = authHeader.split(" ")[1];
  
  // Verify Firebase ID token
  const { verifyIdToken } = await import("npm:firebase-admin/auth");
  const decoded = await verifyIdToken(token);
  
  return decoded.uid; // Returns student's Firebase UID
}
```

---

## 16. API Design

### Edge Function Endpoints

#### `POST /chat` — Main chat endpoint

**Request:**
```json
{
  "session_id": "uuid-or-client-generated-id",
  "message": "I need a Maths tutor under Rs 5000 near Baneshwor",
  "student_location": {
    "latitude": 27.68,
    "longitude": 85.34
  }
}
```

**Response (SSE Stream):**
```
event: thinking
data: {"stage": "analyzing"}

event: chunk
data: {"text": "I found "}

event: chunk
data: {"text": "3 Maths tutors "}

event: chunk
data: {"text": "near Baneshwor..."}

event: result
data: {
  "text": "I found 3 Maths tutors near Baneshwor...",
  "tutors": [
    {
      "id": "t-002",
      "full_name": "Ramesh Karki",
      "subjects": ["Physics", "Mathematics"],
      "monthly_rate_npr": 20000,
      "rating": 4.6,
      "distance_km": 1.2,
      "headline": "Physics · class 11-12 engineering prep"
    }
  ],
  "constraints": {
    "subject": "Mathematics",
    "budget_max": 5000,
    "location_text": "Baneshwor"
  },
  "fallback_applied": false
}

event: done
data: {}
```

#### `POST /chat/feedback` — Submit feedback

**Request:**
```json
{
  "session_id": "uuid",
  "message_id": "uuid",
  "rating": 4,
  "feedback_text": "Great recommendations but a bit slow",
  "clicked_tutor_id": "t-002"
}
```

#### `POST /sync-tutor` — Sync tutor from Firestore to Supabase

**Request:**
```json
{
  "uid": "firebase-uid",
  "action": "upsert"
}
```

#### `POST /embed-tutor` — Generate and store tutor embedding

**Request:**
```json
{
  "tutor_id": "t-002"
}
```

#### `GET /tutor/:id/profile` — Get full tutor profile

**Response:**
```json
{
  "id": "t-002",
  "full_name": "Ramesh Karki",
  "headline": "Physics · class 11-12 engineering prep",
  "bio": "BSc Physics (TU). 5 years tutoring experience...",
  "subjects": ["Physics", "Mathematics"],
  "monthly_rate_npr": 20000,
  "rating": 4.6,
  "review_count": 23,
  "distance_km": 1.2,
  "is_verified": true,
  "response_rate": 90
}
```

---

## 17. Conversation Flow Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle: User opens chat
    
    Idle --> Collecting: User sends message
    
    Collecting --> Collecting: Ask clarifying question
    Collecting --> Searching: All key constraints collected
    
    Searching --> Presenting: Results found
    Searching --> Fallback: No results
    Searching --> Collecting: Need more info
    
    Fallback --> Presenting: Relaxed results found
    Fallback --> EmptyState: Nothing found even after fallback
    
    Presenting --> Followup: User asks to refine
    Presenting --> Comparing: User asks to compare
    Presenting --> Booking: User wants to enroll
    
    Followup --> Searching: New constraints from user
    
    Comparing --> Presenting: Show comparison
    
    Booking --> Booked: Enrollment initiated
    
    Booked --> Idle: Done
    EmptyState --> Collecting: Try different criteria
    EmptyState --> Idle: User leaves
```

---

## 18. LangGraph Workflow

```mermaid
graph TD
    START((START)) --> detectIntent[Intent Detection]
    
    detectIntent --> |search| extractConstraints[Extract Constraints]
    detectIntent --> |greeting| greeting[Generate Greeting]
    detectIntent --> |off_topic| redirect[Politely Redirect]
    detectIntent --> |faq| answerFAQ[Answer FAQ]
    
    extractConstraints --> checkForMissing{All Required<br/>Constraints Present?}
    
    checkForMissing --> |No| askClarification[Ask Clarifying Question]
    askClarification --> WAIT((Wait for User Response))
    WAIT --> detectIntent
    
    checkForMissing --> |Yes| searchTutors[Execute Hybrid Search]
    
    searchTutors --> checkResults{Results > 0?}
    
    checkResults --> |Yes| rankResults[Rank & Score Results]
    rankResults --> buildContext[Build LLM Context]
    buildContext --> generateResponse[Generate Natural Response]
    generateResponse --> updateMemory[Update Conversation<br/>Memory & State]
    updateMemory --> presentResults[Present to Student]
    presentResults --> HANDOFF((Wait for Follow-up))
    
    checkResults --> |No| attemptFallback[Attempt Constraint Relaxation]
    
    attemptFallback --> checkFallbackLevel{Relaxation<br/>Exhausted?}
    
    checkFallbackLevel --> |No| searchTutors
    checkFallbackLevel --> |Yes| emptyResponse[Generate Empty Response]
    emptyResponse --> suggestAlternatives[Suggest Alternatives]
    suggestAlternatives --> HANDOFF
    
    HANDOFF --> detectIntent
    
    greeting --> HANDOFF
    redirect --> HANDOFF
    answerFAQ --> HANDOFF
```

### LangGraph Implementation Sketch

```typescript
// ai/agents/tutorAgent.ts
import { StateGraph, END } from "@langchain/langgraph";

// Define state
interface TutorAgentState {
  messages: ChatMessage[];
  constraints: Partial<Constraints>;
  searchResults: TutorResult[];
  fallbackLevel: number;
  currentStep: Step;
}

// Define nodes
const workflow = new StateGraph<TutorAgentState>({
  channels: {
    messages: { value: (a, b) => [...a, ...b], default: () => [] },
    constraints: { value: (a, b) => ({ ...a, ...b }), default: () => ({}) },
    searchResults: { value: (a, b) => b ?? a, default: () => [] },
    fallbackLevel: { value: (a, b) => b ?? a, default: () => 0 },
    currentStep: { value: (a, b) => b ?? a, default: () => "idle" },
  },
});

// Define edges
workflow
  .addNode("detect_intent", detectIntentNode)
  .addNode("extract_constraints", extractConstraintsNode)
  .addNode("ask_clarification", askClarificationNode)
  .addNode("hybrid_search", hybridSearchNode)
  .addNode("fallback_search", fallbackSearchNode)
  .addNode("generate_response", generateResponseNode)
  .addNode("handle_greeting", handleGreetingNode)
  .addEdge("__start__", "detect_intent")
  
  .addConditionalEdges("detect_intent", (state) => {
    if (state.currentStep === "greeting") return "handle_greeting";
    if (state.currentStep === "search" || state.currentStep === "followup") 
      return "extract_constraints";
    return "ask_clarification";
  })
  
  .addConditionalEdges("extract_constraints", (state) => {
    if (hasRequiredConstraints(state.constraints)) return "hybrid_search";
    return "ask_clarification";
  })
  
  .addConditionalEdges("hybrid_search", (state) => {
    if (state.searchResults.length > 0) return "generate_response";
    return "fallback_search";
  })
  
  .addConditionalEdges("fallback_search", (state) => {
    if (state.searchResults.length > 0) return "generate_response";
    if (state.fallbackLevel < 5) return "fallback_search"; // Try next tier
    return "generate_response"; // Empty results with fallback explanation
  })
  
  .addEdge("ask_clarification", "__end__")
  .addEdge("handle_greeting", "__end__")
  .addEdge("generate_response", "__end__");

export const tutorAgent = workflow.compile();
```

---

## 19. Production Deployment Plan

### Phase 0: Infrastructure Setup (Week 1)

1. **Enable pgvector on Supabase**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Run all migrations** (001-009 from the schema above)

3. **Set up Supabase Edge Functions**
   ```bash
   supabase functions new chat
   supabase functions new sync-tutor
   supabase functions new embed-tutor
   ```

4. **Set up environment variables**
   ```
   GROQ_API_KEY=gsk_xxx
   HF_API_TOKEN=hf_xxx
   FIREBASE_PROJECT_ID=edumentx-dev
   FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY=xxx
   ```

5. **Configure CORS** on Edge Functions
   ```typescript
   // Allow requests from the Expo app
   const corsHeaders = {
     "Access-Control-Allow-Origin": "*",
     "Access-Control-Allow-Headers": "authorization, content-type",
   };
   ```

6. **Deploy and test**
   ```bash
   supabase functions deploy chat
   supabase functions deploy sync-tutor
   supabase functions deploy embed-tutor
   ```

### Phase 1: Data Sync (Week 2)

1. Write `/sync-tutor` Edge Function to read tutor from Firestore and upsert to Supabase
2. Create a Firestore trigger (client-side) that calls `/sync-tutor` after profile save
3. Create a seed script to backfill all existing tutors from Firestore to Supabase
4. Test: verify data consistency between Firestore and Supabase

### Phase 2: Embeddings (Week 2-3)

1. Write `/embed-tutor` Edge Function that:
   - Reads tutor from Supabase (or Firestore)
   - Builds embedding text
   - Calls HuggingFace inference API
   - Stores embedding in `tutor_embeddings` table
2. Run batch embedding for all existing tutors
3. Add embedding generation to the tutor sync flow

### Phase 3: Hybrid Search (Week 3)

1. Write `hybridSearch.ts` retriever
2. Write `rankingEngine.ts` with the scoring formula
3. Test queries against the database directly (via Supabase SQL editor)
4. Build evaluation dataset and run precision/recall tests

### Phase 4: Chat Edge Function (Week 4-5)

1. Write the main `/chat` Edge Function with:
   - Firebase Auth verification
   - LangGraph orchestration
   - Tool definitions
   - Groq API integration
   - SSE streaming
2. Write all prompt templates
3. Test with the evaluation dataset
4. Implement rate limiting and error handling

### Phase 5: React Native Integration (Week 5-6)

1. Update `AIChat.tsx` to call the Edge Function
2. Add SSE streaming support
3. Add inline tutor cards in chat
4. Add feedback buttons
5. Update Zustand chat store

### Phase 6: Evaluation & Optimization (Week 6-7)

1. Run golden dataset evaluation
2. Tune ranking weights
3. Optimize query latency
   - Add database indexes
   - Tune IVFFlat parameters
   - Add response caching
4. A/B test different prompts

### Phase 7: Production Hardening (Week 7-8)

1. Add monitoring (Edge Function logs + error tracking)
2. Add search logs analytics dashboard
3. Set up feedback collection
4. Implement abusive query detection
5. Write documentation

---

## 20. Step-by-Step Implementation Roadmap

### Steps 1-3: Foundation

**Step 1: Set up Supabase migrations and test database connectivity**
```bash
# Terminal commands
supabase init
supabase migration new enable_pgvector
# Add: CREATE EXTENSION vector;
supabase migration new create_tables
# Add all schema from §3
supabase db push
```

**Step 2: Create the Firestore-to-Supabase sync**
```typescript
// supabase/functions/sync-tutor/index.ts
// 1. Accept POST with { uid: string }
// 2. Read tutor data from Firestore
// 3. Geocode the tutor's location via Nominatim (if not already geocoded)
// 4. Upsert into Supabase tutors table
// 5. Call embed-tutor function
```

**Step 3: Create the embedding function**
```typescript
// supabase/functions/embed-tutor/index.ts
// 1. Read tutor data from Supabase
// 2. Build embedding text
// 3. Call HuggingFace API
// 4. Store embedding in tutor_embeddings
```

### Steps 4-6: Core Search

**Step 4: Build the retriever**
```typescript
// ai/retriever/hybridSearch.ts
export async function hybridSearch(constraints: Constraints, studentLocation?: GeoPoint) {
  const queryText = constraints.query_text || constraints.subject || "";
  
  // Generate embedding for the query text
  const queryEmbedding = await generateEmbedding(queryText);
  
  // Build SQL WHERE clause
  const whereClause = buildWhereClause(constraints);
  
  // Execute combined query
  const { data: tutors } = await supabase.rpc("hybrid_search_tutors", {
    query_embedding: queryEmbedding,
    where_clause: whereClause,
    student_lat: studentLocation?.latitude,
    student_lng: studentLocation?.longitude,
    radius_km: constraints.radius_km || 10,
    limit_count: 20,
  });
  
  // Score and rank
  return rankTutors(tutors, constraints);
}
```

**Step 5: Build the ranking engine** (as shown in §7)

**Step 6: Build the fallback strategy**
```typescript
// ai/agents/fallbackAgent.ts
const FALLBACK_TIERS = [
  // Tier 0: Exact match (no relaxation)
  (c: Constraints) => c,
  // Tier 1: Budget +50%
  (c: Constraints) => ({ ...c, budget_max: c.budget_max * 1.5 }),
  // Tier 2: Distance x2
  (c: Constraints) => ({ ...c, radius_km: (c.radius_km || 5) * 2 }),
  // Tier 3: Budget +50% AND distance x2
  (c: Constraints) => ({ 
    ...c, 
    budget_max: c.budget_max * 1.5,
    radius_km: (c.radius_km || 5) * 2,
  }),
  // Tier 4: Broaden subject (e.g., "Physics" → "Science")
  (c: Constraints) => ({ ...c, subject: broadenSubject(c.subject) }),
  // Tier 5: Maximum relaxation
  (c: Constraints) => ({ 
    budget_max: c.budget_max * 3,
    radius_km: 20,
    min_rating: 0,
    verified_only: false,
  }),
];
```

### Steps 7-9: LLM Integration

**Step 7: Set up Groq client**
```typescript
// Edge Function: LLM integration
const GROQ_API = "https://api.groq.com/openai/v1/chat/completions";

async function callGroq(messages: any[], options?: { model?: string }) {
  const response = await fetch(GROQ_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options?.model || "llama-3.1-70b-versatile",
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  });
  return response; // Return the ReadableStream
}
```

**Step 8: Build the LangGraph agent** (as shown in §18)

**Step 9: Write all prompts** (as shown in §13)

### Steps 10-12: Client Integration

**Step 10: Update AIChat.tsx**
```typescript
// screens/student/AIChat.tsx
// Replace canned logic with:
// 1. Fetch Firebase ID token
// 2. POST to Edge Function with message + session_id
// 3. Parse SSE stream
// 4. Render tokens as they arrive
// 5. Show inline tutor cards for results
```

**Step 11: Create client-side chat store**
```typescript
// store/aiChatStore.ts
interface AIChatState {
  sessionId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  currentResponse: string;
  shownTutors: TutorResult[];
  
  sendMessage: (text: string) => Promise<void>;
  resetConversation: () => void;
  submitFeedback: (rating: number, text?: string) => Promise<void>;
}
```

**Step 12: Add tutor cards and feedback UI**

### Steps 13-15: Testing & Optimization

**Step 13: Build evaluation suite**

**Step 14: Run benchmarks and tune**

**Step 15: Deploy to production**

---

## 21. Timeline Estimate

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| **0: Infrastructure** | Enable pgvector, run migrations, set up Edge Functions, env vars | **3 days** | Supabase project with pgvector support |
| **1: Data Sync** | Write sync-tutor function, seed existing tutors, verify consistency | **4 days** | Phase 0 |
| **2: Embeddings** | Write embed-tutor function, generate embeddings for all tutors | **3 days** | Phase 1 |
| **3: Hybrid Search** | Build retriever + ranking, test queries, evaluate | **5 days** | Phase 2 |
| **4: Chat Edge Function** | Build LangGraph agent, Groq integration, prompts, SSE streaming | **7 days** | Phase 3 |
| **5: React Native Integration** | Update AIChat.tsx, streaming, tutor cards, feedback | **5 days** | Phase 4 |
| **6: Evaluation & Optimization** | Run evaluations, tune weights, optimize latency | **4 days** | Phase 5 |
| **7: Production Hardening** | Monitoring, logging, abuse detection, docs | **3 days** | Phase 6 |

**Total: ~34 days (7 weeks)**

**Note on parallel tracks**: Phases 0-2 are prerequisites for Phase 3. Phases 3 and 4 are sequential. Phases 5 can start in parallel with Phase 4 if you use a mock Edge Function.

---

## 22. Common Mistakes & How to Avoid Them

### Mistake 1: Putting everything in one LLM call
**Problem**: One massive prompt that does intent detection, constraint extraction, search, AND response generation. The prompt becomes too long, the LLM gets confused, and latency is terrible.
**Solution**: Break it into steps. Each step has a focused prompt. Use LangGraph to manage transitions.

### Mistake 2: Letting the LLM generate SQL
**Problem**: SQL injection, invalid queries, random syntax errors.
**Solution**: Parameterized queries only. The LLM extracts structured JSON; the code converts JSON to SQL.

### Mistake 3: Not caching geocoding results
**Problem**: Every "near Baneshwor" query hits Nominatim's free API. You get rate-limited (1 req/sec), queries fail, users see errors.
**Solution**: Cache all geocoding results. 95% of queries will hit the cache after the first week.

### Mistake 4: Embedding everything including filters
**Problem**: You embed `monthly_rate_npr: 5000` into the vector. A query for "budget 10,000" returns tutors who happen to have the number 5000 in their bio for unrelated reasons.
**Solution**: Only embed semantic text (bio, teaching style, headline). Keep filters as metadata columns.

### Mistake 5: Not resetting constraints between conversations
**Problem**: Student A searched for "Maths tutor." Student B (same device, different account) sees "Maths" as a pre-filled constraint.
**Solution**: Session-scoped conversations. Each session has a fresh constraint set. Conversation state is keyed by `session_id`.

### Mistake 6: Ignoring the "no results" case
**Problem**: User searches, gets 0 results, bot says "No tutors found," user leaves.
**Solution**: Always have a fallback chain. Always suggest alternatives. Even "I couldn't find any Maths tutors. Would you like to see tutors for related subjects like Science or Computer Science?" is better than silence.

### Mistake 7: Streaming before the full response is ready
**Problem**: You start streaming tokens, then realize the search returned an error. Now you've already told the user "I found..." and have to backtrack.
**Solution**: Validate the search results BEFORE starting the LLM response generation. Only stream when you know the response will be valid.

### Mistake 8: Not handling Nepal-specific education terms
**Problem**: "+2 Science", "SEE", "NEB", "Management stream", "Science stream" — these are Nepal-specific education terms. A non-localized model may not understand them.
**Solution**: Include Nepal education context in the system prompt. Map terms in preprocessing: "+2" → "Grade 11-12", "SEE" → "Grade 10", "Management" → "Business/Commerce stream".

### Mistake 9: Over-indexing on vector search
**Problem**: Vector similarity returns tutors who are "semantically close" but have wrong subjects or are in a different city.
**Solution**: Vector search should only rank within the filtered set. The SQL filters run FIRST, vector ranking runs SECOND on the filtered results.

### Mistake 10: No feedback loop
**Problem**: You deploy the chatbot, but have no way to know if it's recommending good tutors.
**Solution**: Add feedback buttons to every response. Log every search with the constraints and results. Review logs weekly to find patterns.

---

## Appendices

### Appendix A: Environment Variables

```bash
# .env (used by Edge Functions)
GROQ_API_KEY=gsk_your_groq_api_key
HF_API_TOKEN=hf_your_huggingface_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Firebase Admin (for verifying tokens in Edge Function)
FIREBASE_PROJECT_ID=edumentx-dev
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@edumentx-dev.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Expo (for the React Native app)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
EXPO_PUBLIC_EDGE_FUNCTION_URL=https://your-project.supabase.co/functions/v1
```

### Appendix B: Key npm Packages

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.108.2",
    "@langchain/langgraph": "^0.1.0",
    "@langchain/groq": "^0.1.0",
    "eventsource": "^2.0.2"
  },
  "devDependencies": {
    "supabase": "^1.100.0"
  }
}
```

Note: LangGraph for TypeScript is available as `@langchain/langgraph`. The Edge Function environment (Deno) supports npm imports via `npm:` prefix:

```typescript
import { StateGraph } from "npm:@langchain/langgraph";
```

### Appendix C: Testing the System Locally

```bash
# 1. Start Supabase locally
supabase start

# 2. Run migrations
supabase db push

# 3. Seed test data
supabase functions serve sync-tutor --env-file .env.local

# 4. Test Edge Function locally
curl -X POST http://localhost:54321/functions/v1/chat \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test-1", "message": "I need a Maths tutor"}'

# 5. Run evaluation
cd ai/evaluation
npx ts-node runEvaluation.ts
```

---

*This design document is the architectural blueprint for the EdumentX AI Tutor Recommendation Chatbot. It covers all 13 sections requested, from architecture through deployment. The key design decisions are:*

1. **Agentic Hybrid Search (not pure RAG)** — because tutor matching needs both structured filtering AND semantic understanding
2. **LangGraph state machine** — for clean conversation flow management
3. **pgvector + SQL filtered search** — for fast, accurate retrieval
4. **Groq Llama 3.1 70B** — for free, fast LLM inference
5. **BGE-small embeddings** — for efficient semantic matching
6. **Tool-calling LLM** — to decouple reasoning from retrieval
7. **Haversine in PostgreSQL** — for distance calculation without PostGIS
8. **Multi-tier fallback** — to never leave a student with "no results"
