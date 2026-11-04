import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Bare /auth only redirects to /auth/login → client-side (splash) instead of a meta-refresh stub.
  {
    path: 'auth',
    renderMode: RenderMode.Client
  },
  // Public auth pages: no guard → safe to prerender.
  {
    path: 'auth/**',
    renderMode: RenderMode.Prerender
  },
  // Guarded routes: prerender has no session, so guards would bake a redirect to /auth/login.
  // Render client-side instead (served via index.csr.html fallback).
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
