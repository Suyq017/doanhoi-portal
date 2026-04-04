# Agent Task: Plan RAG Pipeline Improvements (Analysis Only — No Code Changes)

## Your Role
You are a senior backend engineer. Your job is to **read the existing source code, understand the current architecture, then produce a detailed implementation plan** based on the proposed improvements below.

DO NOT write or modify any code. DO NOT add features beyond what is described here.
If you find something unclear in the codebase, state your assumption explicitly.

---

## Project Tech Stack
- NestJS, TypeORM, PostgreSQL (pgvector), LangChain (TypeScript)

---

## Current File to Understand First
Read and fully understand this file before anything else: filter-extraction.prompt.ts
Then explore the surrounding codebase to understand:
1. The `CtxhEmbedding` entity — how `metadata` (JSONB) and `embedding` (vector) columns are defined
2. The service that uses `FILTER_EXTRACTION_PROMPT` — how it calls the LLM, what schema it uses with `withStructuredOutput`
3. The RAG pipeline entry point — where user question comes in, how filters are applied, how vector search is executed, how the final answer is generated
4. How categories are currently stored — in DB, hardcoded constants, or elsewhere
5. The NestJS module structure — which modules/services are involved in the RAG flow

---

## Proposed Improvements

### Improvement 1 — Dynamic Category Injection

**Problem:** Categories are hardcoded in the prompt. Every time categories change, the prompt file must be manually edited.

**Proposed solution:**
- Load valid categories (name + associated keywords) from DB or a config source at runtime
- Inject two variables into `FILTER_EXTRACTION_PROMPT`:
  - `{category_list}` — numbered list of valid category names
  - `{category_keyword_map}` — keyword-to-category mapping lines
- The prompt template already uses `{current_date}` and `{question}` as variables — follow the same pattern

**Constraints:**
- Do not change the prompt template structure beyond adding these two variables
- The mapping rules section in the prompt becomes data-driven instead of hardcoded

---

### Improvement 2 — User Organization Context (Soft Priority, Not Hard Filter)

**Problem:** Filtering vector search results strictly by the user's organization causes empty results when that organization has no matching activities.

**Proposed solution:**
- Accept `userOrg` information at the RAG pipeline entry point (the service/function that receives the user's question)
- Do NOT apply organization as a hard filter during vector search
- Instead, inject `userOrg` into the **answer generation step** via the system prompt, instructing the LLM to mention the user's organization's activities first if present in the retrieved context, while still returning all relevant results

**Constraints:**
- Vector search remains unchanged — no org filter added to the query
- Only the answer generation prompt changes to include org priority instruction
- Keep it simple: one extra line in the generation prompt is enough

---

### Improvement 3 — Category Output Validation (3-Layer Control)

**Problem:** The LLM sometimes generates category values not in the valid list (hallucination or semantic inference).

**Proposed solution — 3 layers:**

**Layer 1 — Prompt constraint:**
Add a mandatory rule to the system prompt:
- Category values MUST come from the provided list only
- If no category clearly matches → return empty array
- No inference, no semantic similarity, no new names

**Layer 2 — Zod schema enum:**
- In the Zod schema used with `withStructuredOutput`, change `category` field from `z.string()` or `z.array(z.string())` to `z.array(z.enum([...validCategories]))`
- Valid category list must be loaded dynamically (same source as Improvement 1) so the enum stays in sync

**Layer 3 — Post-extraction validation function:**
- After the LLM returns the structured output, run a validation function that filters out any category values not in the valid list
- This is the safety net in case Layers 1 and 2 are bypassed

**Constraints:**
- Do not add validation for other fields (status, location, etc.) unless already present
- Keep the validation function simple — a one-pass filter is sufficient

---

## What to Produce

### Section 1 — Codebase Understanding
Summarize what you found:
- The current RAG pipeline flow (step by step, referencing actual file/class/method names)
- Where categories are currently defined
- How `withStructuredOutput` and the Zod schema are currently set up
- Where the answer generation prompt lives and how it is called

### Section 2 — Files to Create or Modify
For each file:
- Path (relative to project root)
- Create or Modify
- What changes and why (reference the improvement number)
- Any dependencies on other files in this plan

### Section 3 — Updated Pipeline Flow
Show the full updated flow from user question to final answer, step by step.
Annotate each step as `[EXISTING]`, `[MODIFIED]`, or `[NEW]`.

### Section 4 — Implementation Order
List the files in the order a developer should implement them, with a one-line reason for the ordering (e.g., "must exist before X can import it").

### Section 5 — Open Questions
List anything ambiguous found in the codebase that requires a decision before implementation begins.
Do not assume — flag it.

---

## Hard Constraints for the Plan
- Follow the proposed architecture exactly — do not suggest alternative approaches
- Do not propose additional improvements beyond the 3 described above
- Do not suggest new tables, new entities, or schema migrations unless strictly necessary for one of the 3 improvements
- Keep every change minimal and focused — if a one-line change solves it, plan a one-line change