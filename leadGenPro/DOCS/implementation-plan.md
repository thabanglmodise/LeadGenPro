# LeadAI Pro — Angular Implementation Plan

> **Stack:** Angular 21 · Supabase (Auth + PostgreSQL) · Spartan UI · Tailwind CSS 4.1

---

## 1. Project Overview

LeadAI Pro is a B2B lead generation SaaS tool that allows users to:

- Discover real local businesses via the Google Places API
- Score leads with AI (Anthropic Claude) as Hot / Warm / Cold
- Draft personalised cold outreach emails using AI
- Send emails via Gmail compose (one-click, no SMTP)
- Track the full sales pipeline from New → Contacted → Replied → Converted

The Angular rebuild replaces `localStorage` with Supabase (PostgreSQL + Auth), adds user accounts, and structures the app as a proper single-page application with lazy-loaded routes.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Angular 21.2 | Already scaffolded; signals, standalone components, SSR |
| UI Components | Spartan UI (`@spartan-ng/ui-*`) | Headless Angular components with Tailwind styling, shadcn-style API |
| Styling | Tailwind CSS 4.1 | Already configured via PostCSS |
| Auth + Database | Supabase | Email/password auth, PostgreSQL, RLS, JS client |
| AI Scoring | Anthropic Claude API | User supplies own key; client-side calls |
| Lead Discovery | Google Places Text Search | User supplies own key; client-side via CORS proxy |
| Email | Gmail Compose URL | Opens pre-filled Gmail tab — no SMTP needed |
| Testing | Vitest | Already configured |

---

## 3. Prerequisites & Initial Setup

### 3.1 Install Dependencies

```bash
cd leadGenPro

# Supabase JS client
npm install @supabase/supabase-js

# Spartan UI CLI (uses Nx under the hood)
npm install --save-dev @spartan-ng/cli

# Angular HttpClient is already available via Angular core
```

### 3.2 Spartan UI Component Installation

Run these commands to generate the Spartan UI component primitives. Each generates a `libs/ui/ui-*/` folder with the headless component + Tailwind-styled directives:

```bash
npx nx g @spartan-ng/cli:ui button
npx nx g @spartan-ng/cli:ui input
npx nx g @spartan-ng/cli:ui label
npx nx g @spartan-ng/cli:ui select
npx nx g @spartan-ng/cli:ui table
npx nx g @spartan-ng/cli:ui badge
npx nx g @spartan-ng/cli:ui card
npx nx g @spartan-ng/cli:ui dialog
npx nx g @spartan-ng/cli:ui sheet
npx nx g @spartan-ng/cli:ui separator
npx nx g @spartan-ng/cli:ui sonner
npx nx g @spartan-ng/cli:ui form
npx nx g @spartan-ng/cli:ui avatar
```

### 3.3 Dark Theme CSS Variables

The prototype uses a dark colour palette. Add these CSS custom properties to `src/styles.css` to replicate the theme and wire them into Tailwind:

```css
@layer base {
  :root {
    --bg: 227 15% 6%;
    --bg-2: 228 18% 8%;
    --bg-3: 232 18% 11%;
    --bg-4: 234 20% 14%;
    --border: 240 6% 10%;
    --accent: 229 91% 64%;
    --accent-2: 229 100% 74%;
    --accent-3: 171 100% 45%;
    --foreground: 232 100% 96%;
    --muted: 233 14% 61%;
    --muted-foreground: 236 13% 35%;
    --hot: 20 100% 60%;
    --warm: 44 91% 63%;
    --success: 157 100% 41%;
    --danger: 349 100% 65%;
  }
}
```

---

## 4. Supabase Setup

### 4.1 Create Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Note your **Project URL** and **anon public key** from Settings → API

### 4.2 Environment Configuration

Create the environments folder and files:

```
src/environments/
├── environment.ts          (development)
└── environment.prod.ts     (production)
```

```ts
// src/environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'https://YOUR_PROJECT_ID.supabase.co',
  supabaseAnonKey: 'YOUR_ANON_KEY',
};
```

Register the environments in `angular.json` under `fileReplacements` for the production build.

