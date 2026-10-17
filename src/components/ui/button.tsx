import type { ComponentProps, ReactNode } from "react";
import { Link } from "react-router";
import { ArrowRight } from "@phosphor-icons/react";

type Variant = "primary" | "outline" | "soft" | "light";

const base =
  "inline-flex items-center justify-center gap-3 rounded-full font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-55";
const variants: Record<Variant, string> = {
  primary: "border border-primary bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-press",
  outline: "border border-lilac bg-white text-primary hover:bg-primary/[.07]",
  soft: "border-2 border-pink bg-hairline text-ink shadow-[3px_4px_0_0_#ed0578]",
  light: "border border-white bg-white text-primary hover:bg-cream",
};

type Props = Omit<ComponentProps<"button">, "children"> & {
  to?: string;
  variant?: Variant;
  arrow?: boolean;
  children: ReactNode;
};

export function Button({ to, variant = "primary", arrow, className = "", children, ...rest }: Props) {
  const cls = `${base} ${variants[variant]} ${arrow ? "py-2 pl-6 pr-2" : "px-6 py-3"} ${className}`;
  const inner = (
    <>
      {children}
      {arrow && (
        <span className="grid size-10 place-items-center rounded-full bg-white text-primary">
          <ArrowRight weight="bold" size={18} />
        </span>
      )}
    </>
  );
  return to ? (
    <Link to={to} className={cls}>{inner}</Link>
  ) : (
    <button className={cls} {...rest}>{inner}</button>
  );
}

export function Container({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>;
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-lilac bg-white px-3 py-1 text-sm font-semibold text-primary ${className}`}>
      {children}
    </span>
  );
}
