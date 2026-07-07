// Storage layer: keeps app data in one JSON document, cached in localStorage,
// and synced to a GitHub repo file via the Contents API so the same data is
// reachable from any browser. The token lives only in this browser's localStorage
// and is sent only to api.github.com.

const LS_KEYS = {
  settings: "wt_settings_v1",
  cache: "wt_data_cache_v1",
};

const DEFAULT_DATA = () => ({
  logs: [],
  plans: {},
  library: { exercises: {}, foods: {} },
  meta: { version: 2 }
});

function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.settings)) || {};
  } catch (e) {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem(LS_KEYS.settings, JSON.stringify(settings));
}

function isConfigured() {
  const s = getSettings();
  return !!(s.owner && s.repo && s.token);
}

function getCachedData() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.cache)) || DEFAULT_DATA();
  } catch (e) {
    return DEFAULT_DATA();
  }
}

function setCachedData(data) {
  localStorage.setItem(LS_KEYS.cache, JSON.stringify(data));
}

function apiUrl(settings) {
  const path = settings.path || "workout-data.json";
  return `https://api.github.com/repos/${settings.owner}/${settings.repo}/contents/${encodeURIComponent(path)}`;
}

function utf8ToB64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function b64ToUtf8(str) {
  return decodeURIComponent(escape(atob(str)));
}

// Fetch remote file. Returns { data, sha } or throws.
async function fetchRemote() {
  const settings = getSettings();
  if (!isConfigured()) throw new Error("not_configured");
  const url = apiUrl(settings) + `?ref=${encodeURIComponent(settings.branch || "main")}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (res.status === 404) {
    return { data: DEFAULT_DATA(), sha: null };
  }
  const rawText = await res.text();
  if (!res.ok) {
    let msg = rawText.slice(0, 200) || "(empty response body)";
    try { msg = JSON.parse(rawText).message || msg; } catch (e) { /* keep raw snippet */ }
    throw new Error(`GitHub GET failed — status ${res.status}: ${msg}`);
  }
  if (!rawText.trim()) {
    throw new Error(`GitHub GET returned status ${res.status} with an empty body (unexpected — check token scope/repo access).`);
  }
  let json;
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    throw new Error(`GitHub GET returned non-JSON (status ${res.status}): ${rawText.slice(0, 200)}`);
  }
  if (!json.content) {
    throw new Error(`GitHub response had no file content — is "${settings.path || "workout-data.json"}" actually a file (not a folder)?`);
  }
  const decoded = b64ToUtf8(json.content.replace(/\n/g, ""));
  let parsed;
  try {
    parsed = decoded.trim() ? JSON.parse(decoded) : DEFAULT_DATA();
  } catch (e) {
    parsed = DEFAULT_DATA();
  }
  return { data: parsed, sha: json.sha };
}

let lastSha = null;
let syncTimer = null;
let syncStatusCallback = null;

function onSyncStatus(cb) { syncStatusCallback = cb; }
function setStatus(status, detail) {
  if (syncStatusCallback) syncStatusCallback(status, detail);
}

async function pushRemote(data) {
  const settings = getSettings();
  if (!isConfigured()) return;
  const body = {
    message: `Update workout data ${new Date().toISOString()}`,
    content: utf8ToB64(JSON.stringify(data, null, 2)),
    branch: settings.branch || "main",
  };
  if (lastSha) body.sha = lastSha;
  const res = await fetch(apiUrl(settings), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  if (!res.ok) {
    let msg = rawText.slice(0, 200) || "(empty response body)";
    try { msg = JSON.parse(rawText).message || msg; } catch (e) { /* keep raw snippet */ }
    // If sha mismatch (someone else wrote in the meantime), refetch and retry once
    if (res.status === 409 || msg.includes("sha")) {
      const remote = await fetchRemote();
      lastSha = remote.sha;
      body.sha = remote.sha;
      const retry = await fetch(apiUrl(settings), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${settings.token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const retryText = await retry.text();
      if (!retry.ok) throw new Error(`GitHub PUT retry failed — status ${retry.status}: ${retryText.slice(0, 200) || "(empty body)"}`);
      const retryJson = JSON.parse(retryText);
      lastSha = retryJson.content.sha;
      return;
    }
    throw new Error(`GitHub PUT failed — status ${res.status}: ${msg}`);
  }
  if (!rawText.trim()) {
    throw new Error(`GitHub PUT returned status ${res.status} with an empty body (unexpected).`);
  }
  const json = JSON.parse(rawText);
  lastSha = json.content.sha;
}

// Public API: the app works against this in-memory object, call save() after mutating.
let appData = getCachedData();

async function initStorage() {
  setCachedData(appData); // ensure cache exists
  if (isConfigured()) {
    setStatus("syncing");
    try {
      const remote = await fetchRemote();
      appData = remote.data;
      lastSha = remote.sha;
      setCachedData(appData);
      setStatus("synced");
    } catch (e) {
      setStatus("error", e.message);
    }
  } else {
    setStatus("local-only");
  }
  return appData;
}

function getData() {
  return appData;
}

function save(mutatorFn) {
  // mutatorFn receives the data object and mutates it in place
  mutatorFn(appData);
  setCachedData(appData);
  if (syncTimer) clearTimeout(syncTimer);
  if (isConfigured()) {
    setStatus("pending");
    syncTimer = setTimeout(async () => {
      try {
        setStatus("syncing");
        await pushRemote(appData);
        setStatus("synced");
      } catch (e) {
        setStatus("error", e.message);
      }
    }, 1200);
  }
}

async function forceSync() {
  if (!isConfigured()) return;
  setStatus("syncing");
  try {
    await pushRemote(appData);
    setStatus("synced");
  } catch (e) {
    setStatus("error", e.message);
  }
}

async function testConnection(settings) {
  const url = `https://api.github.com/repos/${settings.owner}/${settings.repo}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) throw new Error(`Repo check failed (${res.status})`);
  return await res.json();
}
