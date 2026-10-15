import React, { useState } from 'react';
import {
  Download,
  Check,
  X,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Info,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface AndroidApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidApkModal: React.FC<AndroidApkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, install } = usePWAInstall();
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showDeviceTips, setShowDeviceTips] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const apkDownloadUrl = `${currentUrl}/FabTune.apk`;

  const handleDownloadClick = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/FabTune.apk';
    link.download = 'FabTune.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(apkDownloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWebApkInstall = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/15 p-6 shadow-2xl text-white space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20">
              <Smartphone className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Download for Android</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  APK
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Official package • Android 8.0 to 15 • Universal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-zinc-900 to-zinc-950 border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                FabTune Android App
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Enjoy background playback with lock screen media notifications, vinyl turntable disc visualizer, and 0 ads.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xs font-mono font-bold text-emerald-400">1.4 MB</div>
              <div className="text-[10px] text-zinc-400">Verified signed</div>
            </div>
          </div>
        </div>

        {/* Primary Download Button */}
        <div className="space-y-2.5">
          <button
            onClick={handleDownloadClick}
            className="w-full py-3.5 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>Download FabTune.apk (1.4 MB)</span>
          </button>

          {downloadStarted && (
            <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>
                Download started! Tap the downloaded <strong>FabTune.apk</strong> in your notifications or Chrome downloads to install.
              </span>
            </div>
          )}

          {/* Secondary Options: WebAPK & Share/QR */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {isInstallable ? (
              <button
                onClick={handleWebApkInstall}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
                title="Direct Android system integration without manual APK sideloading"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Install WebAPK</span>
              </button>
            ) : (
              <button
                onClick={() => setShowQr(!showQr)}
                className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                <span>{showQr ? 'Hide QR' : 'Phone QR Code'}</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy APK Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code Section for Desktop to Mobile handoff */}
        {showQr && (
          <div className="p-4 rounded-2xl bg-zinc-900 border border-white/10 text-center space-y-3 animate-in fade-in">
            <p className="text-xs text-zinc-300">
              Scan with your <strong>Android Camera</strong> to download directly to your phone:
            </p>
            <div className="p-3 bg-white rounded-2xl inline-block shadow-md">
              {/* Responsive SVG QR code representation */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                  apkDownloadUrl
                )}&bgcolor=ffffff&color=09090b&margin=2`}
                alt="Scan to download Android APK"
                className="w-36 h-36 mx-auto rounded-lg"
                loading="lazy"
              />
            </div>
            <p className="text-[11px] text-zinc-400 font-mono break-all px-2">
              {apkDownloadUrl}
            </p>
          </div>
        )}

        {/* Step-by-Step Installation Guide */}
        <div className="space-y-3 pt-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            How to Install on Android
          </h5>

          <div className="space-y-2.5 text-xs text-zinc-300">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                1
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-white">Tap "Download FabTune.apk"</div>
                <div className="text-[11px] text-zinc-400">
                  Chrome may show <em>"File might be harmful"</em> because it is downloaded directly outside Google Play. Tap <strong>Download anyway</strong>.
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                2
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-white">Open the Downloaded APK</div>
                <div className="text-[11px] text-zinc-400">
                  Tap <strong>Open</strong> from the notification bar or open <em>Files / Downloads &gt; FabTune.apk</em>.
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
                3
              </div>
              <div className="space-y-0.5">
                <div className="font-semibold text-white">Allow Unknown Apps & Install</div>
                <div className="text-[11px] text-zinc-400">
                  If prompted, tap <strong>Settings</strong> &gt; toggle <strong>Allow from this source</strong> ON, then tap <strong>Install</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Device-Specific Troubleshooting Accordion */}
        <div className="border border-white/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowDeviceTips(!showDeviceTips)}
            className="w-full p-3 bg-zinc-900/60 hover:bg-zinc-900 flex items-center justify-between text-xs text-zinc-300 font-medium transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Samsung, Xiaomi, Pixel device tips</span>
            </div>
            {showDeviceTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showDeviceTips && (
            <div className="p-3.5 bg-zinc-950/80 space-y-2 text-[11px] text-zinc-400 border-t border-white/5">
              <p>
                <strong className="text-zinc-200">Samsung One UI:</strong> Settings &gt; Security and privacy &gt; Install unknown apps &gt; Chrome &gt; Toggle ON.
              </p>
              <p>
                <strong className="text-zinc-200">Xiaomi / Redmi (MIUI / HyperOS):</strong> Settings &gt; Privacy &gt; Special permissions &gt; Install unknown apps &gt; Check "I am aware" &gt; OK.
              </p>
              <p>
                <strong className="text-zinc-200">Google Pixel:</strong> Settings &gt; Apps &gt; Special app access &gt; Install unknown apps &gt; Chrome &gt; Allow.
              </p>
            </div>
          )}
        </div>

        {/* Package Specs Footer */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-500 font-mono">
          <span>Package: com.webview.myapplication</span>
          <span>Target: Android 14+ (API 34)</span>
          <span>Architecture: Universal</span>
        </div>
      </div>
    </div>
  );
};
