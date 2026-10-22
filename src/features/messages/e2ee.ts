// end to end encryption with the browser's web crypto api. no custom algorithms:
// ecdh p-256 key agreement, hkdf-sha256 key derivation, aes-256-gcm encryption.
// the private key never leaves the device unencrypted. a copy wrapped with the person's passcode
// (pbkdf2-sha256 + aes-gcm) is stored on the server so a new device can restore it.
// limits: no forward secrecy and no key transparency. get this reviewed before relying on it for sensitive data.
const te = new TextEncoder(), td = new TextDecoder();
const b64 = (b: ArrayBuffer | Uint8Array) => { const a = new Uint8Array(b); let s = ""; for (let i = 0; i < a.length; i += 8192) s += String.fromCharCode(...a.subarray(i, i + 8192)); return btoa(s); };
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ECDH = { name: "ECDH", namedCurve: "P-256" } as const;
export type Wrapped = { publicKey: string; wrapped: string; salt: string; iv: string; iterations: number };

async function passKey(pass: string, salt: Uint8Array, iterations: number) {
  const base = await crypto.subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
/** creates a key pair and the passcode wrapped backup that is safe to upload. */
export async function createKeys(passcode: string): Promise<{ priv: CryptoKey; pub: string; backup: Wrapped }> {
  const kp = await crypto.subtle.generateKey(ECDH, true, ["deriveBits"]);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", kp.privateKey);
  const pub = b64(await crypto.subtle.exportKey("raw", kp.publicKey));
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iterations = 600_000;
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await passKey(passcode, salt, iterations), pkcs8);
  const priv = await crypto.subtle.importKey("pkcs8", pkcs8, ECDH, false, ["deriveBits"]); // the stored copy cannot be exported again
  return { priv, pub, backup: { publicKey: pub, wrapped: b64(ct), salt: b64(salt), iv: b64(iv), iterations } };
}
export async function restoreKeys(k: Wrapped, passcode: string): Promise<CryptoKey> {
  const pkcs8 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(k.iv) as BufferSource }, await passKey(passcode, unb64(k.salt), k.iterations), unb64(k.wrapped) as BufferSource);
  return crypto.subtle.importKey("pkcs8", pkcs8, ECDH, false, ["deriveBits"]);
}

// the unwrapped key lives in indexeddb as a non extractable CryptoKey, so a reload does not ask for the passcode again
const db = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open("ub-e2ee", 1); r.onupgradeneeded = () => r.result.createObjectStore("keys"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export async function saveLocal(userId: string, rec: { priv: CryptoKey; pub: string }) { const d = await db(); await new Promise<void>((res, rej) => { const t = d.transaction("keys", "readwrite"); t.objectStore("keys").put(rec, userId); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
export async function loadLocal(userId: string): Promise<{ priv: CryptoKey; pub: string } | null> { const d = await db(); return new Promise((res, rej) => { const r = d.transaction("keys").objectStore("keys").get(userId); r.onsuccess = () => res((r.result as { priv: CryptoKey; pub: string }) ?? null); r.onerror = () => rej(r.error); }); }
export async function clearLocal(userId: string) { const d = await db(); await new Promise<void>((res) => { const t = d.transaction("keys", "readwrite"); t.objectStore("keys").delete(userId); t.oncomplete = () => res(); }); }

/** both people derive the same aes key from their own private key and the other person's public key. */
export async function sharedKey(priv: CryptoKey, peerPub: string, convoId: string): Promise<CryptoKey> {
  const peer = await crypto.subtle.importKey("raw", unb64(peerPub) as BufferSource, ECDH, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: peer }, priv, 256);
  const hk = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt: te.encode(convoId), info: te.encode("updatebase e2ee v1") }, hk, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
export async function encryptText(key: CryptoKey, convoId: string, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: te.encode(convoId) }, key, te.encode(text)); // bound to this conversation
  return { ct: b64(ct), iv: b64(iv) };
}
export async function decryptText(key: CryptoKey, convoId: string, m: { ct: string; iv: string }) {
  return td.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(m.iv) as BufferSource, additionalData: te.encode(convoId) }, key, unb64(m.ct) as BufferSource));
}
/** a short code both people can compare out loud or in person to confirm nobody swapped a key. */
export async function safetyNumber(a: string, b: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", te.encode([a, b].sort().join("|"))));
  return Array.from(h.subarray(0, 15), (x) => String(x).padStart(3, "0")).join("").match(/.{1,5}/g)!.join(" ");
}
