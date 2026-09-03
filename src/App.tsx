import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ToastProvider } from './context/ToastContext';

import { Dashboard } from './screens/Dashboard';
import { Practice } from './screens/Practice';
import { Guides } from './screens/Guides';
import { Retention } from './screens/Retention';
import { Lookup } from './screens/Lookup';

const App: React.FC = () => {
  return (
    <AppProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="practice" element={<Practice />} />
              <Route path="lookup" element={<Lookup />} />
              {/* Where the app answers what it is actually for: not how much has been
                  practised, but what would still be recalled if you stopped today. */}
              <Route path="retention" element={<Retention />} />
              {/* One screen, three addresses: the guide index, a single guide, and the
                  reader. Guides already switched between these views internally off
                  query params; the routes just give each one a real URL. */}
              <Route path="guides" element={<Guides />} />
              <Route path="guides/:guideId" element={<Guides />} />
              <Route path="bible/:ref" element={<Guides />} />
            </Route>
          </Routes>
        </HashRouter>
      </ToastProvider>
    </AppProvider>
  );
};

export default App;
