"use client";
import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, CameraOff } from "lucide-react";

export interface ScanFeedback {
  ok: boolean;
  text: string;
}

/**
 * Lector de códigos de barra con la cámara del celular o computador.
 * - `onDetected` recibe el código y puede devolver un mensaje para mostrar
 *   (por ejemplo "Agregado: Coca-Cola 1,5 L" o "Código no registrado").
 * - `continuous`: la cámara sigue abierta para escanear varios productos
 *   seguidos (caja). Si es false, se cierra con el primer código.
 */
export default function BarcodeScanner({
  title = "Escanear código",
  continuous = false,
  onDetected,
  onClose,
}: {
  title?: string;
  continuous?: boolean;
  onDetected: (code: string) => ScanFeedback | void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [errorText, setErrorText] = useState("");
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [count, setCount] = useState(0);
  // Refs para que el callback del lector (creado una sola vez) vea lo último.
  const onDetectedRef = useRef(onDetected);
  const onCloseRef = useRef(onClose);
  onDetectedRef.current = onDetected;
  onCloseRef.current = onClose;

  useEffect(() => {
    let stopped = false;
    let controls: { stop: () => void } | null = null;
    // Evita leer el mismo código varias veces mientras sigue frente a la cámara.
    let lastCode = "";
    let lastAt = 0;

    async function start() {
      if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorText("Este navegador no permite usar la cámara. Prueba con Chrome o Safari actualizados.");
        return;
      }
      try {
        // Se carga solo al abrir el lector, para no hacer más pesada la app.
        const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
        ]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        if (stopped || !videoRef.current) return;
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
          videoRef.current,
          (result) => {
            if (!result || stopped) return;
            const code = result.getText().trim();
            const now = Date.now();
            if (!code || (code === lastCode && now - lastAt < 2000)) return;
            lastCode = code;
            lastAt = now;
            beep();
            const fb = onDetectedRef.current(code);
            if (fb) setFeedback(fb);
            if (!fb || fb.ok) setCount((c) => c + 1);
            if (!continuous) {
              stopped = true;
              controls?.stop();
              onCloseRef.current();
            }
          }
        );
        if (stopped) controls.stop();
        else setStatus("ready");
      } catch (e: unknown) {
        if (stopped) return;
        const name = (e as { name?: string })?.name || "";
        setStatus("error");
        setErrorText(
          name === "NotAllowedError" || name === "SecurityError"
            ? "No diste permiso para usar la cámara. Actívalo en el candado de la barra de direcciones y vuelve a intentar."
            : name === "NotFoundError" || name === "OverconstrainedError"
            ? "No encontramos una cámara en este dispositivo."
            : name === "NotReadableError"
            ? "La cámara está siendo usada por otra aplicación. Ciérrala y vuelve a intentar."
            : "No pudimos abrir la cámara. Vuelve a intentar."
        );
      }
    }
    start();
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [continuous]);

  // Cerrar con Escape (sin cerrar también el formulario de abajo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white w-full max-w-md rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div className="font-semibold">{title}</div>
          <button onClick={onClose} className="text-muted" aria-label="Cerrar lector">
            <X size={20} />
          </button>
        </div>

        <div className="relative bg-black aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          {status === "ready" && (
            <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-24 border-2 border-white/80 rounded-lg pointer-events-none">
              <div className="absolute inset-x-2 top-1/2 h-0.5 bg-red-500/80" />
            </div>
          )}
          {status === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm gap-2">
              <Loader2 size={16} className="animate-spin" /> Abriendo cámara…
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm text-center px-6 gap-3">
              <CameraOff size={28} />
              {errorText}
            </div>
          )}
        </div>

        <div className="px-4 py-3 text-sm min-h-[64px]" aria-live="polite">
          {feedback ? (
            <div className={feedback.ok ? "text-brand-700 font-medium" : "text-red-600"}>{feedback.text}</div>
          ) : (
            <div className="text-muted">Apunta al código de barras del producto. Se lee solo.</div>
          )}
          {continuous && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-muted">
                {count === 0 ? "Puedes escanear varios seguidos." : `${count} escaneado${count === 1 ? "" : "s"}`}
              </span>
              <button onClick={onClose} className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium">
                Listo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Pitido corto y vibración al leer un código. */
function beep() {
  try {
    navigator.vibrate?.(60);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1200;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => ctx.close();
  } catch {
    /* sin sonido no pasa nada */
  }
}
