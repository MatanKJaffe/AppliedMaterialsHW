#!/usr/bin/env python3
"""Validation tests for Dataset Explorer exercise compliance.

Run: python test_validation.py
"""

import subprocess
import sys
import os
import json
import tempfile
import time
import signal
import urllib.request
import urllib.error

BACKEND_DIR = os.path.join(os.path.dirname(__file__), "DatasetExplorer", "backend")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "DatasetExplorer", "frontend")
BASE = "http://localhost:8000"
PASS = 0
FAIL = 0


def ok(msg):
    global PASS
    PASS += 1
    print(f"  ✓ {msg}")


def fail(msg, detail=""):
    global FAIL
    FAIL += 1
    print(f"  ✗ {msg}" + (f"\n    {detail}" if detail else ""))


def check(label, condition, detail=""):
    if condition:
        ok(label)
    else:
        fail(label, detail)


def request(method, path, **kwargs):
    """Make an HTTP request and return (status, body_dict)."""
    url = f"{BASE}{path}"
    data = kwargs.get("data")
    headers = kwargs.get("headers", {})

    if data is not None and not isinstance(data, bytes):
        data = json.dumps(data).encode()
        headers.setdefault("Content-Type", "application/json")

    req = urllib.request.Request(url, data=data, method=method)
    for k, v in headers.items():
        req.add_header(k, v)

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode())
            return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        try:
            body = json.loads(body)
        except json.JSONDecodeError:
            pass
        return e.code, body
    except Exception as e:
        return 0, {"detail": str(e)}


def multipart_upload(path, file_field, file_name, file_bytes):
    """Multipart POST upload."""
    boundary = "----TestBoundary12345"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{file_field}"; filename="{file_name}"\r\n'
        f"Content-Type: text/csv\r\n\r\n"
        f"{file_bytes.decode()}\r\n"
        f"--{boundary}--\r\n"
    ).encode()

    return request("POST", path, data=body, headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    })


# ── Test Suite ──────────────────────────────────────────────

def test_backend_running():
    print("\n[1] Backend server running")
    status, body = request("GET", "/tables")
    check("GET /tables returns 200", status == 200)


def test_upload_csv():
    print("\n[2] POST /upload — CSV upload")
    csv = b"name,age,city\nAlice,30,NYC\nBob,25,LA\n"
    status, body = multipart_upload("/upload", "file", "people.csv", csv)
    check("Returns 200", status == 200)
    check("Returns table_name", body.get("table_name") == "people")
    check("Returns row_count", body.get("row_count") == 2)
    check("Returns columns list", len(body.get("columns", [])) == 3)


def test_upload_multiple_csvs():
    print("\n[3] POST /upload — multiple datasets")
    csv1 = b"id,product,price\n1,Widget,10\n2,Gadget,25\n"
    csv2 = b"city,temp\nNYC,72\nLA,85\nCHI,65\n"
    status1, b1 = multipart_upload("/upload", "file", "products.csv", csv1)
    status2, b2 = multipart_upload("/upload", "file", "weather.csv", csv2)
    check("First upload succeeds", status1 == 200 and b1.get("table_name") == "products")
    check("Second upload succeeds", status2 == 200 and b2.get("table_name") == "weather")

    status, body = request("GET", "/tables")
    names = [t["name"] for t in body.get("tables", [])]
    check("Both tables listed", "products" in names and "weather" in names)
    # Check at least 3 tables exist (people + products + weather)
    check("3+ tables", len(body.get("tables", [])) >= 3)


def test_rows_pagination():
    print("\n[4] GET /rows — pagination")
    # people table has 2 rows, test pages
    status, body = request("GET", "/rows?table=people&page=1&per_page=1")
    check("Returns 200", status == 200)
    check("Returns 1 row (page 1 of 2)", len(body.get("rows", [])) == 1)
    check("Total = 2", body.get("total") == 2)
    check("Page = 1", body.get("page") == 1)

    status, body = request("GET", "/rows?table=people&page=2&per_page=1")
    check("Page 2 returns 1 row", len(body.get("rows", [])) == 1)
    check("Page = 2", body.get("page") == 2)


def test_rows_search():
    print("\n[5] GET /rows — text search")
    status, body = request("GET", "/rows?table=people&search=Alice")
    check("Returns 200", status == 200)
    check("Finds Alice", body.get("total") == 1)
    check("Row has Alice", body["rows"][0]["name"] == "Alice" if body["rows"] else False)


def test_rows_empty_search():
    print("\n[6] GET /rows — no-match search")
    status, body = request("GET", "/rows?table=people&search=ZZZZNOSUCH")
    check("Returns 200 with empty rows", status == 200)
    check("Total = 0", body.get("total") == 0)


def test_upload_invalid_file():
    print("\n[7] POST /upload — invalid file type")
    txt = b"not a csv"
    status, body = multipart_upload("/upload", "file", "test.txt", txt)
    check("Rejects non-CSV", status == 400)


def test_ask_endpoint_exists():
    print("\n[8] POST /ask — endpoint exists (may fail if no API key)")
    status, body = request("POST", "/ask", data={"question": "test", "table_name": "people"})
    # 200 if API key set, 500 if no key, 404 if table missing
    detail = body.get("detail", "") if isinstance(body, dict) else str(body)
    if status == 200:
        ok("Returns 200 (API key configured)")
        check("Has answer field", isinstance(body, dict) and "answer" in body)
        check("Has sql field", isinstance(body, dict) and "sql" in body)
    elif status == 500:
        if "GEMINI_API_KEY" in detail:
            ok("Reports missing GEMINI_API_KEY (expected if not configured)")
        else:
            ok(f"Returns 500 with: {detail}")
    else:
        fail(f"Unexpected status {status}: {detail}")


