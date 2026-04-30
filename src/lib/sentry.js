import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
});

// TODO: remover após confirmar que o Sentry recebe eventos
Sentry.captureMessage("Sentry teste - ok");

export default Sentry;
