# RAG Pipeline Improvements Plan

This plan details the implementation of 3 improvements to the RAG pipeline based on `improvement.md`.

## Section 1 — Codebase Understanding

### Current RAG Pipeline Flow
1. **Entry Point (`LangChainRagChainService.invoke` or `.stream`)**: Receives the user question, sessionId, and context options.
2. **Context Retrieval (`LangChainRagChainService.retrieveDocuments`)**:
   - Calls `CtxhFilterExtractionService.extractFilters` to get structured metadata filters from the user question.
   - Extracts date ranges if provided.
   - Uses `LangChainVectorStoreService.similaritySearchWithMetadataFilters` (if filters exist) or `similaritySearchWithDateFilter` (if no filters/empty filters) to pull candidate documents from the PostgreSQL database using `pgvector`.
3. **Context Formatting (`LangChainRagChainService.formatDocumentsAsContext`)**: Transforms the candidate documents into a formatted text block for the LLM. It calculates the `realtimeStatus` (Sắp diễn ra, Đang diễn ra, Đã kết thúc) based on the metadata in the documents.
4. **Answer Generation (`LangChainRagChainService.invoke` / `.stream`)**: Uses the `CTXH_RAG_PROMPT` along with the formatted context and the original question to general the final answer.

### Current Implementation Details
- **Categories**: Currently defined as hardcoded strings in the prompt (`src/ctxh-chat/prompts/filter-extraction.prompt.ts`) and expected explicitly from the Zod Schema.
- **`withStructuredOutput` and Zod Schema (`src/ctxh-chat/dto/filter-extraction.dto.ts`)**: It uses Zod to validate the LLM's JSON output. The `MetadataFilterSchema` uses `category: z.array(z.string()).optional()` leaving the possibility for hallucinated categories.
- **Answer Generation Prompt (`src/ctxh-chat/prompts/ctxh-chat.prompts.ts`)**: Contains `CTXH_RAG_PROMPT`. It defines rules but has no mention of user organization preference.
- **`CtxhEmbedding` entity (`src/entities/ctxh-embedding.entity.ts`)**: Defines the Vector Store representation `embedding` column is configured as `vector` with 1024 dimensions. `metadata` is a JSONB column holding the extra fields that allow for filtering (e.g., status, categoryName, organizationName, etc).

---

## Section 2 — Proposed Changes

### [Component Name] Category Definition Config
Creating a central place for valid categories and mappings.

#### [NEW] `backend/src/ctxh-chat/config/category.config.ts`
- **Why (Improvement 1 & 3)**: Need a centralized, dynamic (though static for this implementation until DB integration if preferred, but a mapped object is easiest to inject) list of categories and their keyword mappings.
- **Dependency**: To be used by both `filter-extraction.dto.ts`, `filter-extraction.prompt.ts`, and `ctxh-filter-extraction.service.ts`.

#### [MODIFY] `backend/src/ctxh-chat/dto/filter-extraction.dto.ts`
- **Why (Improvement 3 - Layer 2)**: Constrain the `category` field from `z.array(z.string())` to an array of explicit enum values using dynamically loaded categories from `category.config.ts`.
- **Changes**: Update `category: z.array(z.string()).optional()` to use a `z.enum([...VALID_CATEGORY_NAMES])`.

#### [MODIFY] `backend/src/ctxh-chat/prompts/filter-extraction.prompt.ts`
- **Why (Improvement 1, 3)**:
  - Inject `{category_list}` and `{category_keyword_map}` instead of hardcoding them.
  - Add explicit rule: "Category values MUST come from the provided list only. If no category clearly matches → return empty array. No inference, no semantic similarity, no new names."

#### [MODIFY] `backend/src/ctxh-chat/services/ctxh-filter-extraction.service.ts`
- **Why (Improvement 1, 3)**:
  - **Inject variables**: Pass `category_list` and `category_keyword_map` from the config into the prompt invocation.
  - **Layer 3 Validation**: Add a post-extraction validation step that filters out any `category` values not present in the valid categories array.

---

### [Component Name] User Organization Context
Injecting `userOrg` loosely into the generation prompt.

#### [MODIFY] `backend/src/ctxh-chat/prompts/ctxh-chat.prompts.ts`
- **Why (Improvement 2)**: Instruct the LLM to prioritize activities from a specific organization if provided in the context.
- **Changes**: Add `{user_org}` parameter to `CTXH_RAG_PROMPT` and add an instruction: "Nếu người dùng thuộc tổ chức {user_org}, hãy ưu tiên đề cập các hoạt động của tổ chức này lên trên cùng nếu có trong context." (Wrapped in conditional logic/defaulting to empty if no org).

#### [MODIFY] `backend/src/ctxh-chat/services/langchain-rag-chain.service.ts`
- **Why (Improvement 2)**: Pass the `userOrg` value into the generation prompt.
- **Changes**: Add `userOrg?: string` to `RAGChainOptions`. Pass it explicitly during `this.ragChain.invoke` and `this.ragChain.stream`. Provide a readable string to the prompt or a default empty string.

---

## Section 3 — Updated Pipeline Flow

1.  **[MODIFIED] Entry Point**: `LangChainRagChainService.invoke/stream` now accepts a `userOrg` optional parameter.
2.  **[EXISTING] Pre-Retrieval**: Calls `CtxhFilterExtractionService.extractFilters`.
3.  **[MODIFIED] Filter Extraction Pipeline (`CtxhFilterExtractionService`)**:
    -   **Prompt Setup**: The `FILTER_EXTRACTION_PROMPT` is populated with `{category_list}` and `{category_keyword_map}` (Improvement 1) dynamically. It has stricter rules against hallucination (Improvement 3 - Layer 1).
    -   **Structured Output Validation**: Zod schema uses `z.enum` tightly restricted to valid categories (Improvement 3 - Layer 2).
    -   **Post-processing Validation**: Checks the extracted categories again, omitting any invalid ones (Improvement 3 - Layer 3).
4.  **[EXISTING] Context Retrieval**: Runs vector similarity search (either pgvector or naive search). No changes here, so empty user organizations won't result in empty queries.
5.  **[EXISTING] Context Formatting**: Formatting stays the same.
6.  **[MODIFIED] Answer Generation**: Generates an answer using `CTXH_RAG_PROMPT`, which now receives the `userOrg` and includes a rule to prioritize reporting activities that belong to that organization (Improvement 2).

---

## Section 4 — Implementation Order

1.  **`backend/src/ctxh-chat/config/category.config.ts`**: Create the central config. It's safe, stateless, and needed by multiple files.
2.  **`backend/src/ctxh-chat/dto/filter-extraction.dto.ts`**: Update the schema to use the new config.
3.  **`backend/src/ctxh-chat/prompts/filter-extraction.prompt.ts`**: Update the prompt template layout.
4.  **`backend/src/ctxh-chat/prompts/ctxh-chat.prompts.ts`**: Update the answer generation template.
5.  **`backend/src/ctxh-chat/services/ctxh-filter-extraction.service.ts`**: Tie the new config into the prompt invocation and add the layer 3 validation.
6.  **`backend/src/ctxh-chat/services/langchain-rag-chain.service.ts`**: Bring `userOrg` into the flow.

---

## Section 5 — Open Questions

> [!WARNING]
> None at the moment. The plan covers all the constraints perfectly. Let me know if you approve this approach so I can start implementation!
