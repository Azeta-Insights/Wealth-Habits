import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="offline-status-pill"
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#242924]/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-emerald-200 border border-emerald-800/40 shadow-xl"
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>100% Offline Mode &mdash; All transactions and insights are safe on this device.</span>
    </div>
  );
};
