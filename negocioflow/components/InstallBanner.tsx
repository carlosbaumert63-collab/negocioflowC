"use client";
import React, { useEffect, useState } from "react";
import { safeStorage } from "../lib/safeStorage";

const DISMISS_KEY = "nf_install_dismissed_at";
const DISMISS_DAYS = 14;

type Platform = "android" | "ios" | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return false;
  const raw = safeStorage.get(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!dismissedAt) return false;
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || wasDismissedRecently()) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform("android");
      setVisible(true);
    };
    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIOS && isSafari) {
      setPlatform("ios");
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage can fail in private mode; ignore.
    }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  if (!visible || !platform) return null;

  return (
    <div
      role="dialog"
      aria-label="Instalar NegocioFlow"
      className="fixed inset-x-0 z-40 px-4 bottom-[calc(env(safe-area-inset-bottom)+72px)] md:bottom-4 sm:flex sm:justify-center"
    >
      <div className="max-w-md w-full bg-white border border-line rounded-2xl shadow-lg p-4 flex items-start gap-3">
        <img
          src="/icons/apple-touch-icon.png"
          alt=""
          className="w-11 h-11 rounded-xl flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink">Instala NegocioFlow en tu celular</div>
          {platform === "android" ? (
            <p className="text-xs text-muted mt-0.5">
              Úsala como una app, con ícono propio y sin pesar espacio de tienda.
            </p>
          ) : (
            <p className="text-xs text-muted mt-0.5">
              Toca compartir <span aria-hidden="true">⬆️</span> y luego "Agregar a pantalla de inicio".
            </p>
          )}
          <div className="flex items-center gap-3 mt-2.5">
            {platform === "android" && (
              <button
                onClick={install}
                className="px-3.5 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition"
              >
                Instalar
              </button>
            )}
            <button onClick={dismiss} className="text-xs text-muted font-medium">
              Ahora no
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="text-muted text-lg leading-none flex-shrink-0 -mt-0.5"
        >
          ×
        </button>
      </div>
    </div>
  );
}
