import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';
import { I18nProvider } from './i18n.jsx';
import { AuthProvider, RequireAuth, Loading } from './ui.jsx';
import Landing from './pages/Landing.jsx';
import { ContextMenuProvider, CursorRing } from './chrome.jsx';

const Auth = lazy(() => import('./pages/Auth.jsx'));
const Dash = lazy(() => import('./pages/Dashboard.jsx').then(m => ({ default: m.Designs })));
const Modpacks = lazy(() => import('./pages/Dashboard.jsx').then(m => ({ default: m.Workspaces })));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Editor = lazy(() => import('./pages/Editor.jsx'));
const LinkDevice = lazy(() => import('./pages/LinkDevice.jsx'));
const pub = name => lazy(() => import('./pages/Public.jsx').then(m => ({ default: m[name] })));
const [Gallery, PublicDesign, FreeApis, Legal, NotFound] = ['Gallery', 'PublicDesign', 'FreeApis', 'Legal', 'NotFound'].map(pub);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <ContextMenuProvider>
          <CursorRing />
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/entrar" element={<Auth mode="login" />} />
              <Route path="/registro" element={<Auth mode="signup" />} />
              <Route path="/recuperar" element={<Auth mode="forgot" />} />
              <Route path="/restablecer" element={<Auth mode="reset" />} />
              <Route path="/verificar" element={<Auth mode="verify" />} />
              <Route path="/galeria" element={<Gallery />} />
              <Route path="/d/:slug" element={<PublicDesign />} />
              <Route path="/guia/ia-gratis" element={<FreeApis />} />
              <Route path="/privacidad" element={<Legal kind="privacy" />} />
              <Route path="/terminos" element={<Legal kind="terms" />} />
              <Route path="/app" element={<RequireAuth><Dash /></RequireAuth>} />
              <Route path="/app/modpacks" element={<RequireAuth><Modpacks /></RequireAuth>} />
              <Route path="/app/ajustes" element={<RequireAuth><Settings /></RequireAuth>} />
              <Route path="/app/diseno/:id" element={<RequireAuth><Editor /></RequireAuth>} />
              <Route path="/vincular" element={<RequireAuth><LinkDevice /></RequireAuth>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ContextMenuProvider>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  </StrictMode>,
);