### 4.3 Supabase Client Provider

Create `src/app/core/supabase.client.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const supabase = createClient(
  environment.supabaseUrl,
  environment.supabaseAnonKey
);
```

### 4.4 Database Schema (SQL)

Run this SQL in the Supabase SQL Editor:

```sql
-- Profiles: business details, 1:1 with auth.users
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  biz_name      text,
  full_name     text,
  role          text,
  offering      text,
  benefits      text,
  website       text,
  phone         text,
  updated_at    timestamptz default now()
);

-- Leads: all discovered companies
create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  address       text,
  city          text,
  type          text,
  types         jsonb default '[]',
  rating        numeric,
  total_ratings integer default 0,
  place_id      text,
  website       text,
  phone         text,
  contact_name  text,
  contact_email text,
  ai_score      text check (ai_score in ('hot', 'warm', 'cold')),
  ai_reason     text,
  offering      text,
  status        text not null default 'new'
                  check (status in ('new', 'contacted', 'replied', 'converted')),
  created_at    timestamptz default now()
);

-- Sent emails: outreach log
create table public.sent_emails (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  to_email      text not null,
  subject       text,
  body          text,
  sent_at       timestamptz default now()
);

-- User config: API keys and Gmail address
create table public.user_config (
  id            uuid primary key references auth.users(id) on delete cascade,
  gp_key        text,
  cl_key        text,
  gm_email      text,
  updated_at    timestamptz default now()
);

-- Activity log: recent actions
create table public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  message       text not null,
  created_at    timestamptz default now()
);

-- Indexes for common queries
create index leads_user_status on public.leads(user_id, status);
create index sent_emails_user on public.sent_emails(user_id);
create index activity_log_user on public.activity_log(user_id, created_at desc);
```

### 4.5 Row Level Security (RLS)

```sql
-- Enable RLS on all tables
alter table public.profiles      enable row level security;
alter table public.leads         enable row level security;
alter table public.sent_emails   enable row level security;
alter table public.user_config   enable row level security;
alter table public.activity_log  enable row level security;

-- Profiles
create policy "Users manage own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- Leads
create policy "Users manage own leads"
  on public.leads for all
  using (auth.uid() = user_id);

-- Sent emails
create policy "Users manage own sent emails"
  on public.sent_emails for all
  using (auth.uid() = user_id);

-- User config
create policy "Users manage own config"
  on public.user_config for all
  using (auth.uid() = id);

-- Activity log
create policy "Users manage own activity"
  on public.activity_log for all
  using (auth.uid() = user_id);

-- Auto-create profile row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.user_config (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 5. Project Directory Structure

```
src/
└── app/
    ├── app.ts                        # Root shell component (sidebar + router-outlet)
    ├── app.html
    ├── app.css
    ├── app.config.ts                 # provideRouter, provideHttpClient, etc.
    ├── app.routes.ts                 # Top-level lazy routes
    │
    ├── core/
    │   ├── supabase.client.ts        # Supabase singleton
    │   ├── guards/
    │   │   └── auth.guard.ts         # Redirects to /auth/login if no session
    │   ├── models/
    │   │   ├── lead.model.ts
    │   │   ├── sent-email.model.ts
    │   │   ├── user-config.model.ts
    │   │   ├── profile.model.ts
    │   │   └── activity.model.ts
    │   └── services/
    │       ├── auth.service.ts       # Supabase auth, user signal
    │       ├── leads.service.ts      # CRUD leads, score signals
    │       ├── places.service.ts     # Google Places Text Search
    │       ├── claude.service.ts     # Anthropic scoring + email draft
    │       ├── email.service.ts      # Gmail URL builder + sent log
    │       ├── config.service.ts     # user_config table read/write
    │       ├── activity.service.ts   # activity_log table read/write
    │       └── profile.service.ts    # profiles table read/write
    │
    ├── shared/
    │   └── components/
    │       ├── sidebar/
    │       │   ├── sidebar.ts
    │       │   └── sidebar.html
    │       ├── topbar/
    │       │   ├── topbar.ts
    │       │   └── topbar.html
    │       └── lead-score-badge/
    │           └── lead-score-badge.ts   # Inline badge component
    │
    └── features/
        ├── auth/
        │   ├── auth.routes.ts
        │   ├── login/login.ts
        │   ├── signup/signup.ts
        │   └── reset/reset.ts
        │
        ├── dashboard/
        │   ├── dashboard.ts
        │   └── dashboard.html
        │
        ├── leads/
        │   ├── leads.routes.ts
        │   ├── find/find-leads.ts      # Search form + table
        │   └── find/find-leads.html
        │
        ├── pipeline/
        │   ├── pipeline.ts
        │   └── pipeline.html
        │
        ├── compose/
        │   ├── compose.ts
        │   └── compose.html
        │
        ├── sent/
        │   ├── sent.ts
        │   └── sent.html
        │
        └── settings/
            ├── settings.routes.ts
            ├── setup/setup.ts          # API key configuration
            └── profile/profile.ts      # Business profile