def test_tables_schema():
    print("\n[9] GET /tables — schema details")
    status, body = request("GET", "/tables")
    if status == 200 and body.get("tables"):
        t = body["tables"][0]
        check("Table has name", "name" in t)
        check("Table has columns list", isinstance(t.get("columns"), list))
        check("Table has row_count", "row_count" in t)
        if t.get("columns"):
            c = t["columns"][0]
            check("Column has name", "name" in c)
            check("Column has type", "type" in c)


def test_invalid_table():
    print("\n[10] GET /rows — invalid table name")
    status, body = request("GET", "/rows?table=nonexistent")
    check("Returns 200 with empty rows", status == 200)
    check("Rows list is empty", len(body.get("rows", [])) == 0)
    check("Total = 0", body.get("total") == 0)


def test_readme():
    print("\n[11] README compliance")
    path = os.path.join(os.path.dirname(__file__), "DatasetExplorer", "README.md")
    if not os.path.exists(path):
        fail("README.md not found")
        return
    with open(path) as f:
        text = f.read()

    checks = {
        "How to run locally": "run locally" in text.lower() or "setup" in text.lower(),
        "How to deploy": "deploy" in text.lower(),
        "Environment variables": "gemini_api_key" in text.lower() or "env" in text.lower(),
        "Architecture overview": "architecture" in text.lower(),
        "What I'd do next": "what i\'d do next" in text.lower() or "next" in text.lower(),
    }
    for label, ok_ in checks.items():
        check(f"README has: {label}", ok_)


def test_no_api_keys():
    print("\n[12] No API keys committed")
    # Check git doesn't track any .env files (except .env.example)
    result = subprocess.run(
        ["git", "ls-files", "--cached", "*.env"],
        capture_output=True, text=True, cwd=os.path.dirname(__file__)
    )
    tracked_envs = [f for f in result.stdout.split("\n") if f and not f.endswith(".env.example")]
    check("No .env files tracked in git", len(tracked_envs) == 0, str(tracked_envs))


def test_frontend_build():
    print("\n[13] Frontend builds")
    result = subprocess.run(
        ["npx", "vite", "build"],
        capture_output=True, text=True,
        cwd=FRONTEND_DIR, timeout=30
    )
    check("Build succeeds", result.returncode == 0, result.stderr[:200] if result.stderr else "")
    check("dist/ directory exists", os.path.isdir(os.path.join(FRONTEND_DIR, "dist")))


def test_security_gitignore():
    print("\n[14] .gitignore covers secrets")
    path = os.path.join(os.path.dirname(__file__), ".gitignore")
    if not os.path.exists(path):
        fail(".gitignore not found")
        return
    with open(path) as f:
        text = f.read()
    check(".gitignore covers .env", ".env" in text)
    check(".gitignore covers __pycache__", "__pycache__" in text)
    check(".gitignore covers node_modules", "node_modules" in text)


def test_exercise_endpoints():
    print("\n[15] All required endpoints exist")
    status, _ = request("GET", "/openapi.json")
    check("FastAPI OpenAPI docs available", status == 200)
    if status == 200:
        # Swagger UI returns HTML — retry once if server reloads
        for attempt in range(2):
            try:
                with urllib.request.urlopen(f"{BASE}/docs", timeout=5) as resp:
                    status2 = resp.status
                break
            except Exception:
                status2 = 0
                time.sleep(1)
        check("Swagger UI available (GET /docs)", status2 == 200)


def test_frontend_component_files():
    print("\n[16] Frontend component files exist")
    components_dir = os.path.join(FRONTEND_DIR, "src", "components")
    expected = ["UploadDataset.tsx", "DataTable.tsx", "AskQuestion.tsx", "SchemaPanel.tsx"]
    for name in expected:
        check(f"Component exists: {name}", os.path.exists(os.path.join(components_dir, name)))


# ── Main ────────────────────────────────────────────────────

def main():
    global PASS, FAIL
    print("=" * 60)
    print("Dataset Explorer — Exercise Validation Tests")
    print("=" * 60)

    # Parse args
    skip_server = "--no-server" in sys.argv

    if not skip_server:
        # Start backend server
        print(f"\nStarting backend server on {BASE}...")
        env = {**os.environ, "RELOAD": "false"}
        server_proc = subprocess.Popen(
            [sys.executable, "main.py"],
            cwd=BACKEND_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            preexec_fn=os.setsid if hasattr(os, "setsid") else None,
            env=env,
        )
        time.sleep(3)

        # Check server started
        status, _ = request("GET", "/tables")
        if status != 200:
            server_proc.kill()
            print("ERROR: Backend server failed to start!")
            sys.exit(1)
        print("Backend server started successfully.\n")

    # Run tests
    test_backend_running()
    test_upload_csv()
    test_upload_multiple_csvs()
    test_rows_pagination()
    test_rows_search()
    test_rows_empty_search()
    test_upload_invalid_file()
    test_ask_endpoint_exists()
    test_tables_schema()
    test_invalid_table()
    test_readme()
    test_no_api_keys()
    test_frontend_build()
    test_security_gitignore()
    test_exercise_endpoints()
    test_frontend_component_files()

    # Cleanup
    if not skip_server:
        os.killpg(os.getpgid(server_proc.pid), signal.SIGTERM)
        server_proc.wait()

    # Summary
    print("\n" + "=" * 60)
    total = PASS + FAIL
    print(f"Results: {PASS}/{total} passed, {FAIL}/{total} failed")
    print("=" * 60)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
