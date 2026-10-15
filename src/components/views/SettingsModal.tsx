import React from 'react';
import { ColorTheme, ThemeBrightness } from '../../types/music';
import { Palette, Sun, Moon, Shield, Volume2, X, Sparkles, Check, Keyboard, Smartphone, Download } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface SettingsModalProps {
  colorTheme: ColorTheme;
  themeBrightness: ThemeBrightness;
  onColorThemeChange: (theme: ColorTheme) => void;
  onThemeBrightnessChange: (b: ThemeBrightness) => void;
  onClose: () => void;
  onResetData: () => void;
  onOpenAndroidApk?: () => void;
}

const THEME_OPTIONS: { id: ColorTheme; label: string; hex: string }[] = [
  { id: 'monet-teal', label: 'Material Monet Mint', hex: '#14b8a6' },
  { id: 'monet-purple', label: 'Material Iris Purple', hex: '#818cf8' },
  { id: 'sunset-amber', label: 'Sunset Amber', hex: '#f59e0b' },
  { id: 'cyber-blue', label: 'Cyan Pulse', hex: '#06b6d4' },
  { id: 'forest-emerald', label: 'Forest Emerald', hex: '#10b981' },
  { id: 'rose-quartz', label: 'Neon Rose', hex: '#f43f5e' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  colorTheme,
  themeBrightness,
  onColorThemeChange,
  onThemeBrightnessChange,
  onClose,
  onResetData,
  onOpenAndroidApk,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-white/10 shadow-2xl p-6 text-white space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold tracking-tight">App Settings & Appearance</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Material 3 Palette */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Material 3 Dynamic Palette
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onColorThemeChange(opt.id)}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  colorTheme === opt.id
                    ? 'bg-white/15 border-white/40 shadow-sm'
                    : 'bg-zinc-900/60 hover:bg-zinc-800 border-white/5'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full shadow-inner shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: opt.hex }}
                >
                  {colorTheme === opt.id && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs font-semibold text-zinc-200 truncate">
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Theme Brightness */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Appearance Mode
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Dark Slate', icon: Moon },
              { id: 'oled', label: 'OLED Pure Black', icon: Shield },
              { id: 'light', label: 'Light', icon: Sun },
            ].map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  onClick={() => onThemeBrightnessChange(mode.id as ThemeBrightness)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all text-xs font-medium ${
                    themeBrightness === mode.id
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile APK & Offline App Installation */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Mobile &amp; Desktop App
          </label>
          <div className="space-y-2">
            <button
              onClick={() => onOpenAndroidApk?.()}
              className="w-full p-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl border border-emerald-500/30 flex items-center justify-between transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>Download Android APK</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">1.4 MB</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">Direct package install with background &amp; lock-screen audio</div>
                </div>
              </div>
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            </button>
            <PWAInstallButton variant="settings" />
          </div>
        </div>

        {/* Global Keyboard Shortcuts Cheat Sheet */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Playback Keyboard Shortcuts</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/5">
              <span className="text-zinc-300">Play / Pause</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-zinc-200">Space</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/5">
              <span className="text-zinc-300">Seek ±5s</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-zinc-200">← / →</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/5">
              <span className="text-zinc-300">Prev / Next</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-zinc-200">J / K</kbd>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900 border border-white/5">
              <span className="text-zinc-300">Volume ±5%</span>
              <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-zinc-200">↑ / ↓</kbd>
            </div>
          </div>
        </div>

        {/* Audio Engine Specs */}
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-semibold text-zinc-200">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Audio Architecture &amp; Offline Cache</span>
          </div>
          <p className="leading-relaxed">
            Engineered with a progressive Service Worker cache, Web Audio API 10-band BiquadFilter equalizer, procedural polyphony, and local audio importer.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={() => {
              if (confirm('Reset custom playlists and restore defaults?')) {
                onResetData();
                onClose();
              }
            }}
            className="text-xs text-rose-400 hover:underline"
          >
            Reset to Factory Defaults
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
