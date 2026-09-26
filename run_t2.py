#!/usr/bin/env python3
"""DOGFOOD 2026 acceptance checker — T2 only.

Usage:  python3 run_t2.py .dogfood.toml > acceptance-report-t2.txt

Assumes T1 has already been verified separately (e.g. via run.py).
Any Python 3. Standard library only, nothing to install.
"""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

try:
    import tomllib
except ModuleNotFoundError:
    tomllib = None


def parse_toml(text):
    data, section = {}, None
    for raw in text.splitlines():
        line = raw.split("#")[0].strip()
        if not line:
            continue
        head = re.fullmatch(r"\[([A-Za-z0-9_.]+)\]", line)
        if head:
            section = data.setdefault(head.group(1), {})
            continue
        key, sep, value = line.partition("=")
        if not sep or section is None:
            continue
        key, value = key.strip(), value.strip()
        if value.startswith("["):
            items = re.findall(r'"([^"]*)"', value)
            section[key] = items
        else:
            section[key] = value.strip().strip('"').strip("'")
    return data


def load_config(path):
    if tomllib:
        with open(path, "rb") as f:
            return tomllib.load(f)
    with open(path, encoding="utf-8") as f:
        return parse_toml(f.read())


TIERS = ["T2"]
TIMEOUT = 10


def request(url, header=None, method="GET", body=None):
    req = urllib.request.Request(url, method=method)
    if header:
        name, _, value = header.partition(":")
        req.add_header(name.strip(), value.strip())
    if body is not None:
        req.data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:
        return 0, f"{type(e).__name__}: {e}"


class Check:
    def __init__(self, tier, label):
        self.tier = tier
        self.label = label
        self.ok = False
        self.detail = []

    def note(self, line):
        self.detail.append(line)


def build_checks(cfg, fixture):
    base = cfg["portal"]["base_url"].rstrip("/")
    auth = cfg.get("auth", {})
    routes = cfg.get("routes", {})

    def url(key, suffix=""):
        return base + routes.get(key, "") + suffix

    checks = []

    c = Check("T2", "judge sees own scores")
    status, _ = request(url("judge_scores"), header=auth.get("judge_a"))
    c.ok = status == 200
    if not c.ok:
        c.note(f"GET {url('judge_scores')}")
        c.note("sent as judge_a")
        c.note(f"got {status or 'no response'}, wanted 200")
    checks.append(c)

    c = Check("T2", "judge cannot see peer scores")
    probe = base + routes.get("peer_scores", routes.get("judge_scores", ""))
    status, _ = request(probe, header=auth.get("judge_b"))
    c.ok = status in (401, 403)
    if not c.ok:
        c.note(f"GET {probe}")
        c.note("sent as judge_b; this is the url that returns judge_a's scores")
        c.note(f"got {status or 'no response'}, wanted 401 or 403")
        if status == 200:
            c.note("the backend returned another judge's scores")
    checks.append(c)

    c = Check("T2", "participant blocked from judge scores")
    status, _ = request(url("judge_scores"), header=auth.get("participant"))
    c.ok = status in (401, 403)
    if not c.ok:
        c.note(f"GET {url('judge_scores')}")
        c.note("sent as participant")
        c.note(f"got {status or 'no response'}, wanted 401 or 403")
    checks.append(c)

    c = Check("T2", "unauthenticated request blocked from judge scores")
    status, _ = request(url("judge_scores"))
    c.ok = status in (401, 403)
    if not c.ok:
        c.note(f"GET {url('judge_scores')}")
        c.note("no auth header")
        c.note(f"got {status or 'no response'}, wanted 401 or 403")
    checks.append(c)

    c = Check("T2", "judge invitation/assignment endpoint works")
    status, _ = request(url("judge_assign"), header=auth.get("organizer"))
    c.ok = status == 200
    if not c.ok:
        c.note(f"GET {url('judge_assign')}")
        c.note("sent as organizer")
        c.note(f"got {status or 'no response'}, wanted 200")
    checks.append(c)

    c = Check("T2", "score submission respects weighted rubric")
    status, body = request(url("rubric"), header=auth.get("organizer"))
    has_weights = bool(re.search(r'"weight"\s*:', body))
    c.ok = status == 200 and has_weights
    if not c.ok:
        c.note(f"GET {url('rubric')}")
        c.note("sent as organizer")
        if status != 200:
            c.note(f"got {status or 'no response'}, wanted 200")
        else:
            c.note("got 200 but no per-criterion weight field was found in the body")
    checks.append(c)

    c = Check("T2", "live progress dashboard reflects judging status")
    status, body = request(url("progress"), header=auth.get("organizer"))
    c.ok = status == 200 and len(body.strip()) > 0
    if not c.ok:
        c.note(f"GET {url('progress')}")
        c.note("sent as organizer")
        c.note(f"got {status or 'no response'}, wanted 200 with a non-empty body")
    checks.append(c)

    c = Check("T2", "csv export works")
    status, body = request(url("csv_export"), header=auth.get("organizer"))
    first_line = body.splitlines()[0] if body.splitlines() else ""
    c.ok = status == 200 and "," in first_line
    if not c.ok:
        c.note(f"GET {url('csv_export')}")
        c.note("sent as organizer")
        if status != 200:
            c.note(f"got {status or 'no response'}, wanted 200")
        else:
            c.note("got 200 but the first line has no comma in it")
    checks.append(c)

    return checks


def load_fixture(explicit, config_path):
    here = os.path.dirname(os.path.abspath(__file__))
    beside_config = os.path.dirname(os.path.abspath(config_path))
    candidates = [explicit] if explicit else [
        "fixtures.json",
        os.path.join(here, "fixtures.json"),
        os.path.join(beside_config, "fixtures.json"),
        os.path.join(beside_config, "data", "fixtures.json"),
    ]
    for c in candidates:
        try:
            with open(c, "rb") as f:
                return json.load(f), c
        except (FileNotFoundError, NotADirectoryError):
            continue
    return None, None


def main():
    ap = argparse.ArgumentParser(description="DOGFOOD 2026 acceptance checker (T2 only)")
    ap.add_argument("config", help="path to .dogfood.toml")
    ap.add_argument("--fixtures", default=None,
                    help="path to fixtures.json (searched for if omitted)")
    args = ap.parse_args()

    cfg = load_config(args.config)
    fixture, fixture_path = load_fixture(args.fixtures, args.config)
    claimed = [t for t in cfg.get("tiers", {}).get("claimed", []) if t in TIERS]

    print("DOGFOOD 2026 acceptance report (T2 only)")
    print(f"portal: {cfg['portal']['base_url']}")
    print(f"claimed: {' '.join(claimed) or 'nothing'}")
    print("assumes T1 already verified separately")
    if fixture is not None:
        print(f"fixtures: {fixture_path}")
    print()

    checks = build_checks(cfg, fixture)

    width = max(len(c.label) for c in checks) + 2
    for c in checks:
        dots = "." * (width - len(c.label))
        print(f"{c.tier}  {c.label} {dots} {'PASS' if c.ok else 'FAIL'}")
        for line in c.detail:
            print(f"       {line}")

    solid = ["T2"] if all(c.ok for c in checks) else []

    print()
    print(f"claimed {' '.join(claimed) or 'nothing'}, "
          f"verified {' '.join(solid) or 'nothing'} (T2 scope; T1 assumed)")

    overclaim = [t for t in claimed if t not in solid]
    if overclaim:
        print(f"note: claimed but not verified: {' '.join(overclaim)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