```

---

## 6. Routing Architecture

```ts
// src/app/app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    component: AppShellComponent,  // sidebar + topbar layout wrapper
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'leads',
        loadChildren: () => import('./features/leads/leads.routes').then(m => m.LEADS_ROUTES),
      },
      {
        path: 'pipeline',
        loadComponent: () => import('./features/pipeline/pipeline').then(m => m.PipelineComponent),
      },
      {
        path: 'compose',
        loadComponent: () => import('./features/compose/compose').then(m => m.ComposeComponent),
      },
      {
        path: 'sent',
        loadComponent: () => import('./features/sent/sent').then(m => m.SentComponent),
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then(m => m.SETTINGS_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
```

```ts
// src/app/features/auth/auth.routes.ts
export const AUTH_ROUTES: Routes = [
  { path: 'login',  loadComponent: () => import('./login/login').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./signup/signup').then(m => m.SignupComponent) },
  { path: 'reset',  loadComponent: () => import('./reset/reset').then(m => m.ResetComponent) },
];
```

```ts
// src/app/features/settings/settings.routes.ts
export const SETTINGS_ROUTES: Routes = [
  { path: 'setup',   loadComponent: () => import('./setup/setup').then(m => m.SetupComponent) },
  { path: 'profile', loadComponent: () => import('./profile/profile').then(m => m.ProfileComponent) },
  { path: '', redirectTo: 'setup', pathMatch: 'full' },
];
```

---

## 7. Core Models

```ts
// src/app/core/models/lead.model.ts
export type LeadStatus = 'new' | 'contacted' | 'replied' | 'converted';
export type AiScore = 'hot' | 'warm' | 'cold';

export interface Lead {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  type: string;
  types: string[];
  rating: number | null;
  total_ratings: number;
  place_id: string;
  website: string;
  phone: string;
  contact_name: string;
  contact_email: string;
  ai_score: AiScore | null;
  ai_reason: string;
  offering: string;
  status: LeadStatus;
  created_at: string;
}

// src/app/core/models/user-config.model.ts
export interface UserConfig {
  id: string;
  gp_key: string;
  cl_key: string;
  gm_email: string;
}

// src/app/core/models/profile.model.ts
export interface Profile {
  id: string;
  biz_name: string;
  full_name: string;
  role: string;
  offering: string;
  benefits: string;
  website: string;
  phone: string;
}

// src/app/core/models/activity.model.ts
export interface ActivityEntry {
  id: string;
  message: string;
  created_at: string;
}

// src/app/core/models/sent-email.model.ts
export interface SentEmail {
  id: string;
  to_email: string;
  subject: string;
  sent_at: string;
}
```

---

## 8. Core Services

### 8.1 AuthService

```ts
// src/app/core/services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());

  constructor() {
    // Load existing session on startup
    supabase.auth.getSession().then(({ data }) => {
      this._user.set(data.session?.user ?? null);
    });
    // React to auth state changes
    supabase.auth.onAuthStateChange((_, session) => {
      this._user.set(session?.user ?? null);
    });
  }

  signUp(email: string, password: string) {
    return supabase.auth.signUp({ email, password });
  }

  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email);
  }

  signOut() {
    return supabase.auth.signOut();
  }
}
```

### 8.2 AuthGuard

```ts
// src/app/core/guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() ? true : router.parseUrl('/auth/login');
};
```

### 8.3 LeadsService

```ts
// src/app/core/services/leads.service.ts
@Injectable({ providedIn: 'root' })
export class LeadsService {
  private readonly auth = inject(AuthService);
  private readonly _leads = signal<Lead[]>([]);

