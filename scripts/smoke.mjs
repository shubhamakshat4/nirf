/* HTTP smoke test against a running dev server.
   Signs in as every seeded role through the real Auth.js credentials flow,
   then walks each route and checks status codes plus role-specific content.
   Usage: node scripts/smoke.mjs [baseUrl] */

const BASE = process.argv[2] ?? "http://localhost:3000";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "nirf1234";

class Jar {
  constructor() {
    this.cookies = new Map();
  }
  absorb(res) {
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value === "" || /Max-Age=0/i.test(c)) this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function get(jar, path) {
  const res = await fetch(BASE + path, { headers: { cookie: jar.header() }, redirect: "manual" });
  jar.absorb(res);
  const body = await res.text();
  return { status: res.status, location: res.headers.get("location"), body };
}

async function login(email) {
  const jar = new Jar();
  const csrfRes = await fetch(BASE + "/api/auth/csrf");
  jar.absorb(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const form = new URLSearchParams({ email, password: PASSWORD, csrfToken, callbackUrl: BASE + "/" });
  const res = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: jar.header() },
    body: form,
    redirect: "manual",
  });
  jar.absorb(res);
  const ok = [...jar.cookies.keys()].some((k) => k.includes("session-token"));
  return { jar, ok, status: res.status, location: res.headers.get("location") };
}

const results = [];
let failures = 0;
function check(name, cond, detail = "") {
  results.push({ check: name, result: cond ? "PASS" : "FAIL", detail });
  if (!cond) failures++;
}

const ROUTES = ["/", "/data", "/data/review", "/gaps", "/plan", "/scenarios", "/cycles", "/settings", "/method"];

// Which routes each role may open (200) vs is bounced from (307 to /).
const ALLOWED = {
  CONTRIBUTOR: ["/", "/data", "/method"],
  LEADERSHIP: ["/", "/data", "/gaps", "/plan", "/scenarios", "/method"],
  IQAC: ROUTES,
};

const USERS = [
  ["iqac@ssu.edu", "IQAC"],
  ["vc@ssu.edu", "LEADERSHIP"],
  ["research@ssu.edu", "CONTRIBUTOR"],
  ["placement@ssu.edu", "CONTRIBUTOR"],
  ["admissions@ssu.edu", "CONTRIBUTOR"],
  ["registrar@ssu.edu", "CONTRIBUTOR"],
];

// signed-out
{
  const jar = new Jar();
  const r = await get(jar, "/");
  check("signed out: / redirects to /login", r.status === 307 && /\/login/.test(r.location ?? ""), `${r.status} ${r.location}`);
  const l = await get(jar, "/login");
  check("signed out: /login renders the form", l.status === 200 && l.body.includes('name="password"'), String(l.status));
  const bad = await login("iqac@ssu.edu".replace("iqac", "nobody"));
  check("bad credentials: no session cookie", !bad.ok, `${bad.status} ${bad.location}`);
}

for (const [email, role] of USERS) {
  const { jar, ok, status, location } = await login(email);
  check(`${email}: sign-in issues a session cookie`, ok, `${status} ${location}`);
  if (!ok) continue;
  for (const path of ROUTES) {
    const r = await get(jar, path);
    const allowed = ALLOWED[role].includes(path);
    const pass = allowed ? r.status === 200 : r.status === 307 && (r.location ?? "").endsWith("/");
    check(`${role} ${path}`, pass, allowed ? `expected 200, got ${r.status}` : `expected 307→/, got ${r.status} ${r.location ?? ""}`);
    if (r.status !== 200) continue;
    // Role-specific content checks
    if (path === "/") {
      const hasScore = /Composite readiness score/.test(r.body);
      check(`${role} /: ${role === "CONTRIBUTOR" ? "hides" : "shows"} the composite`, role === "CONTRIBUTOR" ? !hasScore : hasScore);
      check(`${role} /: readout strip with band ruler`, /class="ruler"/.test(r.body));
      const nav = [...r.body.matchAll(/<a[^>]*href="([^"]+)"[^>]*>(?:<strong>)/g)].map((m) => m[1]);
      check(`${role} /: nav has ${ALLOWED[role].length} items`, nav.length === ALLOWED[role].length, nav.join(","));
      if (role !== "CONTRIBUTOR") check(`${role} /: composite 46.7 from seed`, /46\.7/.test(r.body));
      if (role === "CONTRIBUTOR") check(`${role} /: no parameter scores leaked`, !/score \d+\.\d \/ 100/.test(r.body) && !/46\.7/.test(r.body));
    }
    if (path === "/data" && role === "CONTRIBUTOR") {
      const headings = [...r.body.matchAll(/<h3 id="h-(\w+)"/g)].map((m) => m[1]);
      check(`${email} /data: shows exactly one owned parameter`, headings.length === 1, headings.join(","));
      check(`${email} /data: no parameter score in header`, !/score \d+\.\d \/ 100/.test(r.body));
    }
    if (path === "/data" && role !== "CONTRIBUTOR") {
      const headings = [...r.body.matchAll(/<h3 id="h-(\w+)"/g)].map((m) => m[1]);
      check(`${role} /data: shows all five parameters`, headings.length === 5, headings.join(","));
    }
    if (path === "/plan") {
      check(`${role} /plan: feasibility verdict present`, /is reachable but tight|On track|not reachable|would need roughly/.test(r.body));
      check(`${role} /plan: year-one movers non-empty`, /2027[\s\S]*?checkpoint score[\s\S]*?<ul>[\s\S]*?<li>/.test(r.body));
      check(`${role} /plan: Top 100 target line`, /target 42/.test(r.body));
    }
    if (path === "/gaps") {
      const lever = r.body.split("Highest-leverage moves")[1] ?? "";
      const rows = (lever.split("</table>")[0].match(/<tr>/g) ?? []).length - 1; // minus the header row
      check(`${role} /gaps: leverage table has 16 rows`, rows === 16, String(rows));
      check(`${role} /gaps: priority table has 5 parameters`, /Priority index follows/.test(r.body) && (r.body.replace(/<!-- -->/g, "").match(/<td>(TLR|RP|GO|OI|PR) — /g) ?? []).length === 5);
    }
    if (path === "/cycles") check(`${role} /cycles: both cycles listed`, /2025/.test(r.body) && /2026/.test(r.body) && /locked/.test(r.body));
    if (path === "/settings") check(`${role} /settings: user table lists 6 users`, (r.body.match(/@ssu\.edu/g) ?? []).length >= 6);
    if (path === "/method") check(`${role} /method: caveats carried over`, /rationale-based rather than empirically fitted/.test(r.body) && /X71–X79/.test(r.body));
  }
}

console.table(results);
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures ? 1 : 0);
