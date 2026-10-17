// loaded only on the landing page, skipped when the visitor prefers reduced motion.
export async function startMotion(root: HTMLElement): Promise<() => void> {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const [{ default: gsap }, { default: Lenis }] = await Promise.all([import("gsap"), import("lenis")]);
  const lenis = new Lenis();
  let id = requestAnimationFrame(function tick(t) { lenis.raf(t); id = requestAnimationFrame(tick); });
  const ctx = gsap.context(() => {
    gsap.from("main > section:first-child > div > *", { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" });
  }, root);
  return () => { cancelAnimationFrame(id); lenis.destroy(); ctx.revert(); };
}
