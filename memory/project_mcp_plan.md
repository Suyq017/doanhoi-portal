---
name: MCP Implementation Plan for CTXH System
description: Plan to upgrade existing RAG chatbot to AI Agent via MCP protocol for Student and Staff users
type: project
---

MCP implementation plan documented at `mechanism/Duy/chatbot/mcp_implementation_plan.md`.

**Why:** Upgrade existing LangChain RAG chatbot (`ctxh-chat` module) into a full AI Agent using `@modelcontextprotocol/sdk`.

**Key decisions:**
- New module `backend/src/ctxh-mcp/` (separate from `ctxh-chat` to avoid bloat)
- Two MCP servers: `/api/mcp/student` and `/api/mcp/staff`
- Transport: StreamableHTTP via NestJS controllers
- Email: Nodemailer (install `nodemailer` + `@types/nodemailer`)

**Tools:**
- Student: `extract_activity_filters`, `search_activities`, `register_activity`
- Staff: `query_managed_activities` (view own), `create_activity`, `auto_approve_and_notify`

**How to apply:** When user asks to implement MCP, refer to this plan. Phase 1 = setup, Phase 2 = read-only tools, Phase 3 = write tools + email, Phase 4 = testing.
