import { useState } from 'react';
import { Layout, type View } from '@/components/Layout';
import { ProfilesList } from '@/components/ProfilesList';
import { ProfileDetail } from '@/components/ProfileDetail';
import { FollowupsView } from '@/components/FollowupsView';
import { PaymentsView } from '@/components/PaymentsView';
import { ReportsView } from '@/components/ReportsView';
import { OutputsView } from '@/components/OutputsView';
import type { Profile } from '@/types';

function App() {
  const [view, setView] = useState<View>('profiles');
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);

  const openProfile = (profile: Profile) => {
    setActiveProfile(profile);
    setView('profiles');
  };

  const navigate = (v: View) => {
    setActiveProfile(null);
    setView(v);
  };

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
      return <ProfilesList onOpenProfile={openProfile} />;
    }
    if (view === 'followups') return <FollowupsView onOpenProfile={openProfile} />;
    if (view === 'payments') return <PaymentsView onOpenProfile={openProfile} />;
    if (view === 'reports') return <ReportsView />;
    if (view === 'outputs') return <OutputsView onOpenProfile={openProfile} />;
    return <ProfilesList onOpenProfile={openProfile} />;
  };

  return (
    <Layout current={view} onNavigate={navigate}>
      {renderView()}
    </Layout>
  );
}

export default App;
