import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://7c6303e319a9c36fc47bf1c74680f46f@o4508941292535808.ingest.us.sentry.io/4508941293780992",

  integrations: [
    Sentry.replayIntegration(),
  ],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});