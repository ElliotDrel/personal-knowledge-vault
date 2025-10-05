import { lazy, Suspense } from "react";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RequireAuth } from "@/components/auth/RequireAuth";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Resources = lazy(() => import("./pages/Resources"));
const ResourceDetail = lazy(() => import("./pages/ResourceDetail"));
const NewResource = lazy(() => import("./pages/NewResource"));
const ProcessVideo = lazy(() => import("./pages/ProcessVideo"));
const Settings = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense
            fallback={
              <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                Loading...
              </div>
            }
          >
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />

              {/* Protected routes */}
              <Route path="/" element={
                <RequireAuth>
                  <Dashboard />
                </RequireAuth>
              } />
              <Route path="/resources" element={
                <RequireAuth>
                  <Resources />
                </RequireAuth>
              } />
              <Route path="/resources/new" element={
                <RequireAuth>
                  <NewResource />
                </RequireAuth>
              } />
              <Route path="/resources/process" element={
                <RequireAuth>
                  <ProcessVideo />
                </RequireAuth>
              } />
              <Route path="/resource/:id" element={
                <RequireAuth>
                  <ResourceDetail />
                </RequireAuth>
              } />
              <Route path="/settings" element={
                <RequireAuth>
                  <Settings />
                </RequireAuth>
              } />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
