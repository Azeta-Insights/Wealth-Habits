import React, { useState } from 'react';
import { Download, Share2, X, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'minimal';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'outline'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);

  // If already running as an installed standalone PWA, hide install prompts
  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200">
        <Check className="w-3 h-3" />
        Installed App
      </span>
    );
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 3000);
    }
  };

  const getButtonStyles = () => {
    if (variant === 'primary') {
      return 'bg-[#3D5A45] hover:bg-[#324B39] text-white shadow-sm';
    }
    if (variant === 'minimal') {
      return 'bg-transparent text-[#3D5A45] hover:bg-[#EAE5D9]/60';
    }
    return 'border border-[#3D5A45]/30 text-[#3D5A45] hover:bg-[#3D5A45]/10 bg-white/80';
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <>
        <button
          id="pwa-install-button"
          onClick={handleInstallClick}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${getButtonStyles()} ${className}`}
          title="Install Wealth Habits on your device for instant offline access"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{installSuccess ? 'Installing...' : 'Install App'}</span>
        </button>
      </>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-button"
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${getButtonStyles()} ${className}`}
          title="Install Wealth Habits on your iPhone or iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Add to Home Screen</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-[#FDFBF7] border border-[#EAE5D9] p-6 shadow-2xl relative text-[#242924]">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#EAE5D9] text-[#636E65]"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#3D5A45] flex items-center justify-center text-white">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1E2620]">Install on iPhone / iPad</h3>
                  <p className="text-xs text-[#636E65]">Run offline like a native app</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-[#3E4A40] bg-white rounded-xl p-4 border border-[#EAE5D9]">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EAE5D9] text-xs font-bold flex items-center justify-center text-[#242924]">1</span>
                  <span>Tap the <strong className="inline-flex items-center gap-1 font-semibold text-[#1E2620]"><Share2 className="w-3.5 h-3.5 inline" /> Share</strong> icon in your Safari toolbar.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EAE5D9] text-xs font-bold flex items-center justify-center text-[#242924]">2</span>
                  <span>Scroll down and tap <strong className="font-semibold text-[#1E2620]">Add to Home Screen</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#EAE5D9] text-xs font-bold flex items-center justify-center text-[#242924]">3</span>
                  <span>Tap <strong className="font-semibold text-[#1E2620]">Add</strong> in the top-right corner.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[#3D5A45] py-2.5 text-xs font-bold text-white hover:bg-[#324B39] transition shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Generic / desktop helper if browser hasn't fired beforeinstallprompt or on standard browser
  return (
    <>
      <button
        id="pwa-install-desktop-button"
        onClick={() => setShowDesktopGuide(true)}
        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all duration-150 ${getButtonStyles()} ${className}`}
        title="Install app to your home screen or desktop"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showDesktopGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[#FDFBF7] border border-[#EAE5D9] p-6 shadow-2xl relative text-[#242924]">
            <button
              onClick={() => setShowDesktopGuide(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#EAE5D9] text-[#636E65]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#3D5A45] flex items-center justify-center text-white">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1E2620]">Install Wealth Habits</h3>
                <p className="text-xs text-[#636E65]">Access directly from your desktop or phone</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-[#3E4A40] bg-white rounded-xl p-4 border border-[#EAE5D9]">
              <p className="text-xs text-[#636E65]">
                To install Wealth Habits as a standalone app:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-[#3E4A40]">
                <li><strong className="text-[#1E2620]">Chrome / Edge:</strong> Click the <strong>Install</strong> icon in the address bar (right side).</li>
                <li><strong className="text-[#1E2620]">Android:</strong> Tap browser menu (⋮) and tap <strong>Add to Home Screen</strong>.</li>
                <li><strong className="text-[#1E2620]">iPhone / Safari:</strong> Tap Share button and choose <strong>Add to Home Screen</strong>.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowDesktopGuide(false)}
              className="mt-5 w-full rounded-xl bg-[#3D5A45] py-2.5 text-xs font-bold text-white hover:bg-[#324B39] transition shadow-sm"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
