import { useCallback, useState } from 'react';

export type AdminTab = 'reports' | 'accounts';

export default function useAdminTabs(initial: AdminTab = 'reports') {
  const [activeTab, setActiveTab] = useState<AdminTab>(initial);

  const selectReports = useCallback(() => setActiveTab('reports'), []);
  const selectAccounts = useCallback(() => setActiveTab('accounts'), []);

  return {
    activeTab,
    setActiveTab,
    selectReports,
    selectAccounts,
    isReports: activeTab === 'reports',
    isAccounts: activeTab === 'accounts',
  } as const;
}
