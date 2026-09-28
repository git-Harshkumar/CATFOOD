#!/usr/bin/env python3
"""DOGFOOD 2026 acceptance checker — T3 only.

Usage:  python3 run_t3.py .dogfood.toml > acceptance-report-t3.txt

Assumes T1 and T2 have already been verified separately.
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


TIERS = ["T3"]
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


def first_project_id(fixture):
    projects = (fixture or {}).get("projects") or []
    return projects[0].get("id") if projects else None


def build_checks(cfg, fixture):
    base = cfg["portal"]["base_url"].rstrip("/")
    auth = cfg.get("auth", {})
    routes = cfg.get("routes", {})
    project_id = first_project_id(fixture) or "1"

    def url(key, suffix=""):
        return base + routes.get(key, "") + suffix

    checks = []

    c = Check("T3", "vote can be cast")
    status, _ = request(
        url("vote"),
        header=auth.get("voter") or auth.get("participant"),
        method="POST",
        body={"project_id": project_id},
    )
    c.ok = status in (200, 201, 204)
    if not c.ok:
        c.note(f"POST {url('vote')}")
        c.note(f"body: project_id={project_id!r}")
        c.note(f"got {status or 'no response'}, wanted 200/201/204")
    checks.append(c)

    c = Check("T3", "duplicate vote rejected")
    status, _ = request(
        url("vote"),
        header=auth.get("voter") or auth.get("participant"),
        method="POST",
        body={"project_id": project_id},
    )
    c.ok = 400 <= status < 500
    if not c.ok:
        c.note(f"POST {url('vote')} (same voter, same project, second time)")
        c.note(f"got {status or 'no response'}, wanted 4xx")
        c.note("if this is 200 again, duplicate-vote protection is missing")
    checks.append(c)

    c = Check("T3", "results hidden from non-organizers during voting window")
    status, _ = request(url("results"), header=auth.get("participant"))
    c.ok = status in (401, 403)
    if not c.ok:
        c.note(f"GET {url('results')}")
        c.note("sent as participant, during the fixture's voting window")
        c.note(f"got {status or 'no response'}, wanted 401 or 403")
    checks.append(c)

    c = Check("T3", "organizer can see results")
    status, _ = request(url("results"), header=auth.get("organizer"))
    c.ok = status == 200
    if not c.ok:
        c.note(f"GET {url('results')}")
        c.note("sent as organizer")
        c.note(f"got {status or 'no response'}, wanted 200")
    checks.append(c)

    c = Check("T3", "comment can be posted and read back")
    post_status, _ = request(
        url("comments"),
        header=auth.get("participant"),
        method="POST",
        body={"project_id": project_id, "body": "dogfood-comment-probe"},
    )
    get_status, get_body = request(url("comments") + f"?project_id={project_id}")
    c.ok = post_status in (200, 201) and "dogfood-comment-probe" in get_body
    if not c.ok:
        c.note(f"POST then GET {url('comments')}")
        c.note(f"post status {post_status or 'no response'}, get status {get_status or 'no response'}")
        c.note("probe comment text was not found in the read-back")
    checks.append(c)

    c = Check("T3", "ballot ordering is randomised")
    _, body_a = request(url("gallery"), header=auth.get("voter") or auth.get("participant"))
    _, body_b = request(url("gallery"), header=auth.get("voter") or auth.get("participant"))
    titles_a = re.findall(r'"title"\s*:\s*"([^"]*)"', body_a)
    titles_b = re.findall(r'"title"\s*:\s*"([^"]*)"', body_b)
    c.ok = len(titles_a) > 1 and titles_a != titles_b
    if not c.ok:
        c.note(f"GET {url('gallery')} twice, comparing project order")
        c.note("heuristic check: with only one project, or a fixed shuffle seed, this can false-negative")
        c.note(f"got identical order both times: {titles_a!r}" if titles_a == titles_b
               else "fewer than 2 projects were returned, ordering can't be judged")
    checks.append(c)

    c = Check("T3", "anti-abuse: duplicate vote leaves an audit trail")
    status, body = request(url("audit_log"), header=auth.get("organizer"))
    c.ok = status == 200 and "vote" in body.lower()
    if not c.ok:
        c.note(f"GET {url('audit_log')}")
        c.note("sent as organizer, after the duplicate-vote probe above")
        if status != 200:
            c.note(f"got {status or 'no response'}, wanted 200")
        else:
            c.note("got 200 but no vote-related entry was found in the body")
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
    ap = argparse.ArgumentParser(description="DOGFOOD 2026 acceptance checker (T3 only)")
    ap.add_argument("config", help="path to .dogfood.toml")
    ap.add_argument("--fixtures", default=None,
                    help="path to fixtures.json (searched for if omitted)")
    args = ap.parse_args()

    cfg = load_config(args.config)
    fixture, fixture_path = load_fixture(args.fixtures, args.config)
    claimed = [t for t in cfg.get("tiers", {}).get("claimed", []) if t in TIERS]

    print("DOGFOOD 2026 acceptance report (T3 only)")
    print(f"portal: {cfg['portal']['base_url']}")
    print(f"claimed: {' '.join(claimed) or 'nothing'}")
    print("assumes T1 and T2 already verified separately")
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

    solid = ["T3"] if all(c.ok for c in checks) else []

    print()
    print(f"claimed {' '.join(claimed) or 'nothing'}, "
          f"verified {' '.join(solid) or 'nothing'} (T3 scope; T1/T2 assumed)")

    overclaim = [t for t in claimed if t not in solid]
    if overclaim:
        print(f"note: claimed but not verified: {' '.join(overclaim)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