  readonly leads = this._leads.asReadonly();
  readonly totalLeads = computed(() => this._leads().length);
  readonly hotLeads = computed(() => this._leads().filter(l => l.ai_score === 'hot').length);
  readonly contactedLeads = computed(() => this._leads().filter(l => l.status === 'contacted').length);
  readonly newLeads = computed(() => this._leads().filter(l => l.status === 'new'));
  readonly contactedList = computed(() => this._leads().filter(l => l.status === 'contacted'));

  async loadLeads(): Promise<void> {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    this._leads.set(data ?? []);
  }

  async addLeads(leads: Omit<Lead, 'id' | 'user_id' | 'created_at'>[]): Promise<void> {
    const userId = this.auth.user()!.id;
    const rows = leads.map(l => ({ ...l, user_id: userId }));
    const { data } = await supabase.from('leads').insert(rows).select();
    this._leads.update(current => [...(data ?? []), ...current]);
  }

  async updateLead(id: string, patch: Partial<Lead>): Promise<void> {
    await supabase.from('leads').update(patch).eq('id', id);
    this._leads.update(leads =>
      leads.map(l => (l.id === id ? { ...l, ...patch } : l))
    );
  }

  async deleteLead(id: string): Promise<void> {
    await supabase.from('leads').delete().eq('id', id);
    this._leads.update(leads => leads.filter(l => l.id !== id));
  }

  async clearAllLeads(): Promise<void> {
    await supabase.from('leads').delete().eq('user_id', this.auth.user()!.id);
    this._leads.set([]);
  }
}
```

### 8.4 PlacesService

```ts
// src/app/core/services/places.service.ts
@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly http = inject(HttpClient);

  search(type: string, city: string, apiKey: string): Observable<PlaceResult[]> {
    const query = encodeURIComponent(`${type} in ${city}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${apiKey}`;
    return this.http.get<PlacesResponse>(
      `https://corsproxy.io/?${encodeURIComponent(url)}`
    ).pipe(
      map(res => {
        if (res.status !== 'OK' && res.status !== 'ZERO_RESULTS') {
          throw new Error(res.error_message ?? res.status);
        }
        return res.results ?? [];
      })
    );
  }
}
```

### 8.5 ClaudeService

```ts
// src/app/core/services/claude.service.ts
@Injectable({ providedIn: 'root' })
export class ClaudeService {
  private readonly http = inject(HttpClient);

  scoreBatch(leads: Lead[], offering: string, apiKey: string): Observable<ScoreResult[]> {
    const prompt = buildScoringPrompt(leads, offering);
    return this.callClaude(prompt, 400, apiKey).pipe(
      map(text => JSON.parse(text.replace(/```json|```/g, '').trim()) as ScoreResult[])
    );
  }

  draftEmail(params: EmailDraftParams, apiKey: string): Observable<{ subject: string; body: string }> {
    const prompt = buildEmailPrompt(params);
    return this.callClaude(prompt, 700, apiKey).pipe(
      map(text => {
        const subjMatch = text.match(/SUBJECT:\s*(.+)/);
        const bodyMatch = text.match(/BODY:\s*([\s\S]+)/);
        return {
          subject: subjMatch?.[1]?.trim() ?? 'A quick introduction',
          body: bodyMatch?.[1]?.trim() ?? text,
        };
      })
    );
  }

