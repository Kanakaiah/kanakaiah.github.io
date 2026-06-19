import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ToastProvider } from './context/ToastContext';

import { Dashboard } from './screens/Dashboard';
import { Practice } from './screens/Practice';
import { Guides } from './screens/Guides';

const App: React.FC = () => {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="practice" element={<Practice />} />
              <Route path="guides" element={<Guides />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
};

export default App;
