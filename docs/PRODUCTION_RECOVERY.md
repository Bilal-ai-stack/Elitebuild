# ELITEBUILD — Production Disaster Recovery & Backup Plan (Step 18)

**M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors**  
*System: ELITEBUILD Enterprise Knowledge Base & Operations Platform*  
*Document Version: 1.0.0 | Operational Maturity Baseline*

---

## 1. System Architecture & Critical Dependencies

ELITEBUILD operates as a decoupled, multi-tiered enterprise architecture:

```text
                     [ External Inquiries & Search ]
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js 16 Web Application                       │
│  - App Router / React 19 Frontend                                      │
│  - Authenticated API Proxy (/api/rag/query, /api/admin/rag-monitoring) │
│  - Prisma ORM Client                                                   │
│  - Session Auth (Jose Edge JWT)                                        │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
       (Authenticated Internal HTTP)                │ (Direct Database SQL)
                    ▼                               ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│        FastAPI RAG Microservice       │  │    PostgreSQL 15+ Database    │
│  - Port 8000 / ASGI Uvicorn          │  │  - Primary Corporate Tables  │
│  - Hybrid Retrieval Engine           │  │  - pgvector Extension        │
│  - Grounded Answer Generation        │  │  - rag_documents Table       │
│  - Citation Validator                │  │  - rag_chunks Table          │
│  - Observability & Quality Monitor   │  └──────────────┬───────────────┘
└───────────────────┬──────────────────┘                 │
                    │                                    │
       (External HTTPS Inference)                        │
                    ▼                                    │
┌──────────────────────────────────────┐                 │
│      External Inference Providers    │                 ▼
│  - Groq Cloud (Llama-3.3-70B)        │  ┌──────────────────────────────┐
│  - OpenAI (text-embedding-3-small)   │  │   Protected File Storage     │
│  - Local Reranker Fallback           │  │  - storage/documents (Admin) │
└──────────────────────────────────────┘  │  - public/uploads (Public)   │
                                          └──────────────────────────────┘
```

---

## 2. Backup Strategy & Procedures

### 2.1 Database Backup (PostgreSQL + pgvector)

The database contains both corporate relational records (Prisma) and verified RAG chunk embeddings (pgvector).

- **Backup Frequency**: Daily automated full dump; transaction logs retained for point-in-time recovery where host supports WAL archiving.
- **Backup Format**: Custom compressed format (`-Fc`) preserving schemas, extensions, and vector dimensions.
- **Execution Command**:
  ```bash
  # Execute backup using pg_dump
  pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -Fc -d elitebuild > /backups/postgres/elitebuild_$(date +%Y%m%d_%H%M%S).dump
  ```
- **Integrity Validation**: Test restore onto an isolated staging container periodically.

### 2.2 Document & Media File Backup

- **Storage Locations**:
  - `storage/documents`: Private corporate certifications, contracts, and bids (Restricted access).
  - `public/uploads`: Public project images, equipment photos, and team headshots.
- **Backup Strategy**: Snapshot or rsync incremental mirroring to immutable secondary storage.
  ```bash
  # Mirror private and public document directories
  rsync -avz --delete storage/documents/ /backups/storage/documents/
  rsync -avz --delete public/uploads/ /backups/public/uploads/
  ```

### 2.3 Configuration & Secrets Backup

- **Environment Template**: Versioned `.env.example` in source control.
- **Live Production Secrets**: Stored encrypted in the organization's dedicated secrets manager (e.g. AWS Secrets Manager, Vault, or secure infrastructure vault).
- **CRITICAL INVARIANT**: Never commit live `.env` files containing `DATABASE_URL`, `AUTH_SECRET`, `GROQ_API_KEY`, or `RAG_SERVICE_API_KEY` to Git.

---

## 3. Step-by-Step Recovery Procedures

### Scenario 1: Application Container / Node Process Crash
- **Detection**: HTTP 502/503 from reverse proxy or uptime monitor failure on `GET /api/health`.
- **Immediate Action**: Inspect process status and container restart logs.
  ```bash
  docker compose ps
  # or: systemctl status elitebuild-web
  ```
- **Recovery Action**:
  ```bash
  # Restart Next.js server
  docker compose restart web
  # or: systemctl restart elitebuild-web
  ```
- **Verification**: `curl -I http://localhost:3000/api/health` should return `HTTP 200 OK`.
- **Rollback Option**: Revert to the prior container image or Git commit `8d10190` if crash follows a code update.