  private callClaude(prompt: string, maxTokens: number, apiKey: string): Observable<string> {
    return this.http.post<AnthropicResponse>(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    ).pipe(
      map(res => {
        if ('error' in res) throw new Error((res as any).error.message);
        return res.content[0].text;
      })
    );
  }
}
```

### 8.6 ConfigService

```ts
// src/app/core/services/config.service.ts
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly _config = signal<UserConfig | null>(null);

  readonly config = this._config.asReadonly();
  readonly hasGoogleKey = computed(() => !!this._config()?.gp_key);
  readonly hasClaudeKey = computed(() => !!this._config()?.cl_key);
  readonly hasGmail = computed(() => !!this._config()?.gm_email);

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('user_config')
      .select('*')
      .eq('id', userId)
      .single();
    this._config.set(data);
  }

  async save(patch: Partial<Omit<UserConfig, 'id'>>, userId: string): Promise<void> {
    await supabase
      .from('user_config')
      .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() });
    this._config.update(c => ({ ...c!, ...patch }));
  }
}
```

### 8.7 EmailService

```ts
// src/app/core/services/email.service.ts
@Injectable({ providedIn: 'root' })
export class EmailService {
  private readonly _sent = signal<SentEmail[]>([]);
  readonly sent = this._sent.asReadonly();
  readonly sentCount = computed(() => this._sent().length);

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('sent_emails')
      .select('id, to_email, subject, sent_at')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false });
    this._sent.set(data ?? []);
  }

  async logSent(to: string, subject: string, body: string, userId: string): Promise<void> {
    const { data } = await supabase
      .from('sent_emails')
      .insert({ user_id: userId, to_email: to, subject, body })
      .select('id, to_email, subject, sent_at')
      .single();
    if (data) this._sent.update(s => [data, ...s]);
  }

  openGmailCompose(to: string, subject: string, body: string): void {
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank');
  }

  async clearLog(userId: string): Promise<void> {
    await supabase.from('sent_emails').delete().eq('user_id', userId);
    this._sent.set([]);
  }
}
```

### 8.8 ActivityService

```ts
// src/app/core/services/activity.service.ts
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly _activity = signal<ActivityEntry[]>([]);
  readonly activity = this._activity.asReadonly();

  async load(userId: string): Promise<void> {
    const { data } = await supabase
      .from('activity_log')
      .select('id, message, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    this._activity.set(data ?? []);
  }

  async add(message: string, userId: string): Promise<void> {
    const { data } = await supabase
      .from('activity_log')
      .insert({ user_id: userId, message })
      .select('id, message, created_at')
      .single();
    if (data) this._activity.update(a => [data, ...a].slice(0, 20));
  }
}
```

---

## 9. App Shell Component

The root `app.ts` renders the full shell — sidebar on the left, `<router-outlet>` on the right. The sidebar is hidden when the route is under `/auth`.

```ts
// src/app/app.ts
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, SidebarComponent, NgIf],
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);
  readonly isAuthRoute = computed(() =>
    this.router.url.startsWith('/auth')
  );
}
```

```html
<!-- src/app/app.html -->
<div class="flex min-h-screen bg-[hsl(var(--bg))]">
  @if (!isAuthRoute()) {
    <app-sidebar />
  }
  <main class="flex-1 min-w-0">
    <router-outlet />
  </main>
</div>
```

---

## 10. Sidebar Component

Maps directly to the prototype sidebar. Uses `RouterLinkActive` for active state and exposes Gmail status from `ConfigService`.

```ts
// src/app/shared/components/sidebar/sidebar.ts
@Component({
  selector: 'app-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './sidebar.html',
})
export class SidebarComponent {
  protected readonly config = inject(ConfigService);
  protected readonly leads = inject(LeadsService);
  protected readonly email = inject(EmailService);
  protected readonly auth = inject(AuthService);

  readonly gmailConnected = computed(() => this.config.hasGmail());
  readonly totalLeads = computed(() => this.leads.totalLeads());
  readonly sentCount = computed(() => this.email.sentCount());

