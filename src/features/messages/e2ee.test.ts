import { describe, expect, test } from "bun:test";
import { createKeys, decryptText, encryptText, restoreKeys, safetyNumber, sharedKey } from "./e2ee";

describe("end to end encryption", () => {
  test("two people derive the same key and can read each other", async () => {
    const a = await createKeys("alice passcode"), b = await createKeys("bob passcode");
    const ka = await sharedKey(a.priv, b.pub, "convo1"), kb = await sharedKey(b.priv, a.pub, "convo1");
    const m = await encryptText(ka, "convo1", "hello bob");
    expect(m.ct).not.toContain("hello");
    expect(await decryptText(kb, "convo1", m)).toBe("hello bob");
    expect(await decryptText(ka, "convo1", m)).toBe("hello bob"); // the sender can read their own history too
  });
  test("a message is bound to its conversation and cannot be tampered with", async () => {
    const a = await createKeys("alice passcode"), b = await createKeys("bob passcode");
    const k = await sharedKey(a.priv, b.pub, "convo1"); const m = await encryptText(k, "convo1", "secret");
    await expect(decryptText(k, "convo2", m)).rejects.toBeDefined();
    await expect(decryptText(k, "convo1", { ...m, ct: m.ct.slice(0, -4) + "AAAA" })).rejects.toBeDefined();
  });
  test("a stranger cannot derive the key", async () => {
    const a = await createKeys("a passcode 1"), b = await createKeys("b passcode 1"), c = await createKeys("c passcode 1");
    const m = await encryptText(await sharedKey(a.priv, b.pub, "x"), "x", "private");
    await expect(decryptText(await sharedKey(c.priv, a.pub, "x"), "x", m)).rejects.toBeDefined();
  });
  test("the passcode backup restores the key and rejects a wrong passcode", async () => {
    const a = await createKeys("correct horse"), b = await createKeys("other passcode");
    const restored = await restoreKeys(a.backup, "correct horse");
    const m = await encryptText(await sharedKey(b.priv, a.pub, "c"), "c", "hi");
    expect(await decryptText(await sharedKey(restored, b.pub, "c"), "c", m)).toBe("hi");
    await expect(restoreKeys(a.backup, "wrong passcode")).rejects.toBeDefined();
  });
  test("the safety number is the same for both people", async () => {
    const a = await createKeys("a passcode 1"), b = await createKeys("b passcode 1");
    expect(await safetyNumber(a.pub, b.pub)).toBe(await safetyNumber(b.pub, a.pub));
  });
});
