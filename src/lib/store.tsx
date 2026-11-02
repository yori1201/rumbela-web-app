"use client";

/* Store global Rumbela v2: state database + auth Google + auto-save.
   Prinsip:
   - Login sekali: sesi (token + kedaluwarsa + email) tersimpan di perangkat.
     Token masih berlaku → app langsung terbuka tanpa popup apa pun.
   - Token kedaluwarsa: bila ada cache lokal, app tetap terbuka (mode "cache")
     dan banner meminta satu klik "Sambung ulang". Tidak pernah ada popup
     otomatis (perbaikan bug v1).
   - Auto-save: setiap mutasi di-debounce 1,2 detik lalu ditulis ke Drive
     (atau localStorage pada mode demo). Indikator status tampil di header. */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { demoDB } from "./demo";
import { normalizeDB, emptyDB, type Database } from "./types";
import {
  ensureGis, findDbFile, downloadDb, createDb, updateDb, fetchUserEmail,
  readSession, persistSession, driveFetch, type DriveErr, type Session,
} from "./gdrive";

const CACHE_KEY = "rumbela-v2-cache";
const DEMO_KEY = "rumbela-v2-demo";

export type AuthMode = "gdrive" | "demo" | "cache" | null;
export type SyncStatus = "idle" | "saving" | "saved" | "error" | "renew";

export interface SyncState {
  status: SyncStatus;
  lastSavedAt: number | null;
  message: string;
  dirty: boolean;
  apiDisabled: boolean;
  fileId: string | null;
  loadError: string;
}

interface AppCtx {
  db: Database;
  authMode: AuthMode;
  email: string;
  bootDone: boolean;
  connecting: boolean;
  blocked: boolean;
  sync: SyncState;
  mutate: (fn: (draft: Database) => void) => void;
  loginGoogle: () => Promise<void>;
  loginDemo: () => void;
  reconnect: () => Promise<void>;
  logout: () => void;
  saveNow: () => Promise<void>;
  reloadFromDrive: () => Promise<void>;
  replaceDB: (db: Database) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp harus dipakai di dalam AppProvider");
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(() => emptyDB());
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [email, setEmail] = useState("");
  const [bootDone, setBootDone] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [sync, setSync] = useState<SyncState>({
    status: "idle", lastSavedAt: null, message: "", dirty: false,
    apiDisabled: false, fileId: null, loadError: "",
  });

  const tokenRef = useRef<string | null>(null);
  const expiresRef = useRef<number>(0);
  const fileIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const dirtyAgainRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbRef = useRef(db);
  dbRef.current = db;
  const modeRef = useRef<AuthMode>(null);
  modeRef.current = authMode;

  const setToken = (s: Session | null) => {
    tokenRef.current = s?.token ?? null;
    expiresRef.current = s?.expiresAt ?? 0;
    persistSession(s);
  };

  const hasValidToken = () =>
    !!tokenRef.current && expiresRef.current - 60_000 > Date.now();

  /* ---------- simpan ---------- */

