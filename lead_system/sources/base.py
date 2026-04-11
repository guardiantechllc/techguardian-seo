"""
sources/base.py
---------------
Tiny abstract base class so new sources only have to implement
`fetch()` and declare a `name`.

Every source runs inside the pipeline's try/except, so raising is
fine — the runner will log and continue with the next source.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import List

from ..config import Config
from ..models import Lead
from ..utils.http import HttpClient


class BaseSource(ABC):
    name: str = "base"
    platform: str = "Base"

    def __init__(self, config: Config, http: HttpClient) -> None:
        self.config = config
        self.http = http

    @abstractmethod
    def fetch(self) -> List[Lead]:
        """Return a list of normalized Lead objects from this source."""
        raise NotImplementedError