### Scenario 2: PostgreSQL Database Corruption / Host Outage
- **Detection**: Repeated `P1001` (Can't reach database server) in Next.js logs or `database: UNAVAILABLE` in RAG health check.
- **Immediate Action**: Stop application traffic to prevent partial writes. Verify host disk space and network connectivity.
- **Recovery Action**:
  1. Provision a clean PostgreSQL 15+ instance.
  2. Verify vector extension availability:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```
  3. Restore from the most recent verified dump:
     ```bash
     pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d elitebuild --clean --if-exists /backups/postgres/latest.dump
     ```
  4. Verify tables:
     ```bash
     npx prisma db pull
     python -m rag.cli status
     ```
- **Verification**: `python -m rag.cli health` returns `database: HEALTHY` and `pgvector: HEALTHY`.

### Scenario 3: FastAPI RAG Microservice Daemon Crash
- **Detection**: Next.js Knowledge Search modal displays "Degraded Mode" notice; `POST /api/rag/query` falls back to degraded response; `GET /api/admin/rag-monitoring` reports `service_status: UNAVAILABLE`.
- **Immediate Action**: Inspect FastAPI daemon error log (`uvicorn.log` or systemd journal).
- **Recovery Action**:
  ```bash
  # Restart RAG service daemon via CLI or supervisor
  python -m rag.cli serve --host 127.0.0.1 --port 8000
  # or: systemctl restart elitebuild-rag
  ```
- **Verification**: `curl http://127.0.0.1:8000/health/live` returns `{"status":"HEALTHY"}`.
- **Rollback Option**: Next.js proxy route automatically provides safe, user-facing degraded fallbacks without crashing the main website during downtime.

### Scenario 4: Vector Index or Embedding Corruption
- **Detection**: Retrieval queries fail with SQL vector operator errors; evaluation tests report degraded Recall@5.
- **Immediate Action**: Run RAG diagnostic CLI:
  ```bash
  python -m rag.cli health
  ```
- **Recovery Action**: Re-index the RAG knowledge base idempotently:
  ```bash
  # Re-initialize tables additively (safe, does not touch Prisma tables)
  python -m rag.cli init
  # Re-ingest approved database sources with SHA-256 deduplication
  python -m rag.cli ingest
  ```
- **Verification**: `python -m rag.cli status` reports `Ingested` chunks matching total verified records.

### Scenario 5: External LLM Provider Outage (Groq Cloud)
- **Detection**: Generation errors logged; `operational_status: DEGRADED` in query telemetry; alert `PROVIDER_UNAVAILABLE` triggered in `alert_store`.
- **Immediate Action**: Switch provider in environment configuration without code changes.
- **Recovery Action**:
  1. In `.env`, change:
     ```bash
     LLM_PROVIDER=openai
     LLM_MODEL=gpt-4o-mini
     ```
  2. Restart the RAG microservice:
     ```bash
     systemctl restart elitebuild-rag
     ```
- **Verification**: Run a test query: `python -m rag.cli retrieve "What is Elite PEC category?"` followed by a modal query test.

### Scenario 6: File Storage Failure (Private Documents)
- **Detection**: Document download requests return 404/500; audit log flags `DOCUMENT_ACCESS_ERROR`.
- **Recovery Action**:
  1. Restore `storage/documents` from latest verified rsync backup.
  2. Verify file permissions: `chmod 750 storage/documents`.
  3. Validate path resolution using:
     ```bash
     npm test
     ```
- **Verification**: Run `tests/document-security.test.ts` to ensure path traversal boundaries and permissions are intact.

---

## 4. Post-Recovery Verification Checklist

After executing any disaster recovery action, execute the standard verification checklist:

1. **Service Liveness**:
   ```bash
   curl -I http://localhost:3000/api/health
   curl http://127.0.0.1:8000/health/live
   ```
2. **Component Readiness**:
   ```bash
   python -m rag.cli report
   ```
3. **Application Build & Types**:
   ```bash
   npx tsc --noEmit
   npm test
   ```
4. **Interactive Smoke Test**:
   - Access public website (`http://localhost:3000`).
   - Open Search Modal and ask: *"What is Elite Construction's PEC license category?"*
   - Verify answer status is `SUPPORTED` and references citation `[1]`.
   - Log into `/admin` and verify `/admin/rag-monitoring` displays green health indicators.
