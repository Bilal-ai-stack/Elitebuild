# ELITEBUILD — Operations & Long-Term Maintenance Runbook (Step 18)

**M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors**  
*System: ELITEBUILD Enterprise Knowledge Base & Operations Platform*  
*Document Version: 1.0.0 | Operational Maturity Baseline*

---

## 1. Operator Quick Reference

| Operational Task | CLI Command / Admin Route | Expected Healthy Output |
|---|---|---|
| **System Health Report** | `python -m rag.cli report` | `Service Status: HEALTHY` |
| **Component Probes** | `python -m rag.cli health` | All components `HEALTHY` |
| **Quality Gate Check** | `python -m rag.cli gates` | `Overall Status: PASSED` |
| **Ingestion Status** | `python -m rag.cli status` | Displays chunk & doc counts |
| **Trigger Ingestion** | `python -m rag.cli ingest` | Ingests approved sources additively |
| **Inspect a Trace** | `python -m rag.cli trace <trace_id>` | Formatted span tree & metrics |
| **Run Gold Benchmark** | `python -m rag.cli eval` | Machine-readable JSON in `rag/evaluation/results/` |
| **Compare Eval Runs** | `python -m rag.cli compare --baseline <file1> --candidate <file2>` | Regression/Improvement delta report |
| **Admin Monitoring UI** | `/admin/rag-monitoring` | Interactive 12-subsystem status cards |
| **Web Liveness Probe** | `GET http://localhost:3000/api/health` | `{"status":"ok"}` |
| **RAG Liveness Probe** | `GET http://127.0.0.1:8000/health/live` | `{"status":"HEALTHY"}` |

---

## 2. Health Monitoring & Triage Workflow

```text
Alert Triggered / Health Degraded
               │
               ▼
┌───────────────────────────────┐
│ 1. Check Service Status       │ ──→ Run: python -m rag.cli report
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 2. Inspect Active Alerts      │ ──→ Check alert_summary & component
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 3. Trace Root Cause           │ ──→ Inspect failed trace: python -m rag.cli trace <id>
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 4. Apply Recovery / Fallback  │ ──→ Consult docs/PRODUCTION_RECOVERY.md
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│ 5. Validate Health Recovery   │ ──→ Run: python -m rag.cli health
└───────────────────────────────┘
```

---

## 3. Knowledge Base Maintenance & Freshness Policy

### 3.1 Source Ingestion & Idempotency
- When new corporate credentials, completed infrastructure projects, or machinery inventories are entered via the Admin panel, they can be ingested into the RAG knowledge base.
- Ingestion is executed via:
  ```bash
  python -m rag.cli ingest
  ```
- **Idempotency Guarantee**: Every chunk computes a SHA-256 `content_hash`. Chunks whose content and metadata have not changed are skipped (`skipped_unchanged`), preventing duplication or index bloat.
- **Additive Table Invariant**: Ingestion only affects `rag_documents` and `rag_chunks`. It never alters primary Prisma business tables (`Company`, `Project`, `Equipment`, `Credential`, etc.).

### 3.2 Document Versioning & Traceability
- Source documents maintain a `version_tag` (e.g. `1.0`, `2.0`).
- When a document is updated, the previous version's chunks remain intact in historical logs and citations reference the exact version tag from which they were derived.
- This preserves audit traceability for legal, engineering, and contractual verification.

### 3.3 Knowledge Freshness Determination
The Ingestion Monitor categorizes records into three deterministic states:
- `CURRENT`: Document verified or updated within standard corporate review cycle (e.g. within 365 days for licenses and annual ISO certifications).
- `STALE`: Document exceeds verification window without re-certification.
- `UNKNOWN`: Document does not contain explicit expiration metadata (never guess or fabricate dates).

---

## 4. Quality Drift & Regression Monitoring

### 4.1 Evaluation Cadence
- **Weekly / Pre-Deployment**: Execute the Gold Benchmark evaluation suite (30 validated test cases):
  ```bash
  python -m rag.cli eval --mode full
  ```
- The evaluation generates a timestamped report in `rag/evaluation/results/eval_run_<version>_<timestamp>.json`.

