#!/usr/bin/env python3
"""DOGFOOD 2026 acceptance checker -- extended local edition.

This is a superset of the organizers' official run.py. It keeps the
official T1/T2 checks byte-for-byte in intent (see build_t1_t2_checks,
lifted directly from run.py) and adds real, behavior-based T3/T4 checks
built against this project's actual backend, not generic guesses.

The official run.py remains the authoritative T1/T2 checker for
submission purposes. This script is a stronger pre-submission harness.

Usage:  python3 run_extended.py .dogfood.toml > acceptance-report-ext.txt

Any Python 3. Standard library only, nothing to install.

------------------------------------------------------------------------
NEW .dogfood.toml FIELDS THIS SCRIPT NEEDS (see bottom of this file for
the full annotated example) on top of the official [portal]/[tiers]/
[auth]/[routes] sections:

[routes] additions:
  vote           = "/api/community/vote"
  results        = "/api/community/1/results"
  comments       = "/api/community/comments"          # + "/<submissionId>"
  audit_log      = "/api/events/1/audit-logs"
  api            = "/api/submissions"
  webhooks       = "/api/webhooks/1"
  webhook_test   = "/api/webhooks/1/test"
  certificates   = "/api/certificates"
  cert_verify    = "/api/certificates/verify"          # + "/<certId>"
  embed_script   = "/embed/gallery.js"
  embed_page     = "/api/embed/gallery/1"
  bulk_export    = "/api/bulk/1/export"
  bulk_import    = "/api/bulk/1/import"

[auth] addition (only required if [t3].voting_mode = "AUTHENTICATED"):
  voter          = "Authorization: Bearer <jwt-for-a-voter-session>"

[t3] new section:
  voting_mode    = "EMAIL"   # EMAIL | AUTHENTICATED | OPEN -- must match
                              # the event.communityVotingMode actually
                              # configured on the seeded event
  event_id       = "1"       # internal numeric event id, used in POST
                              # bodies for routes that are not already
                              # event-scoped in their path (e.g. vote)
------------------------------------------------------------------------
"""

import argparse
import json
import os
import re
import sys
import uuid
import urllib.error
import urllib.request

try:
    import tomllib  # Python 3.11 and newer
except ModuleNotFoundError:
    tomllib = None


# ============================================================
# Config / transport -- unchanged from official run.py
# ============================================================

def parse_toml(text):
    """Enough TOML for .dogfood.toml, so older Pythons work too.

    Handles [section] headers, key = "string", and key = ["a", "b"].
    """
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


TIERS = ["T1", "T2", "T3", "T4"]
TIMEOUT = 10


def request(url, header=None, method="GET", body=None):
    """Return (status, text). Never raises on an HTTP error status."""
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


def parse_json(text):
    """Return parsed JSON, or None if it isn't valid JSON. Never raises."""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return None


def dig(data, *path, default=None):
    """Safe nested lookup: dig(data, 'data', 'standings', default=[])."""
    cur = data
    for key in path:
        if isinstance(cur, dict):
            cur = cur.get(key, default)
        else:
            return default
        if cur is None:
            return default
    return cur


