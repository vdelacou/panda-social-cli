#!/usr/bin/env python3
"""The reply gate: does an agent's reply to a person read the way the Interaction section asks?

The atelier skill's SKILL.md, Interaction, says how a reply reads. Five of its rules are
mechanical enough to match, and they are the doctrine tags:

  em-dash         U+2014 in the reply's own prose
  cut-word        the section's cut list: delve, leverage, robust, seamless, nuanced, "it's worth noting"
  bold-lead-in    a list item that opens on a bold phrase and carries on past it
  emoji           a pictograph or dingbat (U+1F000-1FAFF, U+2600-27BF), less the check and
                  cross marks U+2713-2718, which a status table uses as glyphs
  heading-case    a Title Case heading: two or more capitalised content words, none lowercase

The gate, --hook, is a Claude Code Stop hook (assets/claude-settings.json wires it). It reads the
Stop event on stdin and checks the reply in its last_assistant_message field, or the transcript's
last reply where an older Claude Code sends no such field (the docs warn the transcript can lag).
A doctrine finding exits 2 with each tag and its fix on stderr: Claude Code hands that text back to
the agent, which sends the reply again, fixed. The second stop carries stop_hook_active and passes,
so a reply is restated at most once and the gate never loops. Exit 0 passes; exit 1 is stdin that
is not a Stop event, a visible hook error and never a silent pass. It needs only python3.

The probe, file or directory arguments, reads replies after the fact and counts every tag; a
doctrine finding exits 1. On transcripts it also counts the gate's own blocks per session, read
from the feedback Claude Code hands back: blocks, the ones after a session's first, and the
restatements that still broke a rule. Its candidate tags come from Simplified Technical English (ASD-STE100
Issue 7, read through the 0xpili/simplified-technical-english skill on 2026-10-04). They are not
doctrine and never block or fail: they are counted so an Interaction edit lands only where agents
miss, and 831 real replies showed no habit for any of them (2026-10-04).

  unverified-claim  a result stated as a hedge: "should pass", "probably fixed", "might be green"
  hedge             any other should, would, might, may, could, probably, likely, possibly,
                    perhaps, presumably, hopefully, seem(s), appear(s) to; STE keeps only can,
                    must and will ("could not" is a past fact, and a question asks rather than
                    claims: both pass)
  passive           an event passive: was, were, been or being plus a participle ("the tests
                    were updated"); "is disconnected" names a state and passes, as in STE
  long-sentence     over 25 words, STE's cap for descriptive text; a parenthesis counts as one word
  long-paragraph    over 6 sentences
  buried-ask        a question in a prose paragraph that also carries two or more report sentences

Inputs, any mix; no argument reads one reply from stdin:
  - a text or Markdown file is one reply (review-eval's .review.txt, a pasted answer)
  - a .jsonl transcript: each assistant text block is one reply, from the claude -p stream-json the
    conformance and distill evals keep or a Claude Code session log under ~/.claude/projects/;
    thinking, tool calls, user turns, subagent messages and the harness's own notices (model
    <synthetic>: an API error, a /context table) are not replies and are skipped
  - a directory is walked for both; a .result.txt beside a .transcript.jsonl is skipped (it is
    derived from it), and so are the skills/, subagents/, node_modules/ and .git/ subtrees

Code, block quotes, URLs and double-quoted text (a mention, not a use) are never read, emphasis
markers are dropped, and a table row gets the doctrine character checks only. In the skill's own
evals the conformance prompt asks for a bare file list as the final reply, so its transcripts carry
prose only in the narration between tool calls: review-eval's reviews, distill-eval's summaries
and real session logs are the inputs that say most. Counts roll up per arm, read from a run dir's
with_skill or baseline suffix ("-" elsewhere). Each tag is a pattern, not a parser: read the
findings before the counts.

    python3 scripts/check-reply.py --hook < stop-event.json   # the gate: 2 blocks, 0 passes
    python3 scripts/check-reply.py <file-or-dir>...            # the probe: findings, then counts per arm
    python3 skills/atelier/assets/check-reply.py --selftest    # in the skill tree: every tag, both modes
"""

