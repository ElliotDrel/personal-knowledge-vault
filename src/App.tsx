import { lazy, Suspense } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Resources = lazy(() => import("./pages/Resources"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const NewResource = lazy(() => import("./pages/NewResource"));
const ProcessVideo = lazy(() => import("./pages/ProcessVideo"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    path: "/auth",
    element: <Auth />,
  },
  {
    path: "/dashboard",
    element: (
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/resources",
    element: (
      <RequireAuth>
        <Resources />
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/resources/new",
    element: (
      <RequireAuth>
        <NewResource />
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/resources/process",
    element: (
      <RequireAuth>
        <ProcessVideo />
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/resource/:id",
    element: (
      <RequireAuth>
        <ResourceDetail />
      </RequireAuth>
    ),
  },
  {
    path: "/dashboard/settings",
    element: (
      <RequireAuth>
        <Settings />
      </RequireAuth>
    ),
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center text-muted-foreground">
              Loading...
            </div>
          }
        >
          <RouterProvider router={router} />
        </Suspense>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