  signOut() {
    this.auth.signOut();
  }
}
```

**Nav items:**

| Label | Route | Badge |
|---|---|---|
| Dashboard | `/dashboard` | — |
| Find Leads | `/leads/find` | — |
| Pipeline | `/pipeline` | Total leads count |
| Compose & Send | `/compose` | — |
| Sent Emails | `/sent` | Sent count |
| API Setup | `/settings/setup` | — |
| My Business | `/settings/profile` | — |

---

## 11. Auth Feature

### LoginComponent

- Reactive Form: `email` (required, email validator), `password` (required, minLength 6)
- On submit: calls `AuthService.signIn()`, on success navigates to `/dashboard`
- On error: shows inline error from Supabase response
- Link to `/auth/signup` and `/auth/reset`

### SignupComponent

- Reactive Form: `email`, `password`, `confirmPassword` (custom cross-field validator)
- On success: shows "Check your email to confirm your account" message
- Does not auto-navigate — Supabase sends confirmation email

### ResetComponent

- Single `email` field
- On success: shows "Password reset email sent"

All three components use Spartan UI: `HlmButton`, `HlmInput`, `HlmLabel`, `HlmFormField`, `HlmError`.

---

## 12. Feature Components

### 12.1 Dashboard (`/dashboard`)

**Template sections:**
1. **Stats grid** (4 columns) — driven by `computed()` signals from services:
   - Total Leads (`LeadsService.totalLeads`)
   - Hot Leads (`LeadsService.hotLeads`)
   - Emails Sent (`EmailService.sentCount`)
   - Contacted (`LeadsService.contactedLeads`)

2. **Pipeline snapshot** (4 columns) — shows first 5 cards in each status:
   - New, Contacted (from `LeadsService`)
   - Replied, Converted (static — 0 until manual update)

3. **Recent activity** — last 8 entries from `ActivityService.activity`

**On init:** calls `LeadsService.loadLeads()`, `EmailService.load()`, `ActivityService.load()` in parallel.

### 12.2 Find Leads (`/leads/find`)

**Template sections:**
1. **Warning banners** (if no Google/Claude key) — links to `/settings/setup`
2. **Search form** (Reactive Form):
   - `businessType` (text, required)
   - `city` (text, required)
   - `count` (select: 10 / 20 / 60)
   - `offering` (text)
3. **Results table** (Spartan `HlmTable`) with columns: Company, Category, Location, Rating, AI Score, Contact, Actions
4. **"AI Score All" button** + **"Export CSV" button**

**On search:**
1. Call `PlacesService.search(type, city, config.gp_key)`
2. Map results to `Lead` objects and call `LeadsService.addLeads()`
3. Render table
4. If Claude key is set, auto-call `ClaudeService.scoreBatch()` in batches of 5

**Score badge update:** each row's score cell is bound to the lead's `ai_score` in the service signal — updates reactively as scoring completes.

**Export CSV:** generates a `Blob` from current leads array, triggers download.

### 12.3 Pipeline (`/pipeline`)

4-column kanban using `LeadsService` computed signals:
- `newLeads`, `contactedList`, `repliedList`, `convertedList`

Each lead card shows: name, city, AI score badge, and a "Compose Email →" link to `/compose?leadId=<id>`.

Replied and Converted columns are static / manually updated in this phase.

### 12.4 Compose & Send (`/compose`)

**Left panel:**
- Lead selector (`HlmSelect`) — options from `LeadsService.leads()`
- On select: pre-fills Company, Website, Contact Name from lead record
- Contact Name, Job Title, Company, Website fields (Reactive Form)
- Tone selector (Professional / Friendly / Consultative / Urgent)
- Template selector (Cold Intro / Value Prop / Problem–Solution / Follow-Up)
- "AI Draft Email" button — calls `ClaudeService.draftEmail()`
- Fallback template used if no Claude key

**Right panel:**
- TO, FROM (read-only, from `ConfigService.config().gm_email`), SUBJECT fields
- Email body `<textarea>` — editable
- "Send via Gmail" button:
  1. Validates TO + SUBJECT + body
  2. Calls `EmailService.openGmailCompose(to, subject, body)`
  3. Logs to `EmailService.logSent()`
  4. Updates lead status to `'contacted'` via `LeadsService.updateLead()`
  5. Adds activity entry via `ActivityService.add()`

**URL param support:** if navigated to with `?leadId=<id>`, auto-selects that lead on init.

### 12.5 Sent Emails (`/sent`)

- Loads from `EmailService.sent` signal
- Each row: TO address, subject, sent time
- "Clear Log" button with confirmation dialog (`HlmDialog`)

### 12.6 API Setup (`/settings/setup`)

Three sections — Google Places, Anthropic, Gmail — each with:
- Step-by-step numbered instructions (styled setup cards)
- Input field(s)
- "Save" button → calls `ConfigService.save()`
- "Test Connection" button → makes a minimal test API call, shows inline status

On save, `ConfigService` updates the Supabase `user_config` row and the in-memory signal.

### 12.7 My Business (`/settings/profile`)

- Reactive Form with all profile fields
- Live email signature preview panel using `computed()` from form `valueChanges` (converted to signal via `toSignal()`)
- "Save Profile" → calls `ProfileService.save()` which upserts the `profiles` table row

---

## 13. SSR Considerations

The app has SSR enabled. These patterns must be followed:

```ts
// Inject PLATFORM_ID and guard browser-only APIs
private readonly platformId = inject(PLATFORM_ID);

