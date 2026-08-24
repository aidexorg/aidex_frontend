import { useCallback, useEffect, useState } from 'react';
import { Layout, type View } from '@/components/Layout';
import { ProfilesList } from '@/components/ProfilesList';
import { ProfileDetail, type ProfileDetailTab } from '@/components/ProfileDetail';
import { ProfileForm } from '@/components/ProfileForm';
import { AppointmentsView } from '@/components/AppointmentsView';
import { DashboardView } from '@/components/dashboard';
import { RegisterView } from '@/components/RegisterView';
import { LoginView } from '@/components/LoginView';
import { AuthShell } from '@/components/AuthShell';
import { ToastProvider } from '@/components/ToastProvider';
import { FollowupCountProvider } from '@/components/FollowupCountProvider';
import { useData } from '@/data';
import type { Account, Profile } from '@/types';

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
    [account]
  );

  const enterApp = (next: Account) => {
    setAccount(next);
    setActiveProfile(null);
    setCreatingProfile(false);
    setEditingProfile(false);
    setProfileInitialTab('profile');
    setView('dashboard');
  };

  const handleLogout = async () => {
    await data.logoutAccount();
    setAccount(null);
    setActiveProfile(null);
    setCreatingProfile(false);
    setEditingProfile(false);
    setView('login');
  };

  const openProfile = (profile: Profile, tab: ProfileDetailTab = 'profile') => {
    setCreatingProfile(false);
    setEditingProfile(false);
    setActiveProfile(profile);
    setProfileInitialTab(tab);
    setView('profiles');
  };

  if (!account) {
    return (
      <AuthShell>
        {view === 'register' ? (
          <RegisterView onGoLogin={() => setView('login')} onAuthenticated={enterApp} />
        ) : (
          <LoginView onGoRegister={() => setView('register')} onAuthenticated={enterApp} />
        )}
      </AuthShell>
    );
  }

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
            onBack={() => setActiveProfile(null)}
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
          onOpenProfile={(p) => openProfile(p)}
          onCreateProfile={() => setCreatingProfile(true)}
        />
      );
    }
    return <DashboardView onNavigate={navigate} onOpenProfile={(p) => openProfile(p)} />;
  };

  return (
    <ToastProvider>
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
          {renderView()}
        </Layout>
      </FollowupCountProvider>
    </ToastProvider>
  );
}

export default App;