from __future__ import annotations  # `X | None` hints under the Python 3.9 macOS ships

import contextlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
from collections import Counter
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent / "SKILL.md"  # in the skill tree, assets/ sits beside it

DOCTRINE = ("em-dash", "cut-word", "bold-lead-in", "emoji", "heading-case")
CANDIDATE = ("unverified-claim", "hedge", "passive", "long-sentence", "long-paragraph", "buried-ask")
CUT_WORDS = ("delve", "leverage", "robust", "seamless", "nuanced", "it's worth noting")
MAX_WORDS = 25
MAX_SENTENCES = 6

EM_DASH = "\u2014"
CUT_WORD = re.compile(r"\b(?:delv\w*|leverag\w*|robust\w*|seamless\w*|nuanced|it['\u2019]s worth noting)\b", re.IGNORECASE)
EMOJI = re.compile("[\U0001F000-\U0001FAFF\u2600-\u2712\u2719-\u27BF]")
LIST_ITEM = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+")
BOLD_LEAD_IN = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+(?:\*\*[^*\n]+\*\*|__[^_\n]+__)[:.]?\s*\S")
HEADING = re.compile(r"^\s{0,3}#{1,6}\s+(.*?)[\s#]*$")
RULE_LINE = re.compile(r"^\s{0,3}([-*_])(?:\s*\1){2,}\s*$")
FENCE = re.compile(r"^\s*(`{3,}|~{3,})")
SMALL_WORDS = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "is", "it",
               "nor", "of", "on", "or", "per", "the", "to", "via", "vs", "with"}

UNVERIFIED = re.compile(
    r"\b(?:should|would|might|may|could|probably|likely|presumably|hopefully)\s+"
    r"(?:(?:now|also|still|all|then|already|just)\s+)?"
    r"(?:pass(?:es)?|works?|build|compile|succeed|resolve|fix|"
    r"(?:be\s+)?(?:green|fine|ok|okay|correct|good|clean|fixed|resolved|working|stable|done))\b",
    re.IGNORECASE,
)
HEDGE = re.compile(
    r"\b(?:(?:should|would)(?:n['\u2019]t)?|might|may(?!\s+\d)|could(?!\s+not\b)|probably|likely|"
    r"possibly|perhaps|presumably|hopefully|seems?|appears?\s+to)\b",
    re.IGNORECASE,
)
PARTICIPLE = (r"\w{2,}ed|done|made|written|run|built|set|put|kept|held|taken|given|found|left|lost|"
              r"sent|shown|told|broken|chosen|known|seen|thrown|begun|drawn|driven|hidden|read|cut|"
              r"split|bound|caught|gotten|laid|led|meant|met|paid|said|sold|taught|thought|"
              r"understood|won|rewritten|overwritten|rebuilt|rerun|reset")
PASSIVE = re.compile(rf"\b(?:was|were|been|being)\s+(?:\w+ly\s+)?({PARTICIPLE})\b", re.IGNORECASE)
NOT_PARTICIPLE = {"embed", "feed", "hundred", "indeed", "naked", "need", "sacred", "seed", "shed", "speed", "wicked"}

SENTENCE_END = re.compile(r"(?<=[.!?])\s+(?=[\"'(\[*_]?[A-Z0-9])")
WORD = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9'\u2019./_-]*[A-Za-z0-9])?")
ARM = re.compile(r"(?:^|-)(with_skill|baseline)(?:-\d+)?$")
SKIP_DIRS = {".git", "node_modules", "skills", "subagents"}


def clean(line: str) -> str:
    """A line's own prose: inline code, a bare URL and a quotation become one word each (the
    quotation keeps a closing full stop, so a sentence still ends there), a link becomes its
    text, and emphasis markers go, so "**Done.** Next" still splits."""
    line = re.sub(r"`[^`\n]+`", "CODE", line)
    line = re.sub(r"\[([^\]\n]*)\]\([^)\n]*\)", r"\1", line)
    line = re.sub(r"https?://\S+", "URL", line)
    line = re.sub(r'"[^"\n]*?([.!?]?)"', r"QUOTED\1", line)
    return line.replace("**", "").replace("__", "")


