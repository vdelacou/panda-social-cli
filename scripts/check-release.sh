#!/usr/bin/env bash
#
# Release gate (D57): a tag ships only the version that package.json and
# CHANGELOG.md describe. The release workflow runs it on the tag of the run:
#
#   bash scripts/check-release.sh v0.1.0 [directory]
#
# It stops the release in three cases:
#   - the tag is not "v" and the version of package.json;
#   - CHANGELOG.md has no "## [<version>]" section;
#   - package.json is private, which npm does not publish.
#
# --selftest makes throwaway packages and shows each stop (canon 15.10: a gate
# only ever seen green is a hypothesis).
set -euo pipefail

if [ "${1:-}" = "--selftest" ]; then
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  gate=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  # One throwaway package: its directory, its version, its private flag and the version of its notes.
  package() {
    mkdir -p "$tmp/$1"
    jq -n --arg version "$2" --argjson private "$3" '{name: "selftest", version: $version} + (if $private then {private: true} else {} end)' > "$tmp/$1/package.json"
    printf '# Changelog\n\n## [%s] - 2026-10-04\n\n### Added\n\n- A change.\n' "$4" > "$tmp/$1/CHANGELOG.md"
  }
  package good 0.1.0 false 0.1.0
  package no-notes 0.1.0 false 0.0.9
  package private 0.1.0 true 0.1.0
  if ! bash "$gate" v0.1.0 "$tmp/good" > /dev/null; then
    echo "selftest FAIL: the check stopped a tag, a version and notes that agree" >&2; exit 1
  fi
  if bash "$gate" v0.1.1 "$tmp/good" > /dev/null 2>&1; then
    echo "selftest FAIL: the check accepted a tag that is not the version" >&2; exit 1
  fi
  if bash "$gate" v0.1.0 "$tmp/no-notes" > /dev/null 2>&1; then
    echo "selftest FAIL: the check accepted a version without a CHANGELOG section" >&2; exit 1
  fi
  if bash "$gate" v0.1.0 "$tmp/private" > /dev/null 2>&1; then
    echo "selftest FAIL: the check accepted a private package" >&2; exit 1
  fi
  echo "selftest OK: the check passes a release that agrees, and stops a wrong tag, missing notes and a private package"
  exit 0
fi

tag="${1:?usage: check-release.sh <tag> [directory] | --selftest}"
dir="${2:-.}"
version=$(jq -r '.version // ""' "$dir/package.json")
private=$(jq -r '.private // false' "$dir/package.json")
status=0
if [ "$tag" != "v$version" ]; then
  echo "  ╳ the tag $tag is not v$version, the version in package.json" >&2
  status=1
fi
if ! grep -qs "^## \[${version//./\\.}\]" "$dir/CHANGELOG.md"; then
  echo "  ╳ CHANGELOG.md has no section \"## [$version]\" for the release notes" >&2
  status=1
fi
if [ "$private" = "true" ]; then
  echo "  ╳ package.json is private, and npm does not publish a private package" >&2
  status=1
fi
[ "$status" -eq 0 ] && echo "check-release: $tag, package.json and CHANGELOG.md agree"
exit "$status"
