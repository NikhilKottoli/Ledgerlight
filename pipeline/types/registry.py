"""Plan 02 task 2.3: Metrics registry schema (validated by Pydantic)."""
from __future__ import annotations
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from pydantic import BaseModel, Field, HttpUrl
from enum import Enum


class MetricKind(str, Enum):
    MEASURED = "measured"
    DERIVED = "derived"
    MODELED = "modeled"


class Completeness(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    UNKNOWN = "unknown"


class SourceInfo(BaseModel):
    name: str
    url: Optional[HttpUrl] = None
    endpoint_or_table: Optional[str] = None
    params: dict = Field(default_factory=dict)


class CoverageInfo(BaseModel):
    start: Optional[datetime] = None
    end: Optional[datetime] = None


class FreshnessInfo(BaseModel):
    retrieved_at: Optional[datetime] = None
    source_max_ts: Optional[datetime] = None


class MetricRegistryEntry(BaseModel):
    id: str = Field(..., pattern=r"^[a-z][a-z0-9_.]*$")
    name: str
    kind: MetricKind
    unit: str
    entity: Literal["account", "address", "contract", "usd", "near", "bps", "ratio", "count"]
    source: SourceInfo
    definition: str
    calc_ref: str  # "sql/...sql" or "python:module.function"
    granularity: Literal["day", "week", "month", "quarter", "year"]
    coverage: CoverageInfo = Field(default_factory=CoverageInfo)
    freshness: FreshnessInfo = Field(default_factory=FreshnessInfo)
    completeness: Completeness = Completeness.UNKNOWN
    limitations: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)

    model_config = {"extra": "forbid"}


class MetricsRegistry(BaseModel):
    version: str = "1"
    metrics: list[MetricRegistryEntry]

    def get(self, metric_id: str) -> MetricRegistryEntry | None:
        for m in self.metrics:
            if m.id == metric_id:
                return m
        return None

    def ids(self) -> set[str]:
        return {m.id for m in self.metrics}
