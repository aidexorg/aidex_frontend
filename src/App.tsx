import { useCallback, useEffect, useState } from 'react';
import { Layout, type View } from '@/components/Layout';
import { ProfilesList } from '@/components/ProfilesList';
import { ProfileDetail } from '@/components/ProfileDetail';
import { ProfileForm } from '@/components/ProfileForm';
import { FollowupsView } from '@/components/FollowupsView';
import { PaymentsView } from '@/components/PaymentsView';
import { ReportsView } from '@/components/ReportsView';
import { OutputsView } from '@/components/OutputsView';
import { RegisterView } from '@/components/RegisterView';
import { LoginView } from '@/components/LoginView';
import { AuthShell } from '@/components/AuthShell';
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
  const [creatingProfile, setCreatingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const apply = (current: Account | null) => {
      if (cancelled) return;
      setAccount(current);
      setView(current ? 'profiles' : 'login');
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
      if (!account) {
        setView(isAuthView(v) ? v : 'login');
        return;
      }
      if (isAuthView(v)) {
        setView('profiles');
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
    setView('profiles');
  };

  const handleLogout = async () => {
    await data.logoutAccount();
    setAccount(null);
    setActiveProfile(null);
    setCreatingProfile(false);
    setView('login');
  };

  const openProfile = (profile: Profile) => {
    setCreatingProfile(false);
    setActiveProfile(profile);
    setView('profiles');
  };

  if (!account) {
    return (
      <AuthShell>
        {view === 'register' ? (
          <RegisterView
            onGoLogin={() => setView('login')}
            onAuthenticated={enterApp}
          />
        ) : (
          <LoginView
            onGoRegister={() => setView('register')}
            onAuthenticated={enterApp}
          />
        )}
      </AuthShell>
    );
  }

  const renderView = () => {
    if (view === 'profiles') {
      if (activeProfile) {
        return (
          <ProfileDetail
            profile={activeProfile}
            onBack={() => setActiveProfile(null)}
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
          onOpenProfile={openProfile}
          onCreateProfile={() => setCreatingProfile(true)}
        />
      );
    }
    if (view === 'followups') return <FollowupsView onOpenProfile={openProfile} />;
    if (view === 'payments') return <PaymentsView onOpenProfile={openProfile} />;
    if (view === 'reports') return <ReportsView />;
    if (view === 'outputs') return <OutputsView onOpenProfile={openProfile} />;
    return (
      <ProfilesList
        onOpenProfile={openProfile}
        onCreateProfile={() => {
          setView('profiles');
          setCreatingProfile(true);
        }}
      />
    );
  };

  return (
    <Layout
      current={view}
      onNavigate={navigate}
      account={account}
      onLogout={() => {
        void handleLogout();
      }}
    >
      {renderView()}
    </Layout>
  );
}

export default App;
