"""External knowledge service (Wikipedia REST API).

Used as a *secondary* reference when course materials are incomplete.
No API key required.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)


class ExternalKnowledgeService:
    """
    Fetch external knowledge snippets to complement course grounding.

    Current provider: Wikipedia REST API.
    """

    def __init__(
        self,
        *,
        base_url: str = "https://en.wikipedia.org/api/rest_v1",
        user_agent: str = "DuPomfret/1.0 (Wikipedia REST client)",
        timeout_seconds: float = 6.0,
        cache_ttl_seconds: int = 60 * 60,  # 1 hour
        cache_max_items: int = 256,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.user_agent = user_agent
        self.timeout_seconds = timeout_seconds

        self.cache_ttl_seconds = cache_ttl_seconds
        self.cache_max_items = cache_max_items
        # cache key -> (expires_at_epoch, value)
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def _cache_get(self, key: str) -> Optional[Any]:
        item = self._cache.get(key)
        if not item:
            return None
        expires_at, value = item
        if time.time() >= expires_at:
            self._cache.pop(key, None)
            return None
        return value

    def _cache_set(self, key: str, value: Any) -> None:
        # Best-effort eviction: drop an arbitrary item if over capacity
        if len(self._cache) >= self.cache_max_items:
            try:
                self._cache.pop(next(iter(self._cache)))
            except Exception:
                self._cache = {}
        self._cache[key] = (time.time() + float(self.cache_ttl_seconds), value)

    async def fetch_wikipedia_summary(self, topic: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a single Wikipedia page summary by title.

        Returns:
            { title, extract, url, source } or None
        """
        topic = (topic or "").strip()
        if not topic:
            return None

        cache_key = f"wiki:summary:{topic.lower()}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        title = topic.replace(" ", "_")
        url = f"{self.base_url}/page/summary/{title}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.get(url, headers={"User-Agent": self.user_agent})
        except Exception as e:
            logger.warning("Wikipedia summary fetch failed for '%s': %s", topic, str(e))
            self._cache_set(cache_key, None)
            return None

        if resp.status_code != 200:
            # Common: 404 for missing page; 429 for rate limit
            logger.info(
                "Wikipedia summary fetch non-200 (%s) for '%s'",
                resp.status_code,
                topic,
            )
            self._cache_set(cache_key, None)
            return None

        try:
            data = resp.json()
        except Exception:
            self._cache_set(cache_key, None)
            return None

        extract = str(data.get("extract") or "").strip()
        page_url = (
            (data.get("content_urls") or {}).get("desktop", {}) or {}
        ).get("page")

        result = {
            "title": str(data.get("title") or topic),
            "extract": extract,
            "url": str(page_url or ""),
            "source": "wikipedia",
        }
        if not extract:
            result = None
        self._cache_set(cache_key, result)
        return result

    async def search_wikipedia(self, query: str, *, limit: int = 2) -> List[Dict[str, Any]]:
        """
        Search Wikipedia REST API and return short extracts.

        Returns list of:
            { title, extract, url, source }
        """
        q = (query or "").strip()
        if not q:
            return []

        limit = max(1, min(int(limit), 5))
        cache_key = f"wiki:search:{q.lower()}:{limit}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached

        url = f"{self.base_url}/page/search"

        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                resp = await client.get(
                    url,
                    params={"q": q, "limit": limit},
                    headers={"User-Agent": self.user_agent},
                )
        except Exception as e:
            logger.warning("Wikipedia search failed for '%s': %s", q, str(e))
            self._cache_set(cache_key, [])
            return []

        if resp.status_code != 200:
            logger.info("Wikipedia search non-200 (%s) for '%s'", resp.status_code, q)
            self._cache_set(cache_key, [])
            return []

        try:
            data = resp.json()
        except Exception:
            self._cache_set(cache_key, [])
            return []

        pages = data.get("pages") or []
        results: List[Dict[str, Any]] = []
        for p in pages[:limit]:
            title = str(p.get("title") or "").strip()
            extract = str(p.get("extract") or "").strip()
            key = str(p.get("key") or "").strip()
            if not title or not extract:
                continue
            results.append(
                {
                    "title": title,
                    "extract": extract,
                    "url": f"https://en.wikipedia.org/wiki/{key}" if key else "",
                    "source": "wikipedia",
                }
            )

        self._cache_set(cache_key, results)
        return results

    async def enrich_topic(self, topic: str) -> List[Dict[str, Any]]:
        """
        Enrich a topic with a small number of external references.

        Strategy:
        - Try direct summary first.
        - Fall back to search.
        """
        summary = await self.fetch_wikipedia_summary(topic)
        if summary:
            return [summary]
        return await self.search_wikipedia(topic, limit=2)

