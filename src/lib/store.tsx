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
import { looksValidV1, normalizeDB, emptyDB, type Database } from "./types";
import {
  ensureGis, findDbFile, downloadDb, createDb, updateDb, updateDbKeepalive, fetchUserEmail,
  readSession, persistSession, driveFetch, type DriveErr, type Session,
} from "./gdrive";
import { clearOutbox, outboxHasUnsyncedChanges, readOutbox, writeOutbox } from "./outbox";

const CACHE_KEY = "rumbela-v2-cache";
const DEMO_KEY = "rumbela-v2-demo";

export type AuthMode = "gdrive" | "demo" | "cache" | null;
/* "pending" = ada perubahan yang belum tersimpan (masih dalam debounce
 *  atau menunggu sambung ulang). "Tersimpan HH:mm" hanya dipakai bila
 *  status "saved", yaitu simpan sudah terkonfirmasi (R5). */
export type SyncStatus = "idle" | "pending" | "saving" | "saved" | "error" | "renew";

export interface SyncState {
  status: SyncStatus;
  lastSavedAt: number | null;
  message: string;
  dirty: boolean;
  /** jumlah perubahan yang belum tersimpan sejak simpan terakhir */
  pending: number;
  apiDisabled: boolean;
  fileId: string | null;
  loadError: string;
  /** true bila file database tidak ditemukan di Drive (R2): aplikasi
   *  menampilkan layar peringatan, bukan membuat database kosong. */
  dbMissing: boolean;
  /** true bila pemilik memilih "Pulihkan dari backup": simpan pertama
   *  boleh membuat file database baru berisi data hasil impor. */
  restoreMode: boolean;
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
  /** Buat file database baru yang kosong di Drive — hanya dipanggil dari
   *  layar peringatan "database tidak ditemukan" atas pilihan eksplisit
   *  pemilik (R2). */
  createNewDb: () => Promise<void>;
  /** Masuk mode pemulihan: buka aplikasi tanpa database, supaya pemilik
   *  bisa mengimpor file backup dari Pengaturan → Impor JSON (R2). */
  enterRestoreMode: () => void;
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
    status: "idle", lastSavedAt: null, message: "", dirty: false, pending: 0,
    apiDisabled: false, fileId: null, loadError: "", dbMissing: false, restoreMode: false,
  });

  const tokenRef = useRef<string | null>(null);
  const expiresRef = useRef<number>(0);
  const fileIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const dirtyAgainRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** jumlah perubahan sejak simpan terakhir yang terkonfirmasi */
  const pendingRef = useRef(0);
  /** true bila pemilik memilih "Pulihkan dari backup" (lihat enterRestoreMode) */
  const restoreModeRef = useRef(false);
  const dbRef = useRef(db);
  const modeRef = useRef<AuthMode>(null);
  /* Sinkronisasi ref dilakukan di effect, bukan saat render (aturan
   *  react-hooks/refs). Callback memakai ref yang diperbarui di sini,
   *  ditambah penugasan langsung di mutate agar state terbaru langsung
   *  terlihat walau render belum jalan. */
  useEffect(() => { dbRef.current = db; }, [db]);
  useEffect(() => { modeRef.current = authMode; }, [authMode]);

  const setToken = (s: Session | null) => {
    tokenRef.current = s?.token ?? null;
    expiresRef.current = s?.expiresAt ?? 0;
    persistSession(s);
  };

  const hasValidToken = () =>
    !!tokenRef.current && expiresRef.current - 60_000 > Date.now();

  /* ---------- simpan ---------- */

  /* Cache = state terakhir yang TERKONFIRMASI tersimpan di Drive (atau
   *  dimuat dari Drive). `savedAt` dipakai boot untuk membedakan cache
   *  lama; isi cache selalu ditulis dari snapshot yang sudah tersimpan,
   *  bukan dari state yang masih kotor. */
  const writeCache = (fileId: string | null, db: Database) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ fileId, db, savedAt: Date.now() }));
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
        pendingRef.current = 0;
        /* Antrean TIDAK dikosongkan di sini: antrean hanya berisi
         *  perubahan mode Google Drive (mutate tidak menulis antrean di
         *  mode demo), dan perubahan itu tetap berhak dipulihkan saat
         *  pemilik masuk lagi dengan Google. */
        setSync((s) => ({ ...s, status: "saved", dirty: false, pending: 0, lastSavedAt: Date.now(), message: "Tersimpan (demo di perangkat ini)" }));
      } catch {
        /* storage penuh — abaikan */
      }
      return;
    }
    if (mode !== "gdrive") return; // mode cache: menunggu sambung ulang
    if (!hasValidToken()) {
      setSync((s) => ({ ...s, status: "renew", message: "Sesi Google berakhir, sambung ulang untuk menyimpan." }));
      return;
    }
    if (!dirtyRef.current && !force) return;
    savingRef.current = true;
    setSync((s) => ({ ...s, status: "saving", message: "Menyimpan ke Google Drive…" }));
    /* Bekukan snapshot yang akan disimpan beserta jumlah perubahan yang
     *  tercakup di dalamnya: perubahan yang masuk SELAMA simpan berjalan
     *  tidak boleh dianggap sudah tersimpan (tetap di antrean). */
    const snapshot = dbRef.current;
    const snapshotPending = pendingRef.current;
    try {
      const json = JSON.stringify(snapshot);
      if (fileIdRef.current) {
        await updateDb(tokenRef.current!, fileIdRef.current, json);
      } else if (restoreModeRef.current) {
        /* Pemilik sudah memilih "Pulihkan dari backup" secara eksplisit:
         *  simpan pertama membuat file database baru berisi data hasil
         *  impor. Ini satu-satunya jalur pembuatan file selain tombol
         *  "Buat database baru" di layar peringatan (R2). */
        fileIdRef.current = await createDb(tokenRef.current!, json);
        restoreModeRef.current = false;
        setSync((s) => ({ ...s, fileId: fileIdRef.current, restoreMode: false }));
      } else {
        /* R2: JANGAN membuat database diam-diam bila fileId tidak ada.
         *  Perubahan tetap di antrean persisten — tidak hilang — dan
         *  pemilik memilih tindakan di layar peringatan database. */
        setSync((s) => ({
          ...s,
          status: "error",
          message: "Database di Drive belum ditemukan. Pilih tindakan di layar peringatan database.",
        }));
        return;
      }
      pendingRef.current = Math.max(0, pendingRef.current - snapshotPending);
      dirtyRef.current = pendingRef.current > 0;
      /* Antrean hanya dikosongkan bila tidak ada lagi perubahan yang
       *  menunggu; bila ada perubahan baru selama simpan berjalan,
       *  antrean sudah berisi database terbaru (ditulis mutate) dan
       *  dibiarkan — akan dikirim oleh simpan berikutnya. */
      if (pendingRef.current === 0) clearOutbox(localStorage);
      /* Cache ditulis dari SNAPSHOT yang benar-benar tersimpan, bukan
       *  dari state terbaru yang mungkin masih kotor. */
      writeCache(fileIdRef.current, snapshot);
      if (dirtyRef.current) {
        setSync((s) => ({
          ...s, status: "pending", dirty: true, pending: pendingRef.current,
          message: `Belum tersimpan (${pendingRef.current} perubahan)`,
        }));
      } else {
        setSync((s) => ({ ...s, status: "saved", dirty: false, pending: 0, lastSavedAt: Date.now(), message: "", loadError: "" }));
      }
    } catch (err) {
      const e = err as DriveErr;
      if (e?.status === 401) {
        tokenRef.current = null;
        setSync((s) => ({ ...s, status: "renew", message: "Sesi Google berakhir, sambung ulang untuk menyimpan." }));
      } else {
        /* Pesan jujur (R5): perubahan TIDAK diklaim aman di perangkat
         *  secara umum — yang benar: perubahan tersimpan di antrean
         *  persisten perangkat ini dan dicoba lagi otomatis saat
         *  tersambung. */
        setSync((s) => ({
          ...s,
          status: "error",
          message:
            (e?.detail || "Gagal menyimpan ke Drive.") +
            (e?.apiDisabled
              ? " Aktifkan Google Drive API di project Google Cloud."
              : " Perubahan tersimpan di antrean perangkat ini dan akan dicoba lagi otomatis saat tersambung."),
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

  /* Setiap perubahan ditulis dulu ke antrean persisten (sinkron, sebelum
   *  simpan ke Drive dicoba) supaya selamat walau tab langsung ditutup
   *  atau sesi berakhir. Mode demo tidak memakai antrean: datanya sudah
   *  tersimpan sinkron ke localStorage sendiri, dan data demo tidak boleh
   *  bocor ke antrean Google Drive. */
  const mutate = useCallback(
    (fn: (draft: Database) => void) => {
      const next: Database = structuredClone(dbRef.current);
      fn(next);
      dbRef.current = next;
      setDb(next);
      dirtyRef.current = true;
      pendingRef.current += 1;
      if (modeRef.current !== "demo") writeOutbox(localStorage, next, pendingRef.current);
      setSync((s) => ({
        ...s, dirty: true, status: "pending", pending: pendingRef.current,
        message: `Belum tersimpan (${pendingRef.current} perubahan)`,
      }));
      scheduleSave();
    },
    [scheduleSave]
  );

  const replaceDB = useCallback(
    (next: Database) => {
      dbRef.current = next;
      setDb(next);
      dirtyRef.current = true;
      pendingRef.current += 1;
      if (modeRef.current !== "demo") writeOutbox(localStorage, next, pendingRef.current);
      setSync((s) => ({
        ...s, dirty: true, status: "pending", pending: pendingRef.current,
        message: `Belum tersimpan (${pendingRef.current} perubahan)`,
      }));
      scheduleSave();
    },
    [scheduleSave]
  );

  /* Pulihkan antrean persisten bila isinya berbeda dari state terakhir
   *  yang terkonfirmasi (cache). Bila sama, antrean sudah tersimpan —
   *  buang saja. Dipanggil setelah muat dari Drive dan saat boot mode
   *  cache. Perbandingan memakai isi, bukan jam (lihat outbox.ts). */
  const maybeApplyOutbox = useCallback(() => {
    const entry = readOutbox(localStorage);
    if (!entry) return;
    let saved: unknown = null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { db?: unknown };
        saved = parsed && typeof parsed === "object" ? parsed.db ?? null : null;
      }
    } catch {
      /* abaikan — antrean dianggap belum tersimpan */
    }
    if (!outboxHasUnsyncedChanges(entry, saved)) {
      clearOutbox(localStorage);
      return;
    }
    dbRef.current = entry.db;
    setDb(entry.db);
    dirtyRef.current = true;
    pendingRef.current = entry.changes;
    setSync((s) => ({
      ...s,
      status: "pending",
      dirty: true,
      pending: entry.changes,
      message:
        modeRef.current === "cache"
          ? `Sesi Google berakhir. Ada ${entry.changes} perubahan yang belum tersimpan — sambung ulang untuk mengirimnya.`
          : `Perubahan dari antrean perangkat ini dipulihkan (${entry.changes} perubahan) — menyimpan otomatis…`,
    }));
    scheduleSave();
  }, [scheduleSave]);

  /* ---------- muat dari Drive ---------- */

  /* Mengembalikan waktu ubah file (ms epoch) bila berhasil dimuat, atau
   *  null bila file tidak ditemukan (layar peringatan ditampilkan).
   *  Error lain tetap dilempar seperti sebelumnya. */
  const syncFromDrive = useCallback(
    async (token: string): Promise<number | null> => {
      try {
        const file = await findDbFile(token);
        if (!file) {
          /* R2: JANGAN membuat database kosong diam-diam. File bisa tidak
           *  ada karena terhapus, atau karena pemilik masuk dengan akun
           *  Google yang salah (scope drive.file tidak akan pernah
           *  "melihat" file akun lain). Tampilkan layar peringatan dan
           *  tunggu pilihan eksplisit pemilik. */
          fileIdRef.current = null;
          setSync((s) => ({
            ...s, status: "error", fileId: null, dbMissing: true, loadError: "",
            message: "File database tidak ditemukan di Google Drive.",
          }));
          return null;
        }
        fileIdRef.current = file.id;
        setSync((s) => ({ ...s, fileId: file.id, dbMissing: false }));
        const data = await downloadDb(token, file.id);
        /* R6: tolak unduhan yang bukan database Rumbela. Tanpa validasi,
         *  normalizeDB mengubah data rusak menjadi database KOSONG lalu
         *  cache ditimpa dengan yang kosong. Di sini: jangan timpa apa
         *  pun, tampilkan peringatan yang jelas. */
        if (!looksValidV1(data)) {
          setSync((s) => ({
            ...s,
            status: "error",
            loadError:
              "Data yang diunduh dari Drive bukan database Rumbela yang valid. Data di perangkat ini tidak ditimpa. Periksa file rumbela-database.json di Drive, atau pulihkan dari backup (folder RUMBELA_BACKUP).",
          }));
          return file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now();
        }
        const norm = normalizeDB(data);
        dbRef.current = norm;
        setDb(norm);
        writeCache(file.id, norm);
        dirtyRef.current = false;
        pendingRef.current = 0;
        setSync((s) => ({
          ...s, status: "saved", dirty: false, pending: 0,
          lastSavedAt: file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now(),
          loadError: "",
        }));
        return file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now();
      } catch (err) {
        const e = err as DriveErr;
        if (e?.status === 401) {
          tokenRef.current = null;
          setSync((s) => ({ ...s, status: "renew", message: "Sesi Google berakhir, sambung ulang." }));
          throw e;
        }
        setSync((s) => ({
          ...s,
          status: "error",
          loadError:
            (e?.detail || "Gagal memuat database dari Drive.") +
            (e?.apiDisabled
              ? " Google Drive API belum aktif, buka Google Cloud Console → APIs & Services → Library → Google Drive API → Enable."
              : " Auto-save dijeda agar data di Drive tidak tertimpa. Klik 'Coba muat lagi'."),
          apiDisabled: !!e?.apiDisabled,
        }));
        throw e;
      }
    },
    []
  );

  /* Buat file database baru yang kosong — hanya dari layar peringatan
   *  "database tidak ditemukan", atas pilihan eksplisit pemilik (R2). */
  const createNewDb = useCallback(async () => {
    if (!hasValidToken()) return;
    setSync((s) => ({ ...s, status: "saving", message: "Membuat database baru…" }));
    try {
      const id = await createDb(tokenRef.current!, JSON.stringify(dbRef.current));
      fileIdRef.current = id;
      dirtyRef.current = false;
      pendingRef.current = 0;
      clearOutbox(localStorage);
      writeCache(id, dbRef.current);
      setSync((s) => ({
        ...s, status: "saved", dirty: false, pending: 0, dbMissing: false,
        fileId: id, lastSavedAt: Date.now(), message: "", loadError: "",
      }));
    } catch (err) {
      const e = err as DriveErr;
      setSync((s) => ({
        ...s, status: "error",
        message: (e?.detail || "Gagal membuat database baru.") + " Coba lagi.",
      }));
    }
  }, []);

  /* Masuk mode pemulihan: buka aplikasi tanpa database supaya pemilik
   *  bisa mengimpor file backup dari Pengaturan → Impor JSON. Simpan
   *  pertama setelah impor boleh membuat file database baru (lihat
   *  doSave) — itu pilihan eksplisit pemilik, bukan auto-create diam-diam. */
  const enterRestoreMode = useCallback(() => {
    restoreModeRef.current = true;
    setSync((s) => ({ ...s, dbMissing: false, restoreMode: true, status: "idle", message: "", loadError: "" }));
  }, []);

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
        /* doSave sudah menulis cache dari snapshot yang tersimpan; tidak
         *  perlu menulis cache lagi dari state yang mungkin masih kotor. */
        await doSave(true);
        return;
      }
      const modifiedMs = await syncFromDrive(sess.token);
      /* Bila ada antrean perubahan yang belum tersimpan (mis. simpan
       *  gagal sebelum reload), pulihkan setelah muat dari Drive. */
      if (modifiedMs !== null) maybeApplyOutbox();
    },
    [doSave, syncFromDrive, maybeApplyOutbox]
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
    /* Antrean tidak disentuh: mutate tidak menulis antrean di mode demo,
     *  jadi data demo tidak akan bocor ke antrean; antrean Google Drive
     *  yang mungkin ada tetap berhak dipulihkan saat masuk dengan Google. */
    dbRef.current = d;
    setDb(d);
    dirtyRef.current = false;
    pendingRef.current = 0;
    modeRef.current = "demo";
    setAuthMode("demo");
    setEmail("demo@rumbela");
    setSync((s) => ({ ...s, status: "saved", dirty: false, pending: 0, lastSavedAt: Date.now(), fileId: null, loadError: "" }));
  }, []);

  const logout = useCallback(() => {
    if (tokenRef.current && window.google?.accounts?.oauth2) {
      try {
        window.google.accounts.oauth2.revoke(tokenRef.current, () => {});
      } catch { /* abaikan */ }
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    /* Keluar adalah pilihan eksplisit untuk mengakhiri sesi: antrean
     *  perubahan yang belum tersimpan ikut dibuang supaya tidak bangkit
     *  lagi di sesi berikutnya. */
    clearOutbox(localStorage);
    setToken(null);
    fileIdRef.current = null;
    tokenRef.current = null;
    dirtyRef.current = false;
    pendingRef.current = 0;
    restoreModeRef.current = false;
    modeRef.current = null;
    setAuthMode(null);
    setEmail("");
    setBlocked(false);
    dbRef.current = emptyDB();
    setDb(emptyDB());
    setSync({ status: "idle", lastSavedAt: null, message: "", dirty: false, pending: 0, apiDisabled: false, fileId: null, loadError: "", dbMissing: false, restoreMode: false });
  }, []);

  const reloadFromDrive = useCallback(async () => {
    if (!hasValidToken()) {
      await reconnect();
      return;
    }
    setSync((s) => ({ ...s, loadError: "" }));
    try {
      const modifiedMs = await syncFromDrive(tokenRef.current!);
      /* Muat ulang tidak boleh menghilangkan perubahan yang belum
       *  tersimpan dari tampilan: pulihkan antrean bila isinya berbeda. */
      if (modifiedMs !== null) maybeApplyOutbox();
    } catch { /* status diatur syncFromDrive */ }
  }, [reconnect, syncFromDrive, maybeApplyOutbox]);

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
          const modifiedMs = await syncFromDrive(sess.token);
          if (modifiedMs !== null && alive) maybeApplyOutbox();
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
            /* R6 juga untuk cache: cache rusak ditolak, bukan
             *  dinormalisasi jadi database kosong. */
            if (looksValidV1(dbRaw)) {
              const norm = normalizeDB(dbRaw);
              if (alive && norm.students) {
                dbRef.current = norm;
                setDb(norm);
                fileIdRef.current = (parsed as { fileId?: string }).fileId ?? null;
                modeRef.current = "cache";
                setAuthMode("cache");
                setEmail(sess?.email || "");
                cacheUsed = true;
                setSync((s) => ({ ...s, status: "renew", fileId: fileIdRef.current, message: "Sesi Google berakhir, sambung ulang untuk melanjutkan auto-save." }));
              }
            }
          }
        } catch { /* abaikan */ }
        // bila pengguna terakhir memakai Mode Demo → lanjutkan demo
        if (!cacheUsed && alive) {
          try {
            if (localStorage.getItem(DEMO_KEY)) {
              const norm = normalizeDB(JSON.parse(localStorage.getItem(DEMO_KEY)!));
              dbRef.current = norm;
              setDb(norm);
              modeRef.current = "demo";
              setAuthMode("demo");
              setEmail("demo@rumbela");
              setSync((s) => ({ ...s, status: "saved", lastSavedAt: Date.now() }));
            }
          } catch { /* abaikan */ }
        }
        /* Antrean berisi perubahan yang belum tersimpan (mis. simpan
         *  gagal lalu reload saat sesi berakhir) → pulihkan. */
        if (cacheUsed && alive) maybeApplyOutbox();
      }
      if (alive) setBootDone(true);
    })();
    return () => {
      alive = false;
    };
     
  }, [syncFromDrive, maybeApplyOutbox]);

  /* flush saat tab disembunyikan / ditutup */
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current && modeRef.current === "gdrive" && hasValidToken()) {
        void doSave(true);
      }
    };
    /* pagehide: upaya terakhir mengirim perubahan yang belum tersimpan
     *  dengan fetch keepalive (sendBeacon tidak bisa membawa header
     *  Authorization). Bila gagal atau terlalu besar, antrean persisten
     *  yang menanggungnya — perubahan dicoba lagi saat aplikasi dibuka. */
    const onPageHide = () => {
      if (!dirtyRef.current || modeRef.current !== "gdrive" || !hasValidToken() || !fileIdRef.current) return;
      void updateDbKeepalive(tokenRef.current!, fileIdRef.current, JSON.stringify(dbRef.current)).then((ok) => {
        if (ok) {
          dirtyRef.current = false;
          pendingRef.current = 0;
          clearOutbox(localStorage);
        }
      });
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [doSave]);

  const value = useMemo<AppCtx>(
    () => ({
      db, authMode, email, bootDone, connecting, blocked, sync,
      mutate, loginGoogle, loginDemo, reconnect, logout, saveNow, reloadFromDrive, replaceDB,
      createNewDb, enterRestoreMode,
    }),
    [db, authMode, email, bootDone, connecting, blocked, sync, mutate, loginGoogle, loginDemo, reconnect, logout, saveNow, reloadFromDrive, replaceDB, createNewDb, enterRestoreMode]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
