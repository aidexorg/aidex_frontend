import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Layout, type View } from '@/components/Layout';
import { AuthShell } from '@/components/AuthShell';
import { ToastProvider } from '@/components/ToastProvider';
import { FollowupCountProvider } from '@/components/FollowupCountProvider';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PwaUpdateNotice } from '@/components/PwaUpdateNotice';
import { LoadingState } from '@/components/ui';
import { useData } from '@/data';
import { shouldIgnoreShortcut } from '@/lib/accessibility';
import type { Account, Profile } from '@/types';
import type { ProfileDetailTab, ProfileDetailIntent } from '@/components/ProfileDetail';

// Lazy-load heavy view components to split the bundle
const DashboardView = lazy(() => import('@/components/dashboard').then(m => ({ default: m.DashboardView })));
const ProfilesList = lazy(() => import('@/components/ProfilesList').then(m => ({ default: m.ProfilesList })));
const ProfileDetail = lazy(() => import('@/components/ProfileDetail').then(m => ({ default: m.ProfileDetail })));
const ProfileForm = lazy(() => import('@/components/ProfileForm').then(m => ({ default: m.ProfileForm })));
const AppointmentsView = lazy(() => import('@/components/AppointmentsView').then(m => ({ default: m.AppointmentsView })));
const LoginView = lazy(() => import('@/components/LoginView').then(m => ({ default: m.LoginView })));
const RegisterView = lazy(() => import('@/components/RegisterView').then(m => ({ default: m.RegisterView })));
const OnboardingOverlay = lazy(() => import('@/components/OnboardingOverlay').then(m => ({ default: m.OnboardingOverlay })));

const AUTH_VIEWS: View[] = ['login', 'register'];

function isAuthView(view: View): boolean {
  return AUTH_VIEWS.includes(view);
}

function App() {
  const data = useData();
  const [account, setAccount] = useState<Account | null>(null);
  const [view, setView] = useState<View>('login');
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfileDetailTab>('profile');
  const [profileIntent, setProfileIntent] = useState<ProfileDetailIntent | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apply = (current: Account | null) => {
      if (cancelled) return;
      setAccount(current);
      setView(current ? 'dashboard' : 'login');
    };

    void data
      .getCurrentAccount()
      .then((current) => apply(current))
      .catch(() => apply(null));

    return () => {
      cancelled = true;
    };
  }, [data]);

  const navigate = useCallback(
    (v: View) => {
      setActiveProfile(null);
      setCreatingProfile(false);
      setEditingProfile(false);
      setProfileInitialTab('profile');
      setProfileIntent(null);
      if (!account) {
        setView(isAuthView(v) ? v : 'login');
        return;
      }
      if (isAuthView(v)) {
        setView('dashboard');
        return;
      }
      setView(v);
    },
    [account],
  );

  const enterApp = (next: Account) => {
    setAccount(next);
    setActiveProfile(null);
    setCreatingProfile(false);
    setEditingProfile(false);
    setProfileInitialTab('profile');
    setProfileIntent(null);
    setView('dashboard');
  };

  const handleLogout = async () => {
    await data.logoutAccount();
    setAccount(null);
    setActiveProfile(null);
    setCreatingProfile(false);
    setEditingProfile(false);
    setProfileIntent(null);
    setView('login');
  };

  const openProfile = (
    profile: Profile,
    tab: ProfileDetailTab = 'profile',
    intent: ProfileDetailIntent | null = null,
  ) => {
    setCreatingProfile(false);
    setEditingProfile(false);
    setActiveProfile(profile);
    setProfileInitialTab(tab);
    setProfileIntent(intent);
    setView('profiles');
  };

  const startCreatingProfile = useCallback(() => {
    setActiveProfile(null);
    setEditingProfile(false);
    setProfileInitialTab('profile');
    setProfileIntent(null);
    setCreatingProfile(true);
    setView('profiles');
  }, []);

  useEffect(() => {
    if (!account) return;
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        shouldIgnoreShortcut(event) ||
        document.querySelector('[role="dialog"][aria-modal="true"]') ||
        !event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.code !== 'KeyN'
      ) {
        return;
      }
      event.preventDefault();
      startCreatingProfile();
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [account, startCreatingProfile]);

  const renderView = () => {
    if (view === 'dashboard') {
      return <DashboardView onNavigate={navigate} onOpenProfile={(p) => openProfile(p)} />;
    }
    if (view === 'appointments') {
      return <AppointmentsView onOpenProfile={(p) => openProfile(p)} />;
    }
    if (view === 'profiles') {
      if (activeProfile && editingProfile) {
        return (
          <ProfileForm
            variant="page"
            editing={activeProfile}
            onClose={() => setEditingProfile(false)}
            onSaved={(updated) => {
              setEditingProfile(false);
              setActiveProfile(updated);
            }}
          />
        );
      }
      if (activeProfile) {
        return (
          <ProfileDetail
            profile={activeProfile}
            initialTab={profileInitialTab}
            initialIntent={profileIntent}
            onInitialIntentHandled={() => setProfileIntent(null)}
            onBack={() => {
              setActiveProfile(null);
              setProfileIntent(null);
            }}
            onEditProfile={() => setEditingProfile(true)}
          />
        );
      }
      if (creatingProfile) {
        return (
          <ProfileForm
            variant="page"
            onClose={() => setCreatingProfile(false)}
            onSaved={(profile) => {
              setCreatingProfile(false);
              setActiveProfile(profile);
            }}
          />
        );
      }
      return (
        <ProfilesList
          onOpenProfile={(p, tab, intent) => openProfile(p, tab ?? 'profile', intent ?? null)}
          onCreateProfile={startCreatingProfile}
        />
      );
    }
    return <DashboardView onNavigate={navigate} onOpenProfile={(p) => openProfile(p)} />;
  };

  const shell = !account ? (
    <AuthShell>
      <Suspense fallback={<LoadingState />}>
        {view === 'register' ? (
          <RegisterView onGoLogin={() => setView('login')} onAuthenticated={enterApp} />
        ) : (
          <LoginView onGoRegister={() => setView('register')} onAuthenticated={enterApp} />
        )}
      </Suspense>
    </AuthShell>
  ) : (
    <FollowupCountProvider view={view}>
      <Layout
        current={view}
        onNavigate={navigate}
        account={account}
        onLogout={() => {
          void handleLogout();
        }}
        onSelectProfile={(p) => openProfile(p)}
      >
        <Suspense fallback={<LoadingState />}>
          {renderView()}
        </Suspense>
        <Suspense fallback={null}>
          <OnboardingOverlay
            accountId={account.id}
            currentView={view}
            onNavigate={navigate}
          />
        </Suspense>
      </Layout>
    </FollowupCountProvider>
  );

  return (
    <ToastProvider>
      {shell}
      <OfflineBanner offset={account ? 'layout' : 'auth'} />
      <PwaUpdateNotice />
    </ToastProvider>
  );
}

export default App;
