# =============================================================================
# ELITEBUILD RAG — Database Record Loader
# =============================================================================
# Loads existing ELITEBUILD database records (Company, Projects, Services,
# Capabilities, Equipment, Credentials, ClientOrganizations, FAQs) and
# converts them into NormalizedDocument instances for the ingestion pipeline.
#
# IMPORTANT: This loader reads data from the existing ELITEBUILD PostgreSQL
# database via direct SQL (read-only). It does NOT modify any existing tables.
# =============================================================================

import datetime
import hashlib
import json
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from rag.observability.logger import get_rag_logger

logger = get_rag_logger("elitebuild.rag.loaders.database")


# ---------------------------------------------------------------------------
# Normalized Document — Common Internal Representation
# ---------------------------------------------------------------------------

@dataclass
class NormalizedDocument:
    """
    Common internal representation for any ingestion source.
    Every ingested source is normalized into this structure before
    chunking and embedding.
    """
    document_id: str
    tenant_id: str
    title: str
    source_type: str  # DB_RECORD, PDF, DOCX, TXT
    source_reference: str  # table.id or file path
    source_authority: str
    security_access_level: str
    jurisdiction: str
    version_tag: str
    timestamp: datetime.datetime
    content_status: str
    raw_text: str
    heading_structure: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def content_hash(self) -> str:
        """SHA-256 hash of the normalized raw_text for deduplication."""
        return hashlib.sha256(self.raw_text.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Database Record Loader
# ---------------------------------------------------------------------------

class DatabaseRecordLoader:
    """
    Reads verified records from the existing ELITEBUILD Prisma-managed
    PostgreSQL database and produces NormalizedDocument instances.

    All queries are read-only. No existing data is modified.
    """

    def __init__(
        self,
        session: Session,
        tenant_id: str = "elitebuild-core",
        jurisdiction: str = "PK",
    ):
        self.session = session
        self.tenant_id = tenant_id
        self.jurisdiction = jurisdiction

    def load_all(self) -> List[NormalizedDocument]:
        """Load all approved database sources into normalized documents."""
        docs: List[NormalizedDocument] = []

        docs.extend(self._load_company())
        docs.extend(self._load_services())
        docs.extend(self._load_projects())
        docs.extend(self._load_capabilities())
        docs.extend(self._load_equipment())
        docs.extend(self._load_credentials())
        docs.extend(self._load_client_organizations())
        docs.extend(self._load_faqs())

        logger.info(
            f"Database loader produced {len(docs)} normalized documents",
            extra={"telemetry": {"event_type": "db_load_complete", "document_count": len(docs)}}
        )
        return docs

    # -----------------------------------------------------------------------
    # Company Profile
    # -----------------------------------------------------------------------
    def _load_company(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT id, "legalName", "displayName", tagline, description,
                   "establishedYear", "aboutText", mission, vision,
                   "addressPrimary", "addressSecondary", city, province, country,
                   "createdAt", "updatedAt"
            FROM "Company" LIMIT 1
        """))
        row = result.mappings().first()
        if not row:
            return []

        sections = []
        heading_structure = []

        # Build structured text from real data
        if row.get("legalName"):
            sections.append(f"# Company: {row['legalName']}")
            heading_structure.append({"level": 1, "text": f"Company: {row['legalName']}", "offset": 0})

        if row.get("tagline"):
            sections.append(f"**Tagline:** {row['tagline']}")

        if row.get("establishedYear"):
            sections.append(f"**Established:** {row['establishedYear']}")

        if row.get("description"):
            sections.append(f"\n## Company Description\n{row['description']}")
            heading_structure.append({"level": 2, "text": "Company Description", "offset": len("\n".join(sections))})

        if row.get("aboutText"):
            sections.append(f"\n## About\n{row['aboutText']}")
            heading_structure.append({"level": 2, "text": "About", "offset": len("\n".join(sections))})

        if row.get("mission"):
            sections.append(f"\n## Mission\n{row['mission']}")
            heading_structure.append({"level": 2, "text": "Mission", "offset": len("\n".join(sections))})

        if row.get("vision"):
            sections.append(f"\n## Vision\n{row['vision']}")
            heading_structure.append({"level": 2, "text": "Vision", "offset": len("\n".join(sections))})

        # Address
        addr_parts = [
            row.get("addressPrimary"),
            row.get("addressSecondary"),
            row.get("city"),
            row.get("province"),
            row.get("country"),
        ]
        addr_text = ", ".join(p for p in addr_parts if p)
        if addr_text:
            sections.append(f"\n## Registered Addresses\n{addr_text}")
            heading_structure.append({"level": 2, "text": "Registered Addresses", "offset": len("\n".join(sections))})

        raw_text = "\n".join(sections)
        updated_at = row.get("updatedAt") or datetime.datetime.now(datetime.timezone.utc)

        return [NormalizedDocument(
            document_id="doc-company-profile",
            tenant_id=self.tenant_id,
            title=f"Company Profile — {row.get('displayName', 'Elite Construction Company')}",
            source_type="DB_RECORD",
            source_reference=f"Company.{row['id']}",
            source_authority="VERIFIED_COMPANY_RECORD",
            security_access_level="PUBLIC",
            jurisdiction=self.jurisdiction,
            version_tag=f"db.{updated_at.strftime('%Y%m%d')}",
            timestamp=updated_at,
            content_status="PUBLISHED",
            raw_text=raw_text,
            heading_structure=heading_structure,
            metadata={"source_table": "Company", "record_id": row["id"]},
        )]

    # -----------------------------------------------------------------------
    # Services
    # -----------------------------------------------------------------------
    def _load_services(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT s.id, s.name, s.slug, s."shortDescription", s.description,
                   s.featured, s.active, s."updatedAt",
                   sc.name as category_name
            FROM "Service" s
            LEFT JOIN "ServiceCategory" sc ON s."categoryId" = sc.id
            WHERE s.active = true
            ORDER BY s."displayOrder"
        """))
        docs = []
        for row in result.mappings():
            sections = [f"# Service: {row['name']}"]
            heading_structure = [{"level": 1, "text": f"Service: {row['name']}", "offset": 0}]

            if row.get("category_name"):
                sections.append(f"**Category:** {row['category_name']}")

            if row.get("shortDescription"):
                sections.append(f"\n## Overview\n{row['shortDescription']}")
                heading_structure.append({"level": 2, "text": "Overview"})

            if row.get("description"):
                sections.append(f"\n## Detailed Description\n{row['description']}")
                heading_structure.append({"level": 2, "text": "Detailed Description"})

            raw_text = "\n".join(sections)
            slug = row.get("slug", row["id"])
            updated_at = row.get("updatedAt") or datetime.datetime.now(datetime.timezone.utc)

            docs.append(NormalizedDocument(
                document_id=f"doc-service-{slug}",
                tenant_id=self.tenant_id,
                title=f"Service — {row['name']}",
                source_type="DB_RECORD",
                source_reference=f"Service.{row['id']}",
                source_authority="ADMIN_AUTHORED_CONTENT",
                security_access_level="PUBLIC",
                jurisdiction=self.jurisdiction,
                version_tag=f"db.{updated_at.strftime('%Y%m%d')}",
                timestamp=updated_at,
                content_status="PUBLISHED",
                raw_text=raw_text,
                heading_structure=heading_structure,
                metadata={"source_table": "Service", "record_id": row["id"], "slug": slug},
            ))
        return docs

    # -----------------------------------------------------------------------
    # Projects
    # -----------------------------------------------------------------------
    def _load_projects(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT p.id, p.title, p.slug, p."shortDescription", p.description,
                   p.location, p."clientOrganization", p."startDate", p."completionDate",
                   p.status, p."contentStatus", p.scope, p."contractType",
                   p.featured, p."updatedAt",
                   pc.name as category_name
            FROM "Project" p
            LEFT JOIN "ProjectCategory" pc ON p."categoryId" = pc.id
            WHERE p."contentStatus" = 'PUBLISHED'
            ORDER BY p."displayOrder"
        """))
        docs = []
        for row in result.mappings():
            sections = [f"# Project: {row['title']}"]
            heading_structure = [{"level": 1, "text": f"Project: {row['title']}", "offset": 0}]

            if row.get("category_name"):
                sections.append(f"**Category:** {row['category_name']}")
            if row.get("location"):
                sections.append(f"**Location:** {row['location']}")
            if row.get("clientOrganization"):
                sections.append(f"**Client Organization:** {row['clientOrganization']}")
            if row.get("contractType"):
                sections.append(f"**Contract Type:** {row['contractType']}")
            if row.get("status"):
                sections.append(f"**Status:** {row['status']}")

            # Dates — only if they exist, never fabricated
            if row.get("startDate"):
                sections.append(f"**Start Date:** {row['startDate']}")
            if row.get("completionDate"):
                sections.append(f"**Completion Date:** {row['completionDate']}")

            if row.get("shortDescription"):
                sections.append(f"\n## Overview\n{row['shortDescription']}")
                heading_structure.append({"level": 2, "text": "Overview"})

            if row.get("description"):
                sections.append(f"\n## Description\n{row['description']}")
                heading_structure.append({"level": 2, "text": "Description"})

            if row.get("scope"):
                sections.append(f"\n## Scope of Work\n{row['scope']}")
                heading_structure.append({"level": 2, "text": "Scope of Work"})

            raw_text = "\n".join(sections)
            slug = row.get("slug", row["id"])
            updated_at = row.get("updatedAt") or datetime.datetime.now(datetime.timezone.utc)

            docs.append(NormalizedDocument(
                document_id=f"doc-project-{slug}",
                tenant_id=self.tenant_id,
                title=f"Project — {row['title']}",
                source_type="DB_RECORD",
                source_reference=f"Project.{row['id']}",
                source_authority="VERIFIED_PROJECT_RECORD",
                security_access_level="PUBLIC",
                jurisdiction=self.jurisdiction,
                version_tag=f"db.{updated_at.strftime('%Y%m%d')}",
                timestamp=updated_at,
                content_status="PUBLISHED",
                raw_text=raw_text,
                heading_structure=heading_structure,
                metadata={
                    "source_table": "Project",
                    "record_id": row["id"],
                    "slug": slug,
                    "project_status": row.get("status"),
                },
            ))
        return docs

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------
    def _load_capabilities(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT id, title, description, featured, active, "updatedAt"
            FROM "Capability"
            WHERE active = true
            ORDER BY "displayOrder"
        """))
        docs = []
        all_caps = list(result.mappings())

        if not all_caps:
            return docs

        # Combine all capabilities into a single document
        sections = ["# Technical Capabilities — Elite Construction Company"]
        heading_structure = [{"level": 1, "text": "Technical Capabilities — Elite Construction Company", "offset": 0}]

        for cap in all_caps:
            cap_title = cap.get("title", "Capability")
            sections.append(f"\n## {cap_title}")
            heading_structure.append({"level": 2, "text": cap_title})
            if cap.get("description"):
                sections.append(cap["description"])

        raw_text = "\n".join(sections)
        latest_update = max(
            (c.get("updatedAt") for c in all_caps if c.get("updatedAt")),
            default=datetime.datetime.now(datetime.timezone.utc)
        )

        docs.append(NormalizedDocument(
            document_id="doc-capabilities-overview",
            tenant_id=self.tenant_id,
            title="Technical Capabilities — Elite Construction Company",
            source_type="DB_RECORD",
            source_reference="Capability.*",
            source_authority="ADMIN_AUTHORED_CONTENT",
            security_access_level="PUBLIC",
            jurisdiction=self.jurisdiction,
            version_tag=f"db.{latest_update.strftime('%Y%m%d')}",
            timestamp=latest_update,
            content_status="PUBLISHED",
            raw_text=raw_text,
            heading_structure=heading_structure,
            metadata={"source_table": "Capability", "record_count": len(all_caps)},
        ))
        return docs

    # -----------------------------------------------------------------------
    # Equipment
    # -----------------------------------------------------------------------
    def _load_equipment(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT id, name, category, description, quantity, status, active, "updatedAt"
            FROM "Equipment"
            WHERE active = true
            ORDER BY "displayOrder"
        """))
        items = list(result.mappings())
        if not items:
            return []

        sections = ["# Equipment & Plant Fleet — Elite Construction Company"]
        heading_structure = [{"level": 1, "text": "Equipment & Plant Fleet", "offset": 0}]

        for item in items:
            name = item.get("name", "Equipment")
            sections.append(f"\n## {name}")
            heading_structure.append({"level": 2, "text": name})

            if item.get("category"):
                sections.append(f"**Category:** {item['category']}")
            if item.get("quantity") is not None:
                sections.append(f"**Quantity:** {item['quantity']}")
            if item.get("status"):
                sections.append(f"**Status:** {item['status']}")
            if item.get("description"):
                sections.append(item["description"])

        raw_text = "\n".join(sections)
        latest_update = max(
            (i.get("updatedAt") for i in items if i.get("updatedAt")),
            default=datetime.datetime.now(datetime.timezone.utc)
        )

        return [NormalizedDocument(
            document_id="doc-equipment-fleet",
            tenant_id=self.tenant_id,
            title="Equipment & Plant Fleet — Elite Construction Company",
            source_type="DB_RECORD",
            source_reference="Equipment.*",
            source_authority="ADMIN_AUTHORED_CONTENT",
            security_access_level="PUBLIC",
            jurisdiction=self.jurisdiction,
            version_tag=f"db.{latest_update.strftime('%Y%m%d')}",
            timestamp=latest_update,
            content_status="PUBLISHED",
            raw_text=raw_text,
            heading_structure=heading_structure,
            metadata={"source_table": "Equipment", "record_count": len(items)},
        )]

    # -----------------------------------------------------------------------
    # Credentials
    # -----------------------------------------------------------------------
    def _load_credentials(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT id, title, "issuingOrganization", "credentialNumber",
                   "issueDate", "expiryDate", description, verified, active, "updatedAt"
            FROM "Credential"
            WHERE active = true
            ORDER BY "displayOrder"
        """))
        docs = []
        for row in result.mappings():
            sections = [f"# Credential: {row['title']}"]
            heading_structure = [{"level": 1, "text": f"Credential: {row['title']}", "offset": 0}]

            if row.get("issuingOrganization"):
                sections.append(f"**Issuing Organization:** {row['issuingOrganization']}")
            if row.get("credentialNumber"):
                sections.append(f"**Credential Number:** {row['credentialNumber']}")
            if row.get("issueDate"):
                sections.append(f"**Issue Date:** {row['issueDate']}")
            if row.get("expiryDate"):
                sections.append(f"**Expiry Date:** {row['expiryDate']}")
            if row.get("verified"):
                sections.append("**Verified:** Yes")

            if row.get("description"):
                sections.append(f"\n## Description\n{row['description']}")
                heading_structure.append({"level": 2, "text": "Description"})

            raw_text = "\n".join(sections)
            updated_at = row.get("updatedAt") or datetime.datetime.now(datetime.timezone.utc)
            safe_id = row["title"].lower().replace(" ", "-").replace("(", "").replace(")", "")[:50]

            docs.append(NormalizedDocument(
                document_id=f"doc-credential-{safe_id}",
                tenant_id=self.tenant_id,
                title=f"Credential — {row['title']}",
                source_type="DB_RECORD",
                source_reference=f"Credential.{row['id']}",
                source_authority="VERIFIED_DOCUMENT",
                security_access_level="PUBLIC",
                jurisdiction=self.jurisdiction,
                version_tag=f"db.{updated_at.strftime('%Y%m%d')}",
                timestamp=updated_at,
                content_status="PUBLISHED",
                raw_text=raw_text,
                heading_structure=heading_structure,
                metadata={"source_table": "Credential", "record_id": row["id"]},
            ))
        return docs

    # -----------------------------------------------------------------------
    # Client Organizations
    # -----------------------------------------------------------------------
    def _load_client_organizations(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT id, name, "shortName", description, active, "updatedAt"
            FROM "ClientOrganization"
            WHERE active = true
            ORDER BY "displayOrder"
        """))
        items = list(result.mappings())
        if not items:
            return []

        sections = ["# Client Organizations — Elite Construction Company"]
        heading_structure = [{"level": 1, "text": "Client Organizations", "offset": 0}]

        for item in items:
            name = item.get("name", "Client")
            sections.append(f"\n## {name}")
            heading_structure.append({"level": 2, "text": name})
            if item.get("shortName"):
                sections.append(f"**Abbreviation:** {item['shortName']}")
            if item.get("description"):
                sections.append(item["description"])

        raw_text = "\n".join(sections)
        latest_update = max(
            (i.get("updatedAt") for i in items if i.get("updatedAt")),
            default=datetime.datetime.now(datetime.timezone.utc)
        )

        return [NormalizedDocument(
            document_id="doc-client-organizations",
            tenant_id=self.tenant_id,
            title="Client Organizations — Elite Construction Company",
            source_type="DB_RECORD",
            source_reference="ClientOrganization.*",
            source_authority="VERIFIED_COMPANY_RECORD",
            security_access_level="PUBLIC",
            jurisdiction=self.jurisdiction,
            version_tag=f"db.{latest_update.strftime('%Y%m%d')}",
            timestamp=latest_update,
            content_status="PUBLISHED",
            raw_text=raw_text,
            heading_structure=heading_structure,
            metadata={"source_table": "ClientOrganization", "record_count": len(items)},
        )]

    # -----------------------------------------------------------------------
    # FAQs
    # -----------------------------------------------------------------------
    def _load_faqs(self) -> List[NormalizedDocument]:
        result = self.session.execute(text("""
            SELECT id, question, answer, category, active, public, "updatedAt"
            FROM "FAQ"
            WHERE active = true AND public = true
            ORDER BY "displayOrder"
        """))
        items = list(result.mappings())
        if not items:
            return []

        sections = ["# Frequently Asked Questions — Elite Construction Company"]
        heading_structure = [{"level": 1, "text": "Frequently Asked Questions", "offset": 0}]

        for item in items:
            q = item.get("question", "Question")
            sections.append(f"\n## Q: {q}")
            heading_structure.append({"level": 2, "text": f"Q: {q}"})
            if item.get("answer"):
                sections.append(f"**A:** {item['answer']}")
            if item.get("category"):
                sections.append(f"**Category:** {item['category']}")

        raw_text = "\n".join(sections)
        latest_update = max(
            (i.get("updatedAt") for i in items if i.get("updatedAt")),
            default=datetime.datetime.now(datetime.timezone.utc)
        )

        return [NormalizedDocument(
            document_id="doc-faqs",
            tenant_id=self.tenant_id,
            title="Frequently Asked Questions — Elite Construction Company",
            source_type="DB_RECORD",
            source_reference="FAQ.*",
            source_authority="ADMIN_AUTHORED_CONTENT",
            security_access_level="PUBLIC",
            jurisdiction=self.jurisdiction,
            version_tag=f"db.{latest_update.strftime('%Y%m%d')}",
            timestamp=latest_update,
            content_status="PUBLISHED",
            raw_text=raw_text,
            heading_structure=heading_structure,
            metadata={"source_table": "FAQ", "record_count": len(items)},
        )]