someMethod() {
  if (!isPlatformBrowser(this.platformId)) return;
  // safe to use window, document, localStorage here
}
```

Affected areas:
- `EmailService.openGmailCompose()` — uses `window.open`
- `EmailService.exportCSV()` — uses `URL.createObjectURL`
- `ClaudeService` / `PlacesService` — external API calls (safe via `HttpClient` with `withFetch()`)
- Supabase client init — wrap in `isPlatformBrowser` check in `supabase.client.ts`

In `app.config.ts`:
```ts
provideHttpClient(withFetch())
```

---

## 14. App Config

```ts
// src/app/app.config.ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideClientHydration(),
  ],
};
```

---

## 15. Implementation Phases

| Phase | Work |
|---|---|
| 1 | Supabase project creation, run schema SQL, enable RLS |
| 2 | `environment.ts` setup, Supabase client, `npm install @supabase/supabase-js` |
| 3 | Spartan UI installation (all components listed in §3.2) |
| 4 | Dark theme CSS variables in `styles.css` |
| 5 | Core models, core services (Auth, Config, Leads, Activity, Profile, Email) |
| 6 | `authGuard`, app routing (`app.routes.ts`) |
| 7 | Auth feature: Login, Signup, Reset components |
| 8 | App shell (`app.ts`), Sidebar, Topbar shared components |
| 9 | Dashboard feature |
| 10 | Find Leads feature + PlacesService + ClaudeService (scoring) |
| 11 | Pipeline feature |
| 12 | Compose & Send feature + ClaudeService (email draft) |
| 13 | Sent Emails feature |
| 14 | API Setup feature |
| 15 | My Business / Profile feature |
| 16 | SSR audit — wrap all `window`/`document` calls in `isPlatformBrowser` |
| 17 | `ng build` bundle size audit, fix any budget overruns |

---

## 16. Verification Checklist

- [ ] `ng serve` starts without errors
- [ ] `ng build` completes within 500kB initial budget
- [ ] `/auth/login` redirects to `/dashboard` on success
- [ ] Unauthenticated visit to `/dashboard` redirects to `/auth/login`
- [ ] Signup → email confirmation flow works
- [ ] Supabase `user_config` trigger auto-creates profile + config rows on signup
- [ ] Google Places search returns real company data
- [ ] AI scoring updates lead badge cells reactively as each batch completes
- [ ] Claude email draft populates subject + body fields
- [ ] Fallback template used when no Claude key
- [ ] "Send via Gmail" opens pre-filled Gmail compose tab
- [ ] Sent email is logged to Supabase `sent_emails`
- [ ] Lead status updates to `contacted` after email send
- [ ] Pipeline kanban reflects correct lead counts from signals
- [ ] API keys saved to Supabase `user_config` (not localStorage)
- [ ] Business profile saves to Supabase `profiles`
- [ ] Email signature preview updates live as form changes
- [ ] CSV export downloads correctly
- [ ] All Spartan UI components render with the dark theme
- [ ] No AXE accessibility violations on any page
