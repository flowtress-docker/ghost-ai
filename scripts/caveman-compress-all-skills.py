#!/usr/bin/env python3
"""Batch /caveman-compress for every .agents/skills/*/SKILL.md."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
COMPRESS_PKG = WORKSPACE / ".agents/skills/caveman-compress"
sys.path.insert(0, str(COMPRESS_PKG))

import scripts.compress as compress_module  # noqa: E402
from scripts.compress import compress_file, strip_llm_wrapper  # noqa: E402


def call_gemini(prompt: str) -> str:
    api_key = os.environ.get("GOOGLE_AI_API_KEY") or os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY is required")

    model = os.environ.get("CAVEMAN_MODEL", "gemini-2.0-flash")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        f"?key={api_key}"
    )
    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini API error {exc.code}: {detail[:500]}") from exc

    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(part.get("text", "") for part in parts).strip()
    if not text:
        raise RuntimeError("Gemini returned empty response")
    return strip_llm_wrapper(text)


def main() -> int:
    compress_module.call_claude = call_gemini

    skill_files = sorted((WORKSPACE / ".agents/skills").glob("*/SKILL.md"))
    if not skill_files:
        print("No SKILL.md files found under .agents/skills/")
        return 1

    ok: list[Path] = []
    skipped: list[Path] = []
    failed: list[tuple[Path, str]] = []

    print(f"Compressing {len(skill_files)} skill files…\n")

    for fp in skill_files:
        rel = fp.relative_to(WORKSPACE)
        backup = fp.with_name("SKILL.original.md")
        print(f"{'=' * 60}\n{rel}")

        if backup.exists():
            print("Skip: SKILL.original.md already exists")
            skipped.append(fp)
            continue

        try:
            if compress_file(fp):
                ok.append(fp)
            else:
                skipped.append(fp)
        except Exception as exc:  # noqa: BLE001
            print(f"Error: {exc}")
            failed.append((fp, str(exc)))

    print(f"\n{'=' * 60}\nSummary")
    print(f"  compressed: {len(ok)}")
    print(f"  skipped:    {len(skipped)}")
    print(f"  failed:     {len(failed)}")
    for fp, err in failed:
        print(f"    - {fp.relative_to(WORKSPACE)}: {err}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
