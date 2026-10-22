import { useEffect, useState, type ComponentType } from "react";
import { createBrowserRouter, Navigate, Outlet, useLocation } from "react-router";
import { LandingPage } from "@/features/landing/landing-page";
import { AuthPage } from "@/features/auth/auth-page";
import { OnboardingPage } from "@/features/onboarding/onboarding-page";
import { Shell } from "@/features/shell/shell";
import { FeedPage, UpdateDetail } from "@/features/feed/feed-page";
import { DiscoverPage } from "@/features/discover/discover-page";
import { Button } from "@/components/ui/button";
import { useApp } from "@/app/state";

type Mod = Record<string, ComponentType>;
// less used screens load on demand to keep the first bundle small.
const L = (f: () => Promise<unknown>, k: string) => ({ lazy: async () => ({ Component: ((await f()) as Mod)[k] }) });
const org = () => import("@/features/org/org-pages");
const more = () => import("@/features/org/org-more");
const social = () => import("@/features/social/pages");
const profile = () => import("@/features/social/profile");
const auth = () => import("@/features/auth/pages");
const legal = () => import("@/features/legal/legal");
const messages = () => import("@/features/messages/messages-page");
const wallet = () => import("@/features/payments/wallet-page");
const admin = () => import("@/features/admin/admin-page");

function Guard() {
  const { user, ready } = useApp();
  const { pathname } = useLocation();
  if (!ready) return <p role="status" className="grid min-h-screen place-items-center text-body">loading...</p>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!user.onboarded && pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (user.onboarded && pathname === "/onboarding") return <Navigate to="/app" replace />;
  return <Outlet />;
}

// the server decides who is an admin. this only avoids showing the page to everyone else.
function AdminGate() {
  const { user } = useApp();
  const [C, setC] = useState<ComponentType | null>(null);
  useEffect(() => { if (user?.isAdmin) void admin().then((m) => setC(() => (m as Mod).AdminPage)); }, [user?.isAdmin]);
  if (!user?.isAdmin) return <NotFound />;
  return C ? <C /> : <p role="status" className="p-6 text-body">loading...</p>;
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
  { path: "/auth/verify", ...L(auth, "VerifyPage") },
  { path: "/auth/reset", ...L(auth, "ResetPage") },
  { path: "/invite", ...L(auth, "InvitePage") },
  { path: "/legal/:doc", ...L(legal, "LegalPage") },
  {
    element: <Guard />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/admin", element: <AdminGate /> },
      {
        path: "/app", element: <Shell />,
        children: [
          { index: true, element: <FeedPage /> },
          { path: "update/:id", element: <UpdateDetail /> },
          { path: "discover", element: <DiscoverPage /> },
          { path: "stories", ...L(social, "Stories") },
          { path: "stories/new", ...L(social, "StoryComposer") },
          { path: "notifications", ...L(social, "Notifications") },
          { path: "bookmarks", ...L(social, "Bookmarks") },
          { path: "messages", ...L(messages, "Messages") },
          { path: "wallet", ...L(wallet, "Wallet") },
          { path: "profile", lazy: async () => { const { ProfilePage } = await profile(); return { Component: () => <ProfilePage self /> }; } },
          { path: "u/:username", ...L(profile, "ProfilePage") },
          { path: "o/:handle", ...L(profile, "OrgPage") },
          { path: "settings", ...L(profile, "PersonalSettings") },
          { path: "org", ...L(org, "Overview") },
          { path: "org/new", ...L(org, "CreateOrg") },
          { path: "org/publish", ...L(org, "Publish") },
          { path: "org/documents", ...L(org, "Documents") },
          { path: "org/calendar", ...L(org, "CalendarPage") },
          { path: "org/members", ...L(org, "Members") },
          { path: "org/notifications", ...L(more, "OrgNotifications") },
          { path: "org/analytics", ...L(more, "Analytics") },
          { path: "org/feedback", ...L(more, "Feedback") },
          { path: "org/wallet", lazy: async () => { const { Wallet } = await wallet(); return { Component: () => <Wallet asOrg /> }; } },
          { path: "org/settings", ...L(more, "OrgSettings") },
        ],
      },
    ],
  },
  { path: "*", element: <NotFound /> },
]);
