import { router } from './trpc.js';
import { placesRouter } from './routers/places.js';
import { aiRouter } from './routers/ai.js';
import { leadsRouter } from './routers/leads.js';
import { configRouter } from './routers/config.js';
import { activityRouter } from './routers/activity.js';
import { emailRouter } from './routers/email.js';
import { profileRouter } from './routers/profile.js';
import { authRouter } from './routers/auth.js';
import { adminRouter } from './routers/admin.js';
import { userApiKeysRouter } from './routers/user-api-keys.js';

export const appRouter = router({
  places: placesRouter,
  ai: aiRouter,
  leads: leadsRouter,
  config: configRouter,
  activity: activityRouter,
  email: emailRouter,
  profile: profileRouter,
  auth: authRouter,
  admin: adminRouter,
  userApiKeys: userApiKeysRouter,
});

export type AppRouter = typeof appRouter;
