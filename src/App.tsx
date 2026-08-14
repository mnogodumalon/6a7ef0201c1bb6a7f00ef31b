import '@/lib/sentry';
import '@/lib/stale-bundle';
import { Fragment, lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { locale, onLocaleChange, syncProfileLocale } from '@/i18n';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import PublicPagesAdmin from '@/pages/PublicPagesAdmin';
import HandwerkerPage from '@/pages/HandwerkerPage';
import HandwerkerDetailPage from '@/pages/HandwerkerDetailPage';
import WerkzeugePage from '@/pages/WerkzeugePage';
import WerkzeugeDetailPage from '@/pages/WerkzeugeDetailPage';
import AusleihePage from '@/pages/AusleihePage';
import AusleiheDetailPage from '@/pages/AusleiheDetailPage';
import ReparaturWartungPage from '@/pages/ReparaturWartungPage';
import ReparaturWartungDetailPage from '@/pages/ReparaturWartungDetailPage';
// <custom:imports>
const IntentWerkzeugAusleihenPage = lazy(() => import('@/pages/intents/WerkzeugAusleihenPage'));
const IntentWerkzeugZurueckgebenPage = lazy(() => import('@/pages/intents/WerkzeugZurueckgebenPage'));
const IntentReparaturWartungErfassenPage = lazy(() => import('@/pages/intents/ReparaturWartungErfassenPage'));
// </custom:imports>

// Lazy: public pages live outside <Layout> and only load on /#/public/:slug —
// dashboard users never pay for them, anonymous visitors skip the dashboard.
const PublicPage = lazy(() => import('@/pages/public/PublicPage'));

// Language switch = full remount below the router: every t()/label lookup
// re-evaluates, the la-* widgets re-read <html lang>. Sits INSIDE
// ActionsProvider so chat/drawer state survives a switch, and inside
// HashRouter so the current route survives (it re-reads the URL hash).
function LocaleGate({ children }: { children: React.ReactNode }) {
  // The i18n layer notifies for locale CHANGES and for catalog/overlay
  // ARRIVALS (same locale, new data). `setCurrent(locale)` bailed out on
  // the arrivals — when locales/pages.json lost the race against the first
  // paint, the page stayed frozen in the build language until the next
  // locale switch. A generation counter accepts every notification; the
  // key must include it because `children` is the same element object on
  // every gate render (React would bail out without the remount).
  const [gen, setGen] = useState(0);
  useEffect(() => onLocaleChange(() => setGen((g) => g + 1)), []);
  // Adopt the LA profile language (SSOT) — but never on public routes,
  // where the visitor's browser language governs (initPublicLocale).
  useEffect(() => {
    if (!window.location.hash.startsWith('#/public')) void syncProfileLocale();
  }, []);
  return <Fragment key={`${locale}:${gen}`}>{children}</Fragment>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <LocaleGate>
            <Routes>
              <Route path="public/:slug" element={<Suspense fallback={null}><PublicPage /></Suspense>} />
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="handwerker" element={<HandwerkerPage />} />
                <Route path="handwerker/:id" element={<HandwerkerDetailPage />} />
                <Route path="werkzeuge" element={<WerkzeugePage />} />
                <Route path="werkzeuge/:id" element={<WerkzeugeDetailPage />} />
                <Route path="ausleihe" element={<AusleihePage />} />
                <Route path="ausleihe/:id" element={<AusleiheDetailPage />} />
                <Route path="reparatur-wartung" element={<ReparaturWartungPage />} />
                <Route path="reparatur-wartung/:id" element={<ReparaturWartungDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                <Route path="verwaltung/oeffentliche-seiten" element={<PublicPagesAdmin />} />
                {/* <custom:routes> */}
                <Route path="intents/werkzeug-ausleihen" element={<Suspense fallback={null}><IntentWerkzeugAusleihenPage /></Suspense>} />
                <Route path="intents/werkzeug-zurueckgeben" element={<Suspense fallback={null}><IntentWerkzeugZurueckgebenPage /></Suspense>} />
                <Route path="intents/reparatur-wartung-erfassen" element={<Suspense fallback={null}><IntentReparaturWartungErfassenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
            </LocaleGate>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
