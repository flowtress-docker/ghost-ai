#!/usr/bin/env python3
"""Deterministic caveman-compress for markdown (no external API)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[1]
COMPRESS_PKG = WORKSPACE / ".agents/skills/caveman-compress"
sys.path.insert(0, str(COMPRESS_PKG))

from scripts.validate import validate  # noqa: E402

FILLER_RE = re.compile(
    r"\b(just|really|basically|actually|simply|essentially|generally|certainly|"
    r"of course|please note that|it is important to|make sure to|remember to|"
    r"you should|you must|you can|you may|in order to|as well as|in addition|"
    r"however|furthermore|additionally|therefore|thus|indeed)\b",
    re.IGNORECASE,
)
ARTICLE_RE = re.compile(r"\b(a|an|the)\b", re.IGNORECASE)
MULTISPACE_RE = re.compile(r"[ \t]{2,}")
MULTIBLANK_RE = re.compile(r"\n{3,}")
FENCE_OPEN_RE = re.compile(r"^(\s{0,3})(`{3,}|~{3,})(.*)$")
INLINE_CODE_RE = re.compile(r"`[^`\n]+`")

REPLACEMENTS = [
    (re.compile(r"\butilize\b", re.I), "use"),
    (re.compile(r"\bimplement\b", re.I), "add"),
    (re.compile(r"\bapproximately\b", re.I), "~"),
    (re.compile(r"\bfor example\b", re.I), "e.g."),
    (re.compile(r"\bthat is\b", re.I), "i.e."),
    (re.compile(r"\bin order to\b", re.I), "to"),
    (re.compile(r"\bmake sure\b", re.I), "ensure"),
    (re.compile(r"\bdo not\b", re.I), "don't"),
    (re.compile(r"\bcannot\b", re.I), "can't"),
    (re.compile(r"\bwill not\b", re.I), "won't"),
    (re.compile(r"\bshould not\b", re.I), "shouldn't"),
    (re.compile(r"\bis not\b", re.I), "isn't"),
    (re.compile(r"\bare not\b", re.I), "aren't"),
    (re.compile(r"\bIt is recommended to\b", re.I), "Recommend"),
    (re.compile(r"\bUse this skill when\b", re.I), "Use when"),
    (re.compile(r"\bThis skill should be used when\b", re.I), "Use when"),
]


def extract_fenced_blocks(text: str) -> list[tuple[int, int, str]]:
    lines = text.split("\n")
    blocks: list[tuple[int, int, str]] = []
    line_starts: list[int] = []
    pos = 0
    for line in lines:
        line_starts.append(pos)
        pos += len(line) + 1

    i = 0
    while i < len(lines):
        m = FENCE_OPEN_RE.match(lines[i])
        if not m:
            i += 1
            continue
        fence_char = m.group(2)[0]
        fence_len = len(m.group(2))
        start = line_starts[i]
        block_lines = [lines[i]]
        i += 1
        closed = False
        while i < len(lines):
            close_m = FENCE_OPEN_RE.match(lines[i])
            if (
                close_m
                and close_m.group(2)[0] == fence_char
                and len(close_m.group(2)) >= fence_len
                and close_m.group(3).strip() == ""
            ):
                block_lines.append(lines[i])
                closed = True
                i += 1
                break
            block_lines.append(lines[i])
            i += 1
        if closed:
            end = line_starts[i] if i < len(line_starts) else len(text)
            blocks.append((start, end, "\n".join(block_lines)))
    return blocks


def fence_line_indices(text: str) -> set[int]:
    lines = text.split("\n")
    fence_lines: set[int] = set()
    i = 0
    while i < len(lines):
        m = FENCE_OPEN_RE.match(lines[i])
        if not m:
            i += 1
            continue
        fence_char = m.group(2)[0]
        fence_len = len(m.group(2))
        fence_lines.add(i)
        i += 1
        while i < len(lines):
            close_m = FENCE_OPEN_RE.match(lines[i])
            if (
                close_m
                and close_m.group(2)[0] == fence_char
                and len(close_m.group(2)) >= fence_len
                and close_m.group(3).strip() == ""
            ):
                fence_lines.add(i)
                i += 1
                break
            fence_lines.add(i)
            i += 1
    return fence_lines


def protect_inline_codes(text: str) -> tuple[str, list[str]]:
    codes: list[str] = []

    def repl(match: re.Match[str]) -> str:
        codes.append(match.group(0))
        return f"\x00IC{len(codes) - 1}\x00"

    return INLINE_CODE_RE.sub(repl, text), codes


def restore_inline_codes(text: str, codes: list[str]) -> str:
    for i, code in enumerate(codes):
        text = text.replace(f"\x00IC{i}\x00", code)
    return text


def compress_line(text: str) -> str:
    original_ws = re.match(r"^(\s*)", text)
    indent = original_ws.group(1) if original_ws else ""
    body = text.strip()
    if not body:
        return text

    protected, codes = protect_inline_codes(body)
    for pat, repl in REPLACEMENTS:
        protected = pat.sub(repl, protected)
    protected = FILLER_RE.sub("", protected)
    protected = ARTICLE_RE.sub("", protected)
    protected = re.sub(r"\s+,", ",", protected)
    protected = re.sub(r"\s+\.", ".", protected)
    protected = MULTISPACE_RE.sub(" ", protected)
    protected = protected.strip()
    body = restore_inline_codes(protected, codes)
    return indent + body if body else indent


def compress_prose_segment(segment: str) -> str:
    if not segment.strip():
        return segment

    lines = segment.split("\n")
    out_lines: list[str] = []
    in_frontmatter = False

    for i, line in enumerate(lines):
        stripped = line.strip()

        if i == 0 and stripped == "---":
            in_frontmatter = True
            out_lines.append(line)
            continue
        if in_frontmatter:
            out_lines.append(line)
            if stripped == "---" and i > 0:
                in_frontmatter = False
            continue

        if stripped.startswith("#"):
            out_lines.append(line)
            continue

        if stripped.startswith("|") or ("|" in stripped and stripped.count("|") >= 2):
            out_lines.append(line)
            continue

        list_m = re.match(r"^(\s*[-*+]\s+|\s*\d+\.\s+)(.*)$", line)
        if list_m:
            prefix, body = list_m.groups()
            out_lines.append(prefix + compress_line(body))
            continue

        out_lines.append(compress_line(line) if stripped else line)

    return "\n".join(out_lines)


def compress_markdown_aggressive(text: str) -> str:
    blocks = extract_fenced_blocks(text)
    if not blocks:
        compressed = compress_prose_segment(text)
    else:
        parts: list[str] = []
        last = 0
        for start, end, block in blocks:
            if start > last:
                parts.append(compress_prose_segment(text[last:start]))
            parts.append(block)
            last = end
        if last < len(text):
            parts.append(compress_prose_segment(text[last:]))
        compressed = "".join(parts)
    return MULTIBLANK_RE.sub("\n\n", compressed).strip() + "\n"


def compress_markdown_conservative(text: str) -> str:
    lines = text.split("\n")
    fence_lines = fence_line_indices(text)
    near_fence: set[int] = set()
    for idx in fence_lines:
        for j in range(max(0, idx - 2), min(len(lines), idx + 3)):
            near_fence.add(j)

    out: list[str] = []
    in_frontmatter = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if i == 0 and stripped == "---":
            in_frontmatter = True
            out.append(line)
            continue
        if in_frontmatter:
            out.append(line)
            if stripped == "---" and i > 0:
                in_frontmatter = False
            continue

        safe = (
            "`" not in line
            and i not in fence_lines
            and i not in near_fence
            and not stripped.startswith("#")
            and not (stripped.startswith("|") and "|" in stripped[1:])
            and stripped
        )
        out.append(compress_line(line) if safe else line)

    return MULTIBLANK_RE.sub("\n\n", "\n".join(out)).strip() + "\n"




def compress_frontmatter_only(text: str) -> str:
    lines = text.split("\n")
    out: list[str] = []
    in_frontmatter = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if i == 0 and stripped == "---":
            in_frontmatter = True
            out.append(line)
            continue
        if in_frontmatter:
            if line.startswith("description:"):
                val = line.split("description:", 1)[1].strip()
                if val.startswith(">"):
                    body = val[1:].strip()
                elif len(val) >= 2 and val[0] == val[-1] and val[0] in '"':
                    body = val[1:-1]
                else:
                    body = None
                if body is not None:
                    body = FILLER_RE.sub("", body)
                    body = ARTICLE_RE.sub("", body)
                    body = re.sub(r"\s+", " ", body).strip()
                    out.append(f'description: "{body}"')
                    continue
            out.append(line)
            if stripped == "---" and i > 0:
                in_frontmatter = False
            continue
        out.append(line)
    result = "\n".join(out)
    return result + ("\n" if text.endswith("\n") else "")

def compress_markdown_ultra(text: str) -> str:
    lines = text.split("\n")
    fence_lines = fence_line_indices(text)
    near_fence: set[int] = set()
    for idx in fence_lines:
        for j in range(max(0, idx - 3), min(len(lines), idx + 4)):
            near_fence.add(j)

    out: list[str] = []
    in_frontmatter = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        if i == 0 and stripped == "---":
            in_frontmatter = True
            out.append(line)
            continue
        if in_frontmatter:
            if line.startswith("description:"):
                val = line.split("description:", 1)[1].strip()
                if val.startswith(">"):
                    body = val[1:].strip()
                    body = FILLER_RE.sub("", body)
                    body = ARTICLE_RE.sub("", body)
                    body = re.sub(r"\s+", " ", body).strip()
                    out.append("description: >")
                    out.append("  " + body)
                    continue
            out.append(line)
            if stripped == "---" and i > 0:
                in_frontmatter = False
            continue

        safe = (
            "`" not in line
            and i not in fence_lines
            and i not in near_fence
            and not stripped.startswith("#")
            and not (stripped.startswith("|") and "|" in stripped[1:])
            and not re.match(r"^\s*[-*+\s]", line)
            and not re.match(r"^\s*\d+\.\s", line)
            and stripped
        )
        out.append(compress_line(line) if safe else line)

    return MULTIBLANK_RE.sub("\n\n", "\n".join(out)).strip() + "\n"

def compress_file(path: Path) -> bool:
    path = path.resolve()
    backup = path.with_name("SKILL.original.md")
    if backup.exists():
        print(f"Skip (backup exists): {path}")
        return False

    original = path.read_text(encoding="utf-8")
    if not original.strip():
        print(f"Skip (empty): {path}")
        return False

    candidates = [
        compress_markdown_aggressive,
        compress_markdown_conservative,
        compress_markdown_ultra,
        compress_frontmatter_only,
    ]

    compressed = original
    for fn in candidates:
        candidate = fn(original)
        if candidate.strip() == original.strip():
            continue
        backup.write_text(original, encoding="utf-8")
        path.write_text(candidate, encoding="utf-8")
        result = validate(backup, path)
        if result.is_valid:
            compressed = candidate
            break
        path.write_text(original, encoding="utf-8")
        backup.unlink(missing_ok=True)
    else:
        print(f"Skip (no valid compression): {path}")
        return False

    if compressed.strip() == original.strip():
        print(f"Skip (no change): {path}")
        return False

    if not backup.exists():
        backup.write_text(original, encoding="utf-8")
        path.write_text(compressed, encoding="utf-8")

    orig_len = len(original)
    new_len = len(compressed)
    pct = round(100 * (1 - new_len / orig_len), 1)
    print(f"OK: {orig_len} → {new_len} chars ({pct}% smaller)")
    return True


def main() -> int:
    targets = sorted((WORKSPACE / ".agents/skills").glob("*/SKILL.md"))
    ok = 0
    for fp in targets:
        print(f"\n{fp.relative_to(WORKSPACE)}")
        if compress_file(fp):
            ok += 1
    print(f"\nCompressed {ok}/{len(targets)} skill files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
