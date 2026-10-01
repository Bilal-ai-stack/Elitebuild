# RAG Evaluation Framework & Benchmark Standards
## M/S ELITE CONSTRUCTION COMPANY — Engineers & Constructors
### Quantitative Benchmarking, Ground-Truth Datasets & Telemetry Metrics

---

## 1. Evaluation Architecture Overview

To ensure that the ELITEBUILD Enterprise RAG system operates at production fidelity, evaluation is structured into two independent testing tiers:
1. **Retrieval Benchmark:** Quantitatively measures whether the Hybrid Retrieval + RRF + Cross-Encoder pipeline retrieves the exact ground-truth evidence chunks.
2. **Generation Benchmark:** Measures whether the LLM synthesizes an accurate, faithful, and hallucination-free answer solely grounded in the retrieved context.

---

## 2. Gold Benchmark Dataset Design (25–50 QA Pairs)

A gold standard benchmark dataset will be compiled from verified corporate documentation, PEC registrations, and project records of M/S ELITE CONSTRUCTION COMPANY.

### 2.1 Dataset Schema (`evaluation/dataset_schema.json`)
Every benchmark evaluation item adheres to the following JSON structure:

```json
{
  "test_case_id": "TC-PEC-001",
  "category": "CORPORATE_CREDENTIALS",
  "query": "What is the category and specialization limit of Elite Construction Company's PEC license?",
  "ground_truth_answer": "M/S Elite Construction Company holds a Category C-1 (No Limit) license issued by the Pakistan Engineering Council (PEC), qualifying it for large-scale infrastructure and highway civil works.",
  "ground_truth_doc_ids": [
    "doc-pec-c1-license-2024"
  ],
  "ground_truth_chunk_ids": [
    "chk-pec-c1-002",
    "chk-pec-c1-003"
  ],
  "expected_citations": [
    "PEC License — Category C-1 (No Limit)"
  ],
  "expected_status": "SUPPORTED",
  "required_security_level": "PUBLIC"
}
```

### 2.2 Domain Distribution for the 25–50 Evaluation Queries
* **10 Questions — Corporate Identity & Governance:** Legal entity name, registration history, office locations, PEC licensing, ISO certifications, and tax registrations.
* **15 Questions — Civil Projects & Infrastructure Evidence:** Specific completed and ongoing projects (Swat Expressway, Ring Road, bridge structures), client departments (C&W, NHA), and scope details.
* **10 Questions — Plant, Fleet & Equipment Capabilities:** Heavy earthmoving machinery, asphalt batching plants, pavers, transit mixers, and concrete pumps.
* **5 Questions — Performance Certificates & Quality Assurance:** Substantial completion certificates, engineer evaluations, and safety records.
* **5–10 Negative / Out-of-Domain Control Queries:** Unverified or fictional claims designed to test rejection capabilities, triggering `INSUFFICIENT_EVIDENCE`.

---

## 3. Retrieval Performance Metrics

### 3.1 Recall@K ($K \in \{3, 5, 10\}$)
Measures the proportion of relevant ground-truth chunks retrieved in the top-$K$ candidates:
$$\text{Recall}@K = \frac{|\text{Relevant Chunks} \cap \text{Retrieved Chunks}@K|}{|\text{Relevant Chunks}|}$$
* **Production Acceptance Target:** $\text{Recall}@5 \ge 0.90$, $\text{Recall}@10 \ge 0.95$.

### 3.2 Precision@K ($K \in \{3, 5, 10\}$)
Measures the density of relevant evidence in the top-$K$ results:
$$\text{Precision}@K = \frac{|\text{Relevant Chunks} \cap \text{Retrieved Chunks}@K|}{K}$$
* **Production Acceptance Target:** $\text{Precision}@3 \ge 0.70$.

### 3.3 Mean Reciprocal Rank (MRR)
Evaluates how high the first relevant chunk appears in the ranked candidate list:
$$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
Where $\text{rank}_i$ is the position of the first ground-truth chunk for query $i$.
* **Production Acceptance Target:** $\text{MRR} \ge 0.85$.

### 3.4 Normalized Discounted Cumulative Gain (NDCG@K)
Evaluates ranking quality, heavily penalizing relevant documents ranked lower in the list:
$$\text{DCG}@K = \sum_{i=1}^K \frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)}, \quad \text{NDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K}$$
* **Production Acceptance Target:** $\text{NDCG}@5 \ge 0.85$.

---

## 4. Generation Performance Metrics (Ragas & DeepEval)

Using automated LLM-as-a-judge frameworks (Ragas / DeepEval):

### 4.1 Faithfulness (Groundedness)
Verifies that all factual assertions in the generated answer are strictly supported by the retrieved context.
$$\text{Faithfulness} = \frac{\text{Number of Claims Supported by Context}}{\text{Total Claims in Answer}}$$
* **Production Acceptance Target:** $\ge 0.95$. Any hallucinated project metric or date is treated as a critical regression.

### 4.2 Answer Relevance / Correctness
Computes semantic alignment between the user's intent and the generated answer, penalizing extraneous commentary or evasion.
* **Production Acceptance Target:** $\ge 0.90$.

### 4.3 Hallucination Rate
Fraction of answers containing unverified facts, fabricated numbers, or ungrounded claims.
* **Production Acceptance Target:** $\le 0.02$ (Zero tolerance on safety-critical construction specs).

---

## 5. Telemetry & Cost Tracking Standards

Production queries record operational metrics to optimize vector index tuning and LLM token expenditures:
* **p50 Latency:** $\le 800\text{ ms}$ (including hybrid retrieval and reranking).
* **p95 Latency:** $\le 2,500\text{ ms}$ (end-to-end with LLM streaming generation).
* **Prompt Tokens:** Monitored per request (target budget: $\le 1,200\text{ tokens}$ context window).
* **Completion Tokens:** Monitored per request (target budget: $\le 250\text{ tokens}$).
* **Cost Per Query:** Tracked in real time based on model pricing (target: $\le \$0.003\text{ per query}$).
* **Vector-Cache Hit Rate:** Tracking exact and near-duplicate query embeddings to bypass hybrid retrieval (target: $\ge 25\%$).