  const writeCache = (fileId: string | null, db: Database) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fileId, db }));
    } catch {
      /* storage tidak tersedia */
    }
  };

  const doSave = useCallback(async (force = false): Promise<void> => {
    if (savingRef.current) {
      dirtyAgainRef.current = true;
      return;
    }
    const mode = modeRef.current;
    if (mode === "demo") {
      try {
        localStorage.setItem(DEMO_KEY, JSON.stringify(dbRef.current));
        dirtyRef.current = false;
        setSync((s) => ({ ...s, status: "saved", dirty: false, lastSavedAt: Date.now(), message: "Tersimpan (demo di perangkat ini)" }));
      } catch {
        /* storage penuh — abaikan */
      }
      return;
    }
    if (mode !== "gdrive") return; // mode cache: menunggu sambung ulang
    if (!hasValidToken()) {
      setSync((s) => ({ ...s, status: "renew", message: "Sesi Google berakhir — sambung ulang untuk menyimpan." }));
      return;
    }
    if (!dirtyRef.current && !force) return;
    savingRef.current = true;
    setSync((s) => ({ ...s, status: "saving", message: "Menyimpan ke Google Drive…" }));
    try {
      const json = JSON.stringify(dbRef.current);
      if (fileIdRef.current) {
        await updateDb(tokenRef.current!, fileIdRef.current, json);
      } else {
        fileIdRef.current = await createDb(tokenRef.current!, json);
        setSync((s) => ({ ...s, fileId: fileIdRef.current }));
      }
      dirtyRef.current = false;
      setSync((s) => ({ ...s, status: "saved", dirty: false, lastSavedAt: Date.now(), message: "", loadError: "" }));
      writeCache(fileIdRef.current, dbRef.current);
    } catch (err) {
      const e = err as DriveErr;
      if (e?.status === 401) {
        tokenRef.current = null;
        setSync((s) => ({ ...s, status: "renew", message: "Sesi Google berakhir — sambung ulang untuk menyimpan." }));
      } else {
        setSync((s) => ({
          ...s,
          status: "error",
          message:
            (e?.detail || "Gagal menyimpan ke Drive.") +
            (e?.apiDisabled ? " Aktifkan Google Drive API di project Google Cloud." : " Perubahan tetap aman di perangkat ini."),
        }));
      }
    } finally {
      savingRef.current = false;
      if (dirtyAgainRef.current) {
        dirtyAgainRef.current = false;
        if (dirtyRef.current) void doSave(true);
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => void doSave(), 1200);
  }, [doSave]);

  const mutate = useCallback(
    (fn: (draft: Database) => void) => {
      setDb((prev) => {
        const next: Database = structuredClone(prev);
        fn(next);
        return next;
      });
      dirtyRef.current = true;
      setSync((s) => ({ ...s, dirty: true }));
      scheduleSave();
    },
    [scheduleSave]
  );

  const replaceDB = useCallback(
    (next: Database) => {
      setDb(next);
      dirtyRef.current = true;
      setSync((s) => ({ ...s, dirty: true }));
      scheduleSave();
    },
    [scheduleSave]
  );

  /* ---------- muat dari Drive ---------- */

  const syncFromDrive = useCallback(
    async (token: string): Promise<void> => {
      try {
        const file = await findDbFile(token);
        if (!file) {
          fileIdRef.current = await createDb(token, JSON.stringify(dbRef.current));
          dirtyRef.current = false;
          setSync((s) => ({ ...s, status: "saved", fileId: fileIdRef.current, lastSavedAt: Date.now(), loadError: "" }));
          return;
        }
        fileIdRef.current = file.id;
        setSync((s) => ({ ...s, fileId: file.id }));
        const data = await downloadDb(token, file.id);
        const norm = normalizeDB(data);
        setDb(norm);
        writeCache(file.id, norm);
        dirtyRef.current = false;
        setSync((s) => ({
          ...s, status: "saved", lastSavedAt: file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now(),
          loadError: "",
        }));
      } catch (err) {
        const e = err as DriveErr;
        if (e?.status === 401) {
          tokenRef.current = null;
          setSync((s) => ({ ...s, status: "renew", message: "Sesi Google berakhir — sambung ulang." }));
          throw e;
        }
        setSync((s) => ({
          ...s,
          status: "error",
          loadError:
            (e?.detail || "Gagal memuat database dari Drive.") +
            (e?.apiDisabled
              ? " Google Drive API belum aktif — buka Google Cloud Console → APIs & Services → Library → Google Drive API → Enable."
              : " Auto-save dijeda agar data di Drive tidak tertimpa. Klik 'Coba muat lagi'."),
          apiDisabled: !!e?.apiDisabled,
        }));
        throw e;
      }
    },
    []
  );

  /* ---------- login / sambung ulang ---------- */

  const requestToken = (): Promise<Session | null> =>
    new Promise(async (resolve) => {
      const ok = await ensureGis();
      if (!ok || !window.google?.accounts?.oauth2) {
        resolve(null);
        return;
      }
      let settled = false;
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: "149416737862-lispiijdp0ktj8v4e3gc47trlbfise40.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (resp) => {
          if (settled) return;
          settled = true;
          if (resp?.access_token) {
            resolve({
              token: resp.access_token,
              expiresAt: Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3600_000),
              email: "",
            });
          } else resolve(null);
        },
        error_callback: () => {
          if (settled) return;
          settled = true;
          resolve(null);
        },
      });
      client.requestAccessToken({ prompt: "" });
      setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 120_000);
    });

  const finishConnect = useCallback(
    async (sess: Session, opts: { keepLocalIfDirty: boolean }) => {
      setEmail(sess.email);
      setToken(sess);
      modeRef.current = "gdrive";
      setAuthMode("gdrive");
      if (opts.keepLocalIfDirty && dirtyRef.current) {
        await doSave(true);
        writeCache(fileIdRef.current, dbRef.current);
        return;
      }
      await syncFromDrive(sess.token);
    },
    [doSave, syncFromDrive]
  );

  const loginGoogle = useCallback(async () => {
    setConnecting(true);
    setSync((s) => ({ ...s, message: "", loadError: "" }));
    try {
      const sess = await requestToken();
      if (!sess) {
        setSync((s) => ({
          ...s,
          status: "error",
          message:
            "Login Google gagal / dibatalkan. Pastikan jendela popup Google tidak diblokir, lalu coba lagi. Atau coba Mode Demo.",
        }));
        return;
      }
      sess.email = await fetchUserEmail(sess.token);
      const adminEmail = (dbRef.current.pengaturan.emailAdmin || "").trim().toLowerCase();
      if (adminEmail && sess.email && sess.email.toLowerCase() !== adminEmail) {
        setBlocked(true);
        setToken(null);
        return;
      }
      await finishConnect(sess, { keepLocalIfDirty: false });
    } finally {
      setConnecting(false);
    }
  }, [finishConnect]);

  const reconnect = useCallback(async () => {
    setConnecting(true);
    try {
      const sess = await requestToken();
      if (!sess) {
        setSync((s) => ({ ...s, message: "Sambung ulang gagal / dibatalkan. Coba lagi." }));
        return;
      }
      sess.email = await fetchUserEmail(sess.token);
      const adminEmail = (dbRef.current.pengaturan.emailAdmin || "").trim().toLowerCase();
      if (adminEmail && sess.email && sess.email.toLowerCase() !== adminEmail) {
        setBlocked(true);
        setToken(null);
        return;
      }
      await finishConnect(sess, { keepLocalIfDirty: true });
    } catch {
      /* status sudah diatur syncFromDrive/finishConnect */
    } finally {
      setConnecting(false);
    }
  }, [finishConnect]);

  const loginDemo = useCallback(() => {
    let d: Database | null = null;
    try {
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) d = normalizeDB(JSON.parse(raw));
    } catch { /* abaikan */ }
    if (!d) d = demoDB();
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(d));
    } catch { /* storage tidak tersedia */ }
    setDb(d);
    dirtyRef.current = false;
    modeRef.current = "demo";
    setAuthMode("demo");
    setEmail("demo@rumbela");
    setSync((s) => ({ ...s, status: "saved", dirty: false, lastSavedAt: Date.now(), fileId: null, loadError: "" }));
  }, []);

  const logout = useCallback(() => {
    if (tokenRef.current && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(tokenRef.current, () => {});
      } catch { /* abaikan */ }
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setToken(null);
    fileIdRef.current = null;
    tokenRef.current = null;
    dirtyRef.current = false;
    modeRef.current = null;
    setAuthMode(null);
    setEmail("");
    setBlocked(false);
    setDb(emptyDB());
    setSync({ status: "idle", lastSavedAt: null, message: "", dirty: false, apiDisabled: false, fileId: null, loadError: "" });
  }, []);

  const reloadFromDrive = useCallback(async () => {
    if (!hasValidToken()) {
      await reconnect();
      return;
    }
    setSync((s) => ({ ...s, loadError: "" }));
    try {
      await syncFromDrive(tokenRef.current!);
    } catch { /* status diatur syncFromDrive */ }
  }, [reconnect, syncFromDrive]);

  const saveNow = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    dirtyRef.current = true;
    setSync((s) => ({ ...s, dirty: true }));
    await doSave(true);
  }, [doSave]);

  /* ---------- boot: pulihkan sesi tanpa popup ---------- */

  useEffect(() => {
    let alive = true;
    (async () => {
      const sess = readSession();
      if (sess && sess.expiresAt - 60_000 > Date.now()) {
        tokenRef.current = sess.token;
        expiresRef.current = sess.expiresAt;
        setEmail(sess.email || "");
        modeRef.current = "gdrive";
        setAuthMode("gdrive");
        try {
          await syncFromDrive(sess.token);
        } catch { /* status diatur syncFromDrive */ }
      } else {
        // token kedaluwarsa → pakai cache terakhir (mode cache) bila ada
        let cacheUsed = false;
        try {
          const raw = localStorage.getItem(CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as { fileId?: string; db?: unknown } | Record<string, unknown>;
            // bentuk baru: { fileId, db }; toleransi bentuk lama: db langsung
            const dbRaw = parsed && typeof parsed === "object" && "db" in parsed ? parsed.db : parsed;
            const norm = normalizeDB(dbRaw);
            if (alive && norm.students) {
              setDb(norm);
              fileIdRef.current = (parsed as { fileId?: string }).fileId ?? null;
              modeRef.current = "cache";
              setAuthMode("cache");
              setEmail(sess?.email || "");
              cacheUsed = true;
              setSync((s) => ({ ...s, status: "renew", fileId: fileIdRef.current, message: "Sesi Google berakhir — sambung ulang untuk melanjutkan auto-save." }));
            }
          }
        } catch { /* abaikan */ }
        // bila pengguna terakhir memakai Mode Demo → lanjutkan demo
        if (!cacheUsed && alive) {
          try {
            if (localStorage.getItem(DEMO_KEY)) {
              const norm = normalizeDB(JSON.parse(localStorage.getItem(DEMO_KEY)!));
              setDb(norm);
              modeRef.current = "demo";
              setAuthMode("demo");
              setEmail("demo@rumbela");
              setSync((s) => ({ ...s, status: "saved", lastSavedAt: Date.now() }));
            }
          } catch { /* abaikan */ }
        }
      }
      if (alive) setBootDone(true);
    })();
    return () => {
      alive = false;
    };
     
  }, []);

  /* flush saat tab disembunyikan / ditutup */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current && modeRef.current === "gdrive" && hasValidToken()) {
        void doSave(true);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [doSave]);

  const value = useMemo<AppCtx>(
    () => ({
      db, authMode, email, bootDone, connecting, blocked, sync,
      mutate, loginGoogle, loginDemo, reconnect, logout, saveNow, reloadFromDrive, replaceDB,
    }),
    [db, authMode, email, bootDone, connecting, blocked, sync, mutate, loginGoogle, loginDemo, reconnect, logout, saveNow, reloadFromDrive, replaceDB]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