### 4.2 Quality Gate Rules & Thresholds
Production quality gates enforce minimum standards across 6 operational categories:
1. **Retrieval**: Recall@5 >= 0.70, Precision@1 >= 0.50, MRR >= 0.60.
2. **Generation**: Faithfulness >= 0.85, Correctness >= 0.80, Hallucination Rate <= 0.05.
3. **Citations**: Traceability >= 0.95, Completeness >= 0.90, Fabrication = 0.00.
4. **Security**: Tenant Isolation Violations = 0, RBAC Bypasses = 0, Prompt Injections = 0.
5. **Performance**: Retrieval Latency <= 100ms, Generation Latency <= 1500ms.
6. **Reliability**: Request Failure Rate <= 0.05.

### 4.3 Regression Policy
If any quality gate fails:
```text
Evaluation Run
     │
     ▼
Quality Gates Checked
     │
     ├── ALL PASS ──────→ Approve Release / Continue Production
     │
     └── ANY FAIL ──────→ RELEASE BLOCKED
                            │
                            ├─ 1. Identify failing category (retrieval vs generation)
                            ├─ 2. Inspect regression delta: python -m rag.cli compare
                            ├─ 3. Correct prompt or chunking configuration
                            └─ 4. Re-evaluate and re-verify before deployment
```

---

## 5. Model & Prompt Change Management

To prevent production regressions, any change to models or prompts must follow this controlled change workflow:

1. **Branch & Isolate**: Create a feature branch; never modify production configurations in place.
2. **Prompt Versioning**: When modifying `GROUNDED_SYSTEM_PROMPT` in `rag/generation/prompts.py`, increment the prompt version header and record the change rationale.
3. **Model Evaluation**:
   - Run full benchmark evaluation with the candidate model:
     ```bash
     python -m rag.cli eval --mode full
     ```
   - Compare candidate against baseline:
     ```bash
     python -m rag.cli compare --baseline rag/evaluation/results/eval_run_baseline.json --candidate rag/evaluation/results/latest.json
     ```
4. **Approval Criteria**:
   - Zero security regressions.
   - Zero citation fabrication.
   - Latency within acceptable bounds.
   - Quality gate overall status: `PASSED`.

---

## 6. Security Maintenance & Access Review

- **RBAC Audit**: Review user roles quarterly in the Admin panel (`/admin/users`). Ensure `SUPER_ADMIN` privileges are restricted to authorized managing partners.
- **Document Protection**: Verify that all confidential contracts and bid documents in `/admin/documents` are tagged as `ADMIN_ONLY` so they are not indexed for public query retrieval.
- **Secret Rotation**: Rotate `AUTH_SECRET`, `RAG_SERVICE_API_KEY`, and LLM API keys every 180 days. Update values in production environment configuration and restart services.
- **Prompt Injection Defense**: Review `security_monitor` audit logs at `/api/v1/rag/security/events` monthly for attempted prompt injection patterns or unauthorized retrieval attempts.

---

## 7. Storage & Telemetry Retention Policy

- **Application Logs**: Retained for 90 days in rotating daily log files.
- **RAG Trace Buffer**: In-memory ring buffer retains 1,000 most recent traces. High-severity error traces and security events are persisted to the audit log.
- **Evaluation Results**: Stored in `rag/evaluation/results/` as versioned JSON files; retained permanently for longitudinal regression tracking.
- **Orphaned File Audit**: Clean temporary upload directories monthly:
  ```bash
  # Check for unreferenced files in storage/documents
  npm run test
  ```

---

## 8. Recurring Operator Maintenance Checklist

### Daily / Routine Tasks:
- [ ] Inspect Next.js health: `curl -I http://localhost:3000/api/health`
- [ ] Inspect RAG microservice health: `curl http://127.0.0.1:8000/health/live`
- [ ] Review `/admin/rag-monitoring` for active critical alerts.
- [ ] Check inquiry submissions at `/admin/inquiries` for customer requests.

### Weekly Tasks:
- [ ] Run RAG operational status: `python -m rag.cli report`
- [ ] Review security audit events: `GET /api/v1/rag/security/events`
- [ ] Verify disk space on file storage and database mounts.
- [ ] Confirm automated database backup completed successfully.

### Periodic (Monthly / Quarterly) Tasks:
- [ ] Execute Gold Benchmark evaluation: `python -m rag.cli eval`
- [ ] Review dependency updates (`npm audit`, `pip list --outdated`).
- [ ] Test restore sequence on isolated staging database.
- [ ] Rotate API keys according to corporate security policy.
