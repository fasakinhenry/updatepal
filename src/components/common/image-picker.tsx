import { useState } from "react";
import { uploadImage, ApiError } from "@/lib/http";

/** picks an image, checks it, uploads it and hands back its url. */
export function ImagePicker({ kind, label, onUploaded }: { kind: "avatar" | "logo" | "banner" | "story" | "update"; label: string; onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const pick = async (f?: File) => {
    if (!f) return; setErr("");
    if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return setErr("use a png, jpeg, webp or gif image.");
    if (f.size > 5e6) return setErr("the image must be under 5 mb.");
    setBusy(true);
    try { onUploaded(await uploadImage(f, kind)); } catch (e) { setErr(e instanceof ApiError ? e.message : "could not upload the image."); } finally { setBusy(false); }
  };
  return (
    <span>
      <label className="cursor-pointer text-sm font-semibold text-primary">{busy ? "uploading..." : label}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
      {err && <span role="alert" className="ml-2 text-sm font-semibold text-[#d02b2b]">{err}</span>}
    </span>
  );
}
