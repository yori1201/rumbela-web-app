"use client";

/* Lapisan Google Drive Rumbela v2.
   - Login GIS (token client, scope drive.file) — persis arsitektur v1.
   - Sesi persisten di localStorage: token masih berlaku → langsung masuk
     TANPA popup apa pun (perbaikan bug v1 yang memunculkan window login
     setiap kali buka web karena selalu requestAccessToken saat load).
   - Token kedaluwarsa → banner "Sambung ulang" (klik manual), tidak pernah
     ada popup otomatis. */

export const GDRIVE_CLIENT_ID =
  "149416737862-lispiijdp0ktj8v4e3gc47trlbfise40.apps.googleusercontent.com";
export const GDRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const GDRIVE_FILENAME = "rumbela-database.json";
export const GDRIVE_MAT_FOLDER = "Rumbela — Bank Materi";

const SESSION_KEY = "rumbela-v2-session";

export interface Session {
  token: string;
  expiresAt: number;
  email: string;
}

export interface DriveErr extends Error {
  status?: number;
  detail?: string;
  apiDisabled?: boolean;
}

/* ---------- Sesi persisten ---------- */

export function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (s && typeof s.token === "string" && typeof s.expiresAt === "number") return s;
  } catch {
    /* abaikan */
  }
  return null;
}

export function persistSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* penyimpanan tidak tersedia */
  }
}

/* ---------- GIS loader ---------- */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void;
            error_callback?: (err: unknown) => void;
          }): { requestAccessToken(overrides?: { prompt?: string; hint?: string }): void };
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

let gisLoading: Promise<boolean> | null = null;

export function ensureGis(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.google?.accounts?.oauth2) return Promise.resolve(true);
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(!!window.google?.accounts?.oauth2);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
    setTimeout(() => resolve(!!window.google?.accounts?.oauth2), 8000);
  });
  return gisLoading;
}

/* ---------- Fetch dengan error informatif (port dari v1) ---------- */

export async function driveFetch(token: string, url: string, opts: RequestInit = {}): Promise<Response> {
  const headers = new Headers(opts.headers);
  headers.set("Authorization", `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch {
    const e = new Error("network") as DriveErr;
    e.detail = "Tidak ada respons dari server Google, periksa koneksi internet.";
    throw e;
  }
  if (!res.ok) {
    const txt = await res.text();
    const e = new Error(`HTTP ${res.status}`) as DriveErr;
    e.status = res.status;
    e.detail = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(txt);
      const ge = j?.error;
      if (ge) {
        if (ge.message) e.detail = ge.message;
        const reason = ge.errors?.[0]?.reason || "";
        if (
          reason === "accessNotConfigured" ||
          ge.status === "SERVICE_DISABLED" ||
          /has not been used in project|is disabled/i.test(ge.message || "")
        ) {
          e.apiDisabled = true;
        }
      }
    } catch {
      /* bukan JSON — biarkan detail default */
    }
    throw e;
  }
  return res;
}

/* ---------- Operasi file database ---------- */

export async function findDbFile(token: string): Promise<{ id: string; size: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name = '${GDRIVE_FILENAME}' and trashed = false`);
  const fields = encodeURIComponent("files(id,name,modifiedTime,size)");
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime%20desc`
  );
  const j = await res.json();
  return j.files?.[0] ?? null;
}

export async function downloadDb(token: string, id: string): Promise<unknown> {
  const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  return res.json();
}

export async function createDb(token: string, json: string): Promise<string> {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify({ name: GDRIVE_FILENAME, mimeType: "application/json" })], {
      type: "application/json",
    })
  );
  form.append("file", new Blob([json], { type: "application/json" }));
  const res = await driveFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", body: form }
  );
  const j = await res.json();
  return j.id;
}

export async function updateDb(token: string, id: string, json: string): Promise<void> {
  await driveFetch(token, `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: json,
  });
}

export async function fetchUserEmail(token: string): Promise<string> {
  try {
    const res = await driveFetch(
      token,
      "https://www.googleapis.com/drive/v3/about?fields=" + encodeURIComponent("user(emailAddress)")
    );
    const j = await res.json();
    return j?.user?.emailAddress || "";
  } catch {
    return "";
  }
}

/* ---------- Bank Materi: folder & upload file ---------- */

export async function ensureMatFolder(token: string): Promise<string | null> {
  try {
    const q = encodeURIComponent(
      `name = '${GDRIVE_MAT_FOLDER}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    );
    const res = await driveFetch(token, `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent("files(id)")}`);
    const j = await res.json();
    if (j.files?.length) return j.files[0].id as string;
    const res2 = await driveFetch(token, "https://www.googleapis.com/drive/v3/files?fields=id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: GDRIVE_MAT_FOLDER, mimeType: "application/vnd.google-apps.folder" }),
    });
    const j2 = await res2.json();
    return j2.id || null;
  } catch {
    return null;
  }
}

export async function uploadMaterialFile(
  token: string,
  file: File
): Promise<{ id: string; name: string } | null> {
  const folderId = await ensureMatFolder(token);
  const meta: Record<string, unknown> = { name: file.name, mimeType: file.type || "application/octet-stream" };
  if (folderId) meta.parents = [folderId];
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
  form.append("file", file);
  const res = await driveFetch(
    token,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name",
    { method: "POST", body: form }
  );
  return res.json();
}

export async function deleteDriveFile(token: string, id: string): Promise<void> {
  try {
    await driveFetch(token, `https://www.googleapis.com/drive/v3/files/${id}`, { method: "DELETE" });
  } catch {
    /* abaikan — entri katalog tetap terhapus */
  }
}

export function driveViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}