def unique_token(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def error_text_of(parsed, raw_body):
    """Best-effort error/message text, tried across common field names
    before falling back to the raw body. Avoids false FAILs caused by
    assuming a specific JSON error-field name."""
    if isinstance(parsed, dict):
        for key in ("error", "message", "detail", "reason"):
            val = parsed.get(key)
            if isinstance(val, str) and val:
                return val.lower()
        # error nested one level down, e.g. {"error": {"message": "..."}}
        err = parsed.get("error")
        if isinstance(err, dict):
            for key in ("message", "detail", "reason"):
                val = err.get(key)
                if isinstance(val, str) and val:
                    return val.lower()
    return (raw_body or "").lower()


class Check:
    """One assertion. Collects its own failure detail as it runs."""

    def __init__(self, tier, label):
        self.tier = tier
        self.label = label
        self.ok = False
        self.skipped = False
        self.detail = []

    def note(self, line):
        self.detail.append(line)

    def skip(self, reason):
        self.skipped = True
        self.ok = False
        self.note(f"SKIPPED: {reason}")


def fixture_titles(fixture, n=3):
    projects = (fixture or {}).get("projects") or []
    return [p.get("title", "") for p in projects[:n] if p.get("title")]


def fixture_track_name(fixture):
    tracks = (fixture or {}).get("tracks") or []
    return tracks[0].get("name") if tracks else None


def load_fixture(explicit, config_path):
    """Look where a student would plausibly have put it."""
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


# ============================================================
# T1 / T2 -- lifted directly from the official run.py.
# Do not "improve" these; they are the organizers' contract.
# ============================================================

def build_t1_t2_checks(cfg, fixture):
    base = cfg["portal"]["base_url"].rstrip("/")
    auth = cfg.get("auth", {})
    routes = cfg.get("routes", {})

    def url(key, suffix=""):
        return base + routes.get(key, "") + suffix

    checks = []

    # --- T1 -------------------------------------------------------------
    c = Check("T1", "gallery is public")
    status, body = request(url("gallery"))
    c.ok = status == 200
    if not c.ok:
        c.note(f"GET {url('gallery')}")
        c.note("no auth header")
        c.note(f"got {status or 'no response'}, wanted 200")
    gallery_body = body
    checks.append(c)

    c = Check("T1", "project from fixtures shown")
    titles = fixture_titles(fixture)
    haystack = gallery_body.lower()
    c.ok = any(t.lower() in haystack for t in titles)
    if not c.ok:
        c.note(f"GET {url('gallery')}")
        if titles:
            c.note("looked for any of these fixture project titles: "
                   + ", ".join(repr(t) for t in titles))
            c.note("none of them appeared in the response body")
            c.note("if your gallery paginates, make sure page one is what "
                   "this route returns")
        else:
            c.note("no fixture file was loaded, so there was nothing to look for")
    checks.append(c)

    c = Check("T1", "closed event refuses submissions")
    status, _ = request(
        url("submit"),
        header=auth.get("participant"),
        method="POST",
        body={"title": "dogfood-late-submission-probe", "summary": "probe"},
    )
    c.ok = 400 <= status < 500
    if not c.ok:
        c.note(f"POST {url('submit')}")
        c.note("sent as participant; the fixture event closed "
               f"{(fixture or {}).get('event', {}).get('submissions_close', 'in the past')}")
        c.note(f"got {status or 'no response'}, wanted 4xx")
    checks.append(c)

    # --- T2 -------------------------------------------------------------
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

    c = Check("T2", "participant blocked")
    status, _ = request(url("judge_scores"), header=auth.get("participant"))
    c.ok = status in (401, 403)
    if not c.ok:
        c.note(f"GET {url('judge_scores')}")
        c.note("sent as participant")
        c.note(f"got {status or 'no response'}, wanted 401 or 403")
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


# ============================================================
# T3 -- community voting, comments, results, ballot, anti-abuse.
# Built against: communityService.js, communityController.js,
# communityRoutes.js, submissionService.getPublicGallery,
# auditService.js (as described).
# ============================================================

def build_t3_checks(cfg, fixture):
    base = cfg["portal"]["base_url"].rstrip("/")
    auth = cfg.get("auth", {})
    routes = cfg.get("routes", {})
    t3cfg = cfg.get("t3", {})

    def url(key, suffix=""):
        return base + routes.get(key, "") + suffix

    voting_mode = (t3cfg.get("voting_mode") or "EMAIL").upper()
    event_id = t3cfg.get("event_id", "1")

    checks = []

    # ---- discover a real submission id via the live API, not the
    # fixture's string id, since the fixture id ("prj_01") is not
    # guaranteed to be the portal's internal id (integers here).
    api_status, api_body = request(url("api"))
    api_json = parse_json(api_body)
    submissions = dig(api_json, "data", default=[]) if isinstance(api_json, dict) else None
    if not submissions and isinstance(api_json, list):
        submissions = api_json
    submission_id = None
    submission_title = None
    if submissions:
        submission_id = submissions[0].get("id")
        submission_title = submissions[0].get("title")

    def voter_identity_kwargs(probe_email=None):
        """Build the header/body pieces for the configured voting mode."""
        header = None
        extra_body = {}
        if voting_mode == "AUTHENTICATED":
            header = auth.get("voter")
        elif voting_mode == "EMAIL":
            extra_body["voterEmail"] = probe_email or unique_token("voter") + "@example-probe.invalid"
        # OPEN mode: nothing extra, identity is the caller's IP.
        return header, extra_body

    # -----------------------------------------------------------------
    # T3.1 vote can be cast
    # -----------------------------------------------------------------
    c = Check("T3", "community vote can be cast")
    probe_email = unique_token("voter") + "@example-probe.invalid"
    header, extra_body = voter_identity_kwargs(probe_email)
    vote_fresh = False
    if submission_id is None:
        c.note(f"GET {url('api')}")
        c.note("could not discover a submission id from the live gallery/API response")
    else:
        vote_body = {"submissionId": submission_id, "eventId": event_id, **extra_body}
        status, body = request(url("vote"), header=header, method="POST", body=vote_body)
        parsed = parse_json(body)
        if status == 201 and dig(parsed, "data", "success") is True and dig(parsed, "data", "voteId") is not None:
            c.ok = True
            vote_fresh = True
        elif status == 409:
            c.note(f"POST {url('vote')}")
            c.note(f"body: {vote_body}")
            c.note("got 409: this identity already has a vote on record for this "
                   "submission from a previous run")
            if voting_mode in ("AUTHENTICATED", "OPEN"):
                c.note(f"voting_mode={voting_mode} uses a fixed identity (a single "
                       "configured JWT, or this machine's IP), so repeat runs of "
                       "this checker cannot always mint a fresh vote here -- this "
                       "is a known limitation of black-box testing these two modes")
        else:
            c.note(f"POST {url('vote')}")
            c.note(f"body: {vote_body}")
            c.note(f"got {status or 'no response'}, wanted 201 with "
                   "data.success=true and a data.voteId")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.2 duplicate vote rejected (same identity, same submission again)
    # -----------------------------------------------------------------
    c = Check("T3", "duplicate vote is rejected with an explanatory error")
    if submission_id is None:
        c.skip("no submission id available (see previous check)")
    else:
        vote_body = {"submissionId": submission_id, "eventId": event_id, **extra_body}
        status, body = request(url("vote"), header=header, method="POST", body=vote_body)
        parsed = parse_json(body)
        error_text = error_text_of(parsed, body)
        c.ok = status == 409 and "already" in error_text
        if not c.ok:
            c.note(f"POST {url('vote')} (same identity/submission a second time)")
            c.note(f"got {status or 'no response'}, wanted 409 with an "
                   "'already voted' style error")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.3 the vote actually moves the submission's standing
    # (before/after comparison as organizer, around the fresh vote above)
    # -----------------------------------------------------------------
    c = Check("T3", "vote is reflected in the submission's standing")
    if not vote_fresh:
        c.skip("no fresh vote was cast this run (see 'community vote can be "
               "cast' above); rerun with voting_mode = EMAIL for a guaranteed "
               "fresh probe, since EMAIL mode always mints a new voter identity")
    else:
        status, body = request(url("results"), header=auth.get("organizer"))
        parsed = parse_json(body)
        standings = dig(parsed, "data", "standings", default=None)
        if standings is None:
            standings = dig(parsed, "standings", default=[])
        entry = next((s for s in standings
                      if str(s.get("submissionId")) == str(submission_id)), None)
        c.ok = status == 200 and entry is not None and float(entry.get("voteCount", 0)) > 0
        if not c.ok:
            c.note(f"GET {url('results')}")
            c.note("sent as organizer, immediately after a fresh vote for "
                   f"submission {submission_id!r}")
            if status != 200:
                c.note(f"got {status or 'no response'}, wanted 200")
            elif entry is None:
                c.note("no standings entry for this submission was found in the "
                       "results response")
            else:
                c.note(f"submission's voteCount is {entry.get('voteCount')!r}, "
                       "expected greater than 0 after the probe vote")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.4 results are sealed from non-organizers, organizer can see them
    # -----------------------------------------------------------------
    c = Check("T3", "results sealed from non-organizers while unrevealed")
    status, body = request(url("results"))
    parsed = parse_json(body)
    error_text = error_text_of(parsed, body)
    c.ok = status == 403 and "seal" in error_text
    if not c.ok:
        c.note(f"GET {url('results')}")
        c.note("no auth header (anonymous, the same population community "
               "voters come from)")
        c.note(f"got {status or 'no response'}, wanted 403 with a 'sealed' "
               "style error")
        if status == 200:
            c.note("this assumes the seeded event has "
                   "isCommunityResultsRevealed=false at boot, the same way "
                   "the official T1 check assumes submissions_close is in the "
                   "past -- if your seed script reveals results immediately, "
                   "this check will correctly fail")
    checks.append(c)

    c = Check("T3", "organizer can see results even while sealed")
    status, body = request(url("results"), header=auth.get("organizer"))
    parsed = parse_json(body)
    has_standings = dig(parsed, "data", "standings", default=None) is not None \
        or dig(parsed, "standings", default=None) is not None
    c.ok = status == 200 and has_standings
    if not c.ok:
        c.note(f"GET {url('results')}")
        c.note("sent as organizer")
        c.note(f"got {status or 'no response'}, wanted 200 with a standings list")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.5 comments: post then read back the exact probe
    # -----------------------------------------------------------------
    c = Check("T3", "comment can be posted and read back")
    if submission_id is None:
        c.skip("no submission id available")
    else:
        probe_text = unique_token("dogfood-comment-probe")
        post_status, post_body = request(
            url("comments") + f"/{submission_id}",
            method="POST",
            body={"content": probe_text},
        )
        post_json = parse_json(post_body)
        created_id = dig(post_json, "id")

        get_status, get_body = request(url("comments") + f"/{submission_id}")
        get_json = parse_json(get_body)
        items = get_json if isinstance(get_json, list) else dig(get_json, "data", default=[])
        found = any(
            item.get("content") == probe_text
            and (created_id is None or item.get("id") == created_id)
            for item in (items or [])
        )
        c.ok = (
            post_status == 201
            and dig(post_json, "content") == probe_text
            and get_status == 200
            and found
        )
        if not c.ok:
            c.note(f"POST then GET {url('comments')}/{submission_id}")
            c.note(f"post status {post_status or 'no response'}, "
                   f"get status {get_status or 'no response'}")
            if not found:
                c.note("the exact probe comment (matched by id and content, "
                       "not substring) was not found in the read-back list")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.6 ballot ordering: no dedicated ballot route exists, so this
    # exercises the public submissions API, which is the route
    # getPublicGallery (and its unconditional shuffle) actually serves.
    # -----------------------------------------------------------------
    c = Check("T3", "project ordering is randomized on repeated ballot views")
    samples = []
    for _ in range(6):
        status, body = request(url("api"))
        parsed = parse_json(body)
        items = dig(parsed, "data", default=None)
        if items is None and isinstance(parsed, list):
            items = parsed
        if status == 200 and items:
            ids = tuple(item.get("id") for item in items)
            samples.append(ids)
    unique_orders = set(samples)
    if samples and len(samples[0]) < 2:
        c.skip("fewer than 2 submissions are returned, so ordering cannot "
               "be observed")
    else:
        c.ok = len(samples) >= 3 and len(unique_orders) >= 2
        if not c.ok:
            c.note(f"GET {url('api')} six times")
            c.note("there is no dedicated ballot endpoint in this codebase; "
                   "this exercises the public submissions API, which is the "
                   "route the shuffle in getPublicGallery actually serves")
            c.note(f"obtained {len(samples)} usable samples and "
                   f"{len(unique_orders)} distinct order(s)")
            c.note("this is necessarily probabilistic: it can be fooled by "
                   "bad luck, and cannot itself prove the shuffle is "
                   "cryptographically unbiased, only that ordering is not "
                   "fixed")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.7 anti-abuse: per-IP rate limit on community voting
    # (documented: 30 votes / IP / rolling hour -> 429 past that)
    # -----------------------------------------------------------------
    c = Check("T3", "anti-abuse: per-IP vote rate limit activates")
    if submission_id is None:
        c.skip("no submission id available")
    else:
        statuses = []
        trip_index = None
        for i in range(35):
            rb = {
                "submissionId": submission_id,
                "eventId": event_id,
                "voterEmail": unique_token(f"ratelimit-{i}") + "@example-probe.invalid",
            }
            status, _ = request(url("vote"), method="POST", body=rb)
            statuses.append(status)
            if status == 429 and trip_index is None:
                trip_index = i
                break
        successes_before_trip = sum(1 for s in statuses if s == 201)
        c.ok = trip_index is not None and successes_before_trip >= 25
        if not c.ok:
            c.note(f"issued up to 35 POSTs to {url('vote')}, each a distinct "
                   "voterEmail so duplicate-detection (409) would not mask "
                   "the rate limit")
            c.note(f"status sequence: {statuses}")
            if trip_index is None:
                c.note("never received a 429 -- expected one at/after the "
                       "documented 30-votes-per-IP-per-hour threshold")
            else:
                c.note(f"got a 429 after only {successes_before_trip} "
                       "successful votes, which is suspiciously early for a "
                       "30/hour threshold and suggests the limiter may be "
                       "misconfigured or is blocking unrelated traffic")
    checks.append(c)

    # -----------------------------------------------------------------
    # T3.8 anti-abuse: the successful vote is correlated in the audit log
    # (the duplicate itself is rejected before an audit row is written,
    # per the implementation, so this checks the *original* vote event)
    # -----------------------------------------------------------------
    c = Check("T3", "vote event produces a correlated audit trail entry")
    if not vote_fresh:
        c.skip("no fresh vote was cast this run to correlate against; "
               "rerun with voting_mode = EMAIL")
    else:
        status, body = request(url("audit_log"), header=auth.get("organizer"))
        parsed = parse_json(body)
        entries = parsed if isinstance(parsed, list) else dig(parsed, "data", default=[])
        matched = None
        for e in (entries or []):
            if e.get("action") != "COMMUNITY_VOTE_CAST":
                continue
            if str(e.get("targetId")) != str(submission_id):
                continue
            meta = e.get("metadata")
            meta_obj = parse_json(meta) if isinstance(meta, str) else meta
            if isinstance(meta_obj, dict) and meta_obj.get("email") == probe_email:
                matched = e
                break
        c.ok = status == 200 and matched is not None
        if not c.ok:
            c.note(f"GET {url('audit_log')}")
            c.note("sent as organizer, looking for a COMMUNITY_VOTE_CAST "
                   f"entry with targetId={submission_id!r} and "
                   f"metadata.email={probe_email!r} -- correlated to this "
                   "run's specific probe, not a generic keyword match")
            if status != 200:
                c.note(f"got {status or 'no response'}, wanted 200")
            else:
                c.note("no matching entry was found")
                c.note("note: a duplicate vote attempt does not itself "
                       "produce an audit entry in this implementation (the "
                       "409 is thrown before the audit write), so this "
                       "check targets the original successful vote instead")
    checks.append(c)

    return checks


# ============================================================
# T4 -- REST API, webhooks, certificates, signed records,
# embeddable widget, bulk import/export.
# ============================================================

def build_t4_checks(cfg, fixture):
    base = cfg["portal"]["base_url"].rstrip("/")
    auth = cfg.get("auth", {})
    routes = cfg.get("routes", {})
    t3cfg = cfg.get("t3", {})
    event_id = t3cfg.get("event_id", "1")

    def url(key, suffix=""):
        return base + routes.get(key, "") + suffix

    checks = []

    # -----------------------------------------------------------------
    # T4.1 REST API exposes real, structured submission data
    # -----------------------------------------------------------------
    c = Check("T4", "REST API returns structured, real submission data")
    status, body = request(url("api"))
    parsed = parse_json(body)
    items = dig(parsed, "data", default=None)
    if items is None and isinstance(parsed, list):
        items = parsed
    titles_seen = {i.get("title") for i in (items or []) if isinstance(i, dict)}
    fixture_hit = bool(fixture_titles(fixture)) and any(
        t in titles_seen for t in fixture_titles(fixture, n=len(fixture_titles(fixture)))
    )
    well_formed = bool(items) and all(
        isinstance(i, dict) and "id" in i and "title" in i for i in items
    )
    c.ok = status == 200 and dig(parsed, "success") is True and well_formed
    if not c.ok:
        c.note(f"GET {url('api')}")
        if status != 200:
            c.note(f"got {status or 'no response'}, wanted 200")
        else:
            c.note("wanted success=true and a data list of objects each "
                   "with id and title")
    elif not fixture_hit:
        c.note("passed structurally, but none of the sampled fixture "
               "project titles were seen in this response -- double check "
               "this route is really backed by the seeded fixture data")
    checks.append(c)

    # -----------------------------------------------------------------
    # T4.2 webhook registration returns a real registration record
    # -----------------------------------------------------------------
    c = Check("T4", "webhook can be registered")
    webhook_id = None
    status, body = request(
        url("webhooks"),
        header=auth.get("organizer"),
        method="POST",
        body={
            "url": "https://example.invalid/dogfood-hook",
            "events": ["submission.created"],
            "eventId": event_id,
        },
    )
    parsed = parse_json(body)
    webhook_id = dig(parsed, "data", "id")
    c.ok = (
        status == 201
        and webhook_id is not None
        and dig(parsed, "data", "url") == "https://example.invalid/dogfood-hook"
        and dig(parsed, "data", "isActive") is True
    )
    if not c.ok:
        c.note(f"POST {url('webhooks')}")
        c.note("sent as organizer")
        c.note(f"got {status or 'no response'}, wanted 201 with data.id, "
               "matching data.url, and data.isActive=true")
    checks.append(c)

    # -----------------------------------------------------------------
    # T4.3 webhook delivery can actually be triggered and reported on
    # -----------------------------------------------------------------
    c = Check("T4", "webhook delivery can be triggered for the registered hook")
    if webhook_id is None:
        c.skip("no webhook was successfully registered above")
    else:
        status, body = request(url("webhook_test"), header=auth.get("organizer"), method="POST")
        parsed = parse_json(body)
        attempts = parsed if isinstance(parsed, list) else dig(parsed, "data", default=[])
        matched = next((a for a in (attempts or []) if a.get("webhookId") == webhook_id), None)
        c.ok = status == 200 and matched is not None and "status" in matched
        if not c.ok:
            c.note(f"POST {url('webhook_test')}")
            c.note(f"looking for a delivery attempt with webhookId={webhook_id!r}")
            if status != 200:
                c.note(f"got {status or 'no response'}, wanted 200")
            else:
                c.note("no delivery attempt for this specific webhook id was reported")
        c.note("limitation: there is no local callback receiver, so this "
               "confirms the dispatch mechanism and its reported HTTP "
               "status, not that a payload was actually received "
               "byte-for-byte by an external listener")
    checks.append(c)

    # -----------------------------------------------------------------
    # T4.4 / T4.5 certificates + signed judge participation record
    # -----------------------------------------------------------------
    c = Check("T4", "issued certificate is retrievable with real fields")
    status, body = request(url("certificates"), header=auth.get("judge_a") or auth.get("organizer"))
    parsed = parse_json(body)
    certs = parsed if isinstance(parsed, list) else dig(parsed, "data", default=[])
    cert = certs[0] if certs else None
    if cert:
        required = ("id", "recipientName", "role", "signature", "issuedAt")
        c.ok = status == 200 and all(k in cert for k in required)
        if not c.ok:
            c.note(f"GET {url('certificates')}")
            c.note(f"got a certificate record missing one of {required}: {cert!r}")
    else:
        c.skip("no certificate is available for this identity yet, and this "
               "checker will not guess the POST body for "
               "/api/certificates/issue since it was not specified -- tell "
               "me the exact issue request shape (recipient identified by "
               "userId? email+role?) and I will add a real issuance probe")
    checks.append(c)

    c = Check("T4", "judge participation record is publicly verifiable")
    if cert is None:
        c.skip("no certificate id available to verify (see previous check)")
    else:
        cert_id = cert.get("id")
        status, body = request(url("cert_verify") + f"/{cert_id}")
        parsed = parse_json(body)
        c.ok = (
            status == 200
            and dig(parsed, "isValid") is True
            and dig(parsed, "status") == "OFFICIALLY_VERIFIED"
            and bool(dig(parsed, "signature"))
        )
        if not c.ok:
            c.note(f"GET {url('cert_verify')}/{cert_id}")
            c.note("no auth header (public verification route)")
            c.note(f"got {status or 'no response'}, parsed isValid="
                   f"{dig(parsed, 'isValid')!r}, status={dig(parsed, 'status')!r}")
        c.note("limitation: verification here is HMAC-SHA256 with a secret "
               "held only by the server -- this confirms the server's own "
               "verify endpoint is internally consistent, but a third party "
               "cannot independently recompute the signature without that "
               "secret, so this is weaker than true public-key verifiability")
    checks.append(c)

    # -----------------------------------------------------------------
    # T4.6 embeddable widget: the script tag, and the page it points at
    # -----------------------------------------------------------------
    c = Check("T4", "embeddable widget script produces a real embed")
    status, body = request(url("embed_script"))
    c.ok = status == 200 and "iframe" in body.lower() and "dogfood-gallery-widget" in body
    if not c.ok:
        c.note(f"GET {url('embed_script')}")
        c.note(f"got {status or 'no response'}, wanted JS that builds an "
               "iframe targeting the #dogfood-gallery-widget container")
    checks.append(c)

    c = Check("T4", "embedded gallery page renders real project data")
    status, body = request(url("embed_page"))
    haystack = body.lower()
    titles = fixture_titles(fixture)
    c.ok = status == 200 and any(t.lower() in haystack for t in titles)
    if not c.ok:
        c.note(f"GET {url('embed_page')}")
        c.note(f"got {status or 'no response'}")
        if status == 200:
            c.note("none of the sampled fixture project titles appeared in "
                   "the embedded page body")
    checks.append(c)

    # -----------------------------------------------------------------
    # T4.7 bulk export returns a real, structured event bundle
    # -----------------------------------------------------------------
    c = Check("T4", "bulk export returns a structured event bundle")
    status, body = request(url("bulk_export"), header=auth.get("organizer"))
    parsed = parse_json(body)
    bundle = dig(parsed, "data", default=parsed) if isinstance(parsed, dict) else None
    has_content = isinstance(bundle, dict) and any(
        isinstance(bundle.get(k), list) and bundle.get(k)
        for k in ("submissions", "judges", "tracks", "criteria")
    )
    titles = fixture_titles(fixture)
    export_titles = {
        s.get("title") for s in (bundle.get("submissions", []) if bundle else [])
        if isinstance(s, dict)
    }
    fixture_hit = any(t in export_titles for t in titles)
    c.ok = status == 200 and has_content and fixture_hit
    if not c.ok:
        c.note(f"GET {url('bulk_export')}")
        c.note("sent as organizer")
        if status != 200:
            c.note(f"got {status or 'no response'}, wanted 200")
        elif not has_content:
            c.note("expected a JSON object with non-empty submissions/"
                   "judges/tracks/criteria lists")
        else:
            c.note("none of the sampled fixture project titles were found "
                   "in the exported submissions")
    checks.append(c)

    # -----------------------------------------------------------------
    # T4.8 bulk import accepts a unique probe project, and it round-trips
    # -----------------------------------------------------------------
    c = Check("T4", "bulk import accepts a probe project and it round-trips")
    track_name = fixture_track_name(fixture)
    probe_title = unique_token("dogfood-bulk-import-probe")
    import_body = {
        "projects": [{
            "title": probe_title,
            "teamName": unique_token("dogfood-bulk-team"),
            "trackName": track_name,
            "status": "SUBMITTED",
        }]
    }
    status, body = request(url("bulk_import"), header=auth.get("organizer"),
                           method="POST", body=import_body)
    parsed = parse_json(body)
    imported_titles = {
        s.get("title") for s in dig(parsed, "data", "submissions", default=[])
        if isinstance(s, dict)
    }
    accepted = status == 201 and dig(parsed, "data", "importedCount", default=0) >= 1 \
        and probe_title in imported_titles
    round_tripped = False
    if accepted:
        _, gallery_body = request(url("api"))
        gallery_json = parse_json(gallery_body)
        gallery_items = dig(gallery_json, "data", default=[])
        round_tripped = any(
            isinstance(i, dict) and i.get("title") == probe_title for i in gallery_items
        )
    c.ok = accepted and round_tripped
    if not c.ok:
        c.note(f"POST {url('bulk_import')} then GET {url('api')}")
        c.note(f"sent unique teamName/title each run so this stays safely "
               "repeatable (this implementation is not idempotent and "
               "409s on a reused team name)")
        if not accepted:
            c.note(f"got {status or 'no response'}, wanted 201 with the "
                   "probe title present in data.submissions")
        elif not round_tripped:
            c.note("import reported success but the probe title was not "
                   "subsequently visible via the public submissions API")
    checks.append(c)

    return checks


# ============================================================
# Reporting
# ============================================================

def main():
    ap = argparse.ArgumentParser(description="DOGFOOD 2026 extended acceptance checker")
    ap.add_argument("config", help="path to .dogfood.toml")
    ap.add_argument("--fixtures", default=None,
                    help="path to fixtures.json (searched for if omitted)")
    args = ap.parse_args()

    cfg = load_config(args.config)

    fixture, fixture_path = load_fixture(args.fixtures, args.config)
    claimed = [t for t in cfg.get("tiers", {}).get("claimed", []) if t in TIERS]

    print("DOGFOOD 2026 acceptance report (extended)")
    print(f"portal: {cfg['portal']['base_url']}")
    print(f"claimed: {' '.join(claimed) or 'nothing'}")
    if fixture is None:
        print("note: fixtures.json was not found, so fixture-dependent "
              "checks will fail. Put it next to this script or pass its path.")
    else:
        print(f"fixtures: {fixture_path}")
    print()

    checks = (
        build_t1_t2_checks(cfg, fixture)
        + build_t3_checks(cfg, fixture)
        + build_t4_checks(cfg, fixture)
    )

    width = max(len(c.label) for c in checks) + 2
    for c in checks:
        dots = "." * (width - len(c.label))
        if c.skipped:
            status_word = "SKIP"
        else:
            status_word = "PASS" if c.ok else "FAIL"
        print(f"{c.tier}  {c.label} {dots} {status_word}")
        for line in c.detail:
            print(f"       {line}")

    # A skipped check does not count as a pass; a tier is only solid if
    # every non-skipped check passed AND nothing in it was skipped either,
    # since a skip means the tier was not actually proven this run.
    def tier_solid(t):
        tier_checks = [c for c in checks if c.tier == t]
        return bool(tier_checks) and all(c.ok and not c.skipped for c in tier_checks)

    solid = []
    for t in TIERS:
        if tier_solid(t):
            solid.append(t)
        else:
            break

    print()
    print(f"claimed {' '.join(claimed) or 'nothing'}, "
          f"verified {' '.join(solid) or 'nothing'}")

    overclaim = [t for t in claimed if t not in solid]
    if overclaim:
        print(f"note: claimed but not verified: {' '.join(overclaim)}")

    skips = [c for c in checks if c.skipped]
    if skips:
        print(f"note: {len(skips)} check(s) were skipped rather than run "
              "-- see SKIP lines above for what's needed to complete them")

    return 0


if __name__ == "__main__":
    sys.exit(main())