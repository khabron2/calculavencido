/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, Keyboard, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  productsCatalog: Product[];
  isLoadingCatalog: boolean;
}

export default function BarcodeScanner({ onScan, productsCatalog, isLoadingCatalog }: BarcodeScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual' | 'simulator'>('camera');
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play a beautiful subtle beep sound on scan success
  const playBeep = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav');
      }
      audioRef.current.volume = 0.5;
      audioRef.current.play().catch(() => {
        // Handle blocked auto-play
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  // Setup html5-qrcode camera scanner
  useEffect(() => {
    if (activeTab !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.warn('Error clearing scanner:', err));
        scannerRef.current = null;
      }
      return;
    }

    setCameraError(null);

    // Give Vite moment to render the container
    const timer = setTimeout(() => {
      try {
        const scannerElement = document.getElementById('camera-reader');
        if (!scannerElement) return;

        const formatsToSupport = [
          0, // EAN 13
          1, // EAN 8
          6, // UPC-A
          7, // UPC-E
          11, // CODE 128
          12, // CODE 39
          14, // QR CODE
        ];

        const scanner = new Html5QrcodeScanner(
          'camera-reader',
          {
            fps: 10,
            qrbox: (width, height) => {
              // Custom sizing box
              return { width: Math.min(width * 0.8, 250), height: 120 };
            },
            aspectRatio: 1.333334,
            showTorchButtonIfSupported: true,
            supportedScanTypes: [0] // Camera scan only
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            if (decodedText) {
              playBeep();
              onScan(decodedText.trim());
            }
          },
          (errorMessage) => {
            // Quietly handle routine frames without barcode detection
          }
        );

        scannerRef.current = scanner;
      } catch (err: any) {
        console.error('Camera Scanner initialization error:', err);
        setCameraError(
          'No se pudo arrancar el escáner de cámara. Esto suele ocurrir debido a restricciones del navegador en el iframe, falta de permisos o cámara no disponible. ¡Por favor usa la opción de Manual o Simulador!'
        );
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.warn('Cleanup clearing error:', err));
        scannerRef.current = null;
      }
    };
  }, [activeTab, onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      playBeep();
      onScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
      {/* Header Tabs */}
      <div className="flex bg-slate-50 border-b border-slate-200 p-1.5 gap-1">
        <button
          id="tab-camera"
          onClick={() => setActiveTab('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'camera'
              ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm font-bold'
              : 'text-slate-550 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Camera size={15} />
          <span>Cámara web</span>
        </button>

        <button
          id="tab-manual"
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'manual'
              ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm font-bold'
              : 'text-slate-550 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Keyboard size={15} />
          <span>Manual o Pistola</span>
        </button>

        <button
          id="tab-simulator"
          onClick={() => setActiveTab('simulator')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs sm:text-sm font-medium rounded-xl transition-all duration-150 cursor-pointer ${
            activeTab === 'simulator'
              ? 'bg-white text-indigo-600 border border-slate-200 shadow-sm font-bold'
              : 'text-slate-550 hover:text-slate-800 hover:bg-slate-100/50'
          }`}
        >
          <Sparkles size={15} />
          <span>Simulador</span>
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'camera' && (
          <div className="space-y-4">
            <div className="text-center text-xs text-slate-500">
              Coloca el código de barras del producto frente a la cámara.
            </div>

            {cameraError ? (
              <div className="flex gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs leading-relaxed text-left">
                <AlertCircle size={20} className="shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <p>{cameraError}</p>
                  <button
                    onClick={() => setActiveTab('simulator')}
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline block cursor-pointer"
                  >
                    Ir al simulador de demostración rápido →
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative border border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50 flex items-center justify-center min-h-[220px]">
                <div id="camera-reader" className="w-full h-full max-w-sm rounded-xl" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="text-left">
              <label htmlFor="barcode-input" className="block text-[11px] font-bold text-slate-550 mb-2 uppercase tracking-wider">
                Código de barras manual o escáner físico de pistola
              </label>
              <div className="flex gap-2">
                <input
                  id="barcode-input"
                  type="text"
                  placeholder="Por ejemplo 7501055300074..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  id="btn-scan-manual"
                  className="bg-indigo-600 hover:bg-indigo-700 duration-200 text-white font-semibold rounded-xl px-5 transition-all text-sm shadow-sm cursor-pointer"
                >
                  Procesar
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                💡 <span className="text-slate-600 font-semibold">Pistola de código de barras:</span> Mantén seleccionado este campo de texto y dispara la pistola física. El código se enviará y procesará de manera automática.
              </p>
            </div>
          </form>
        )}

        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div className="text-left text-xs text-slate-500 leading-relaxed mb-1">
              Haz clic en cualquier producto de la base de datos de Google Sheets para simular un escaneo de cámara instantáneo en tiempo real:
            </div>

            {isLoadingCatalog ? (
              <div className="space-y-2 py-4">
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ) : productsCatalog.length === 0 ? (
              <div className="text-center py-6 text-slate-400 border border-dashed border-slate-250 bg-slate-50 rounded-2xl text-xs">
                No hay productos en tu base de datos de Google Sheets aún para mostrar en el simulador.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {productsCatalog.map((p) => (
                  <button
                    key={p.barcode}
                    onClick={() => {
                      playBeep();
                      onScan(p.barcode);
                    }}
                    className="group flex flex-col text-left p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/15 transition-all text-xs cursor-pointer"
                  >
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600 truncate flex items-center justify-between gap-1 w-full">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[10px] py-0.5 px-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0 font-mono">${p.price.toFixed(2)}</span>
                    </div>
                    <div className="text-[10px] text-slate-450 font-mono mt-1 group-hover:text-indigo-500/70 transition-colors">
                      Código: {p.barcode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
