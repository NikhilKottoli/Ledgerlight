"""Plan 02 task 2.4: Artifact contract — every JSON in web/public/data/ follows this."""
from __future__ import annotations
from enum import Enum
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field
from hashlib import sha256
import json


class DataMode(str, Enum):
    LIVE = "live"
    SNAPSHOT = "snapshot"
    SYNTHETIC = "synthetic"


class ArtifactMeta(BaseModel):
    metric_id: str
    data_mode: DataMode
    retrieved_at: datetime
    source_max_ts: Optional[datetime] = None
    git_commit: str
    sha256_inputs: str  # sha256 of the raw inputs used to produce this artifact
    completeness: str
    warnings: list[str] = Field(default_factory=list)


class SeriesPoint(BaseModel):
    t: str  # ISO date (YYYY-MM-DD) or datetime
    v: Optional[Decimal] = None
    null_reason: Optional[str] = None


class MetricArtifact(BaseModel):
    meta: ArtifactMeta
    series: list[SeriesPoint]

    def to_json(self) -> str:
        return self.model_dump_json(indent=1)

    @classmethod
    def from_json(cls, s: str) -> "MetricArtifact":
        return cls.model_validate_json(s)

    def compute_hash(self) -> str:
        """Compute the artifact's content hash (excluding meta.retrieved_at and meta.sha256_inputs which change)."""
        canonical = self.model_dump(mode="json")
        canonical["meta"]["retrieved_at"] = "EXCLUDED"
        canonical["meta"]["sha256_inputs"] = "EXCLUDED"
        content = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
        return sha256(content.encode()).hexdigest()

    def verify_hash(self, expected: str) -> bool:
        return self.compute_hash() == expected
