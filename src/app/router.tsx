import type { ComponentType } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router";
import { LandingPage } from "@/features/landing/landing-page";
import { AuthPage } from "@/features/auth/auth-page";
import { OnboardingPage } from "@/features/onboarding/onboarding-page";
import { Shell } from "@/features/shell/shell";
import { FeedPage, UpdateDetail } from "@/features/feed/feed-page";
import { DiscoverPage } from "@/features/discover/discover-page";
import { Testimonials, Notifications, Bookmarks, Messages, Profile } from "@/features/community/pages";
import { Button } from "@/components/ui/button";
import { useApp } from "@/app/state";

type Mod = Record<string, ComponentType>;
// org, wallet, settings and legal screens load on demand to keep the first bundle small.
const L = (f: () => Promise<Mod>, k: string) => ({ lazy: async () => ({ Component: (await f())[k] }) });
const org = () => import("@/features/org/org-pages");
const more = () => import("@/features/org/org-more");
const extra = () => import("@/features/community/extra");
const legal = () => import("@/features/legal/legal");

function Guard() {
  const { user } = useApp();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.onboarded && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (user.onboarded && pathname === "/onboarding") return <Navigate to="/app" replace />;
  return <Outlet />;
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream p-6 text-center">
      <div><h1 className="text-6xl">lost in the feed.</h1><p className="mt-3 text-body">that page does not exist. head back home.</p><Button to="/" className="mt-6 px-8 py-4">back home</Button></div>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/auth/reset", ...L(extra as () => Promise<Mod>, "ResetPage") },
  { path: "/legal/:doc", ...L(legal as () => Promise<Mod>, "LegalPage") },
  {
    element: <Guard />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      {
        path: "/app", element: <Shell />,
        children: [
          { index: true, element: <FeedPage /> },
          { path: "update/:id", element: <UpdateDetail /> },
          { path: "discover", element: <DiscoverPage /> },
          { path: "testimonials", element: <Testimonials /> },
          { path: "notifications", element: <Notifications /> },
          { path: "bookmarks", element: <Bookmarks /> },
          { path: "messages", element: <Messages /> },
          { path: "profile", element: <Profile /> },
          { path: "testimonials/new", ...L(extra as () => Promise<Mod>, "StoryComposer") },
          { path: "community", ...L(extra as () => Promise<Mod>, "CommunityPage") },
          { path: "settings", ...L(more as () => Promise<Mod>, "PersonalSettings") },
          { path: "wallet", ...L(more as () => Promise<Mod>, "Wallet") },
          { path: "org", ...L(org as () => Promise<Mod>, "Overview") },
          { path: "org/new", ...L(org as () => Promise<Mod>, "CreateOrg") },
          { path: "org/publish", ...L(org as () => Promise<Mod>, "Publish") },
          { path: "org/documents", ...L(org as () => Promise<Mod>, "Documents") },
          { path: "org/calendar", ...L(org as () => Promise<Mod>, "CalendarPage") },
          { path: "org/members", ...L(org as () => Promise<Mod>, "Members") },
          { path: "org/notifications", ...L(more as () => Promise<Mod>, "OrgNotifications") },
          { path: "org/analytics", ...L(more as () => Promise<Mod>, "Analytics") },
          { path: "org/feedback", ...L(more as () => Promise<Mod>, "Feedback") },
          { path: "org/wallet", ...L(more as () => Promise<Mod>, "Wallet") },
          { path: "org/settings", ...L(more as () => Promise<Mod>, "OrgSettings") },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
