import { useState, useEffect, useRef } from 'react';
import { Sun, SunDim, VideoOff, Info, ToggleLeft, ToggleRight, X } from 'lucide-react';

interface FlashlightProps {
  textSizeClass: (factor: number) => string;
}

export default function FlashlightController({ textSizeClass }: FlashlightProps) {
  const [torchOn, setTorchOn] = useState(false);
  const [showScreenLantern, setShowScreenLantern] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopPhysicalTorch();
    };
  }, []);

  const stopPhysicalTorch = () => {
    if (trackRef.current) {
      try {
        // Try to turn off torch constraint first if possible
        const capabilities = (trackRef.current as any).getCapabilities?.() || {};
        if (capabilities.torch) {
          trackRef.current.applyConstraints({
            advanced: [{ torch: false }]
          } as any).catch(() => {});
        }
      } catch (e) {
        // Safe bypass
      }
      trackRef.current.stop();
      trackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  const startPhysicalTorch = async () => {
    setErrorMessage(null);
    try {
      // Prompt user/browser for camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera has flash
        }
      });
      
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      
      if (!track) {
        throw new Error('No se detectó el canal de video de la cámara.');
      }
      
      trackRef.current = track;
      
      // Check for torch support
      let hasTorch = false;
      
      // Some browsers have track capabilities delayed, so let's check
      try {
        const capabilities = (track as any).getCapabilities?.() || {};
        if (capabilities.torch) {
          hasTorch = true;
          await track.applyConstraints({
            advanced: [{ torch: true }]
          } as any);
          setTorchOn(true);
        }
      } catch (err) {
        console.warn('Fallo al aplicar restricción de linterna (torch):', err);
      }

      if (!hasTorch) {
        // Device or browser doesn't expose the physical torch through JS.
        // We stop physical lock and trigger the beautiful screen flash fallback!
        stopPhysicalTorch();
        setShowScreenLantern(true);
        setErrorMessage('La cámara se inició, pero tu navegador o dispositivo no permite encender el LED directo. Usaremos la linterna de pantalla.');
      }
    } catch (err: any) {
      console.warn('Permiso o acceso de cámara denegado/no disponible:', err);
      // Fallback directly to screen lantern screen
      setShowScreenLantern(true);
      setErrorMessage('No pudimos acceder al flash de la cámara (requiere permisos de cámara). Usaremos el brillo de la pantalla.');
    }
  };

  const toggleFlashlight = () => {
    if (torchOn) {
      stopPhysicalTorch();
    } else {
      startPhysicalTorch();
    }
  };

  return (
    <div id="cfg-flashlight-panel" className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-0">
            {torchOn ? <Sun id="svg-sun-on" className="w-6 h-6 animate-pulse text-emerald-500" /> : <SunDim id="svg-sun-off" className="w-6 h-6 text-zinc-400" />}
          </div>
          <div>
            <h3 id="lbl-linterna-title" className={`font-bold text-zinc-900 dark:text-zinc-100 leading-tight ${textSizeClass(1.1)}`}>
              Linterna de Apoyo
            </h3>
          </div>
        </div>

        <button
          id="btn-toggle-physical-flashlight"
          onClick={toggleFlashlight}
          className={`flex items-center justify-center gap-2 px-5 py-3 h-13 rounded-xl font-bold transition-all border duration-200 cursor-pointer ${
            torchOn
              ? 'bg-emerald-500 hover:bg-emerald-600 text-zinc-955 border-emerald-600 shadow-md scale-[1.02]'
              : 'bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-805 dark:text-zinc-100 border-zinc-300 dark:border-zinc-705'
          }`}
          aria-label="Alternar Linterna LED o Pantalla"
        >
          {torchOn ? (
            <>
              <ToggleRight id="svg-tgl-on" className="w-6 h-6 text-zinc-955" />
              <span id="txt-linterna-on" className={textSizeClass(0.95)}>ENCENDIDA</span>
            </>
          ) : (
            <>
              <ToggleLeft id="svg-tgl-off" className="w-6 h-6 text-zinc-400" />
              <span id="txt-linterna-off" className={textSizeClass(0.95)}>APAGADA</span>
            </>
          )}
        </button>
      </div>

      {/* Screen Lantern Overlay Modal */}
      {showScreenLantern && (
         <div id="modal-screen-lantern" className="fixed inset-0 z-[9999] bg-zinc-950 text-zinc-100 flex flex-col justify-between p-6 transition-all animate-fade-in font-sans">
           <div className="flex justify-between items-center bg-zinc-900/60 p-4 rounded-xl border border-zinc-805">
             <div className="flex items-center gap-2">
               <Sun id="svg-lantern-active" className="w-7 h-7 text-emerald-500 animate-spin" />
               <span id="lbl-lantern-active-title" className="font-extrabold text-lg text-zinc-100 uppercase tracking-tight">Linterna de Pantalla Activa</span>
             </div>
             <button
               id="btn-close-lantern-modal"
               onClick={() => setShowScreenLantern(false)}
               className="p-3 bg-zinc-800 text-zinc-100 hover:bg-zinc-700 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1 uppercase text-xs border border-zinc-700"
             >
               <X className="w-6 h-6" />
               <span>Cerrar</span>
             </button>
           </div>
 
           <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
             <div className="bg-emerald-950/20 p-6 rounded-2xl border border-emerald-900/40 max-w-md shadow-xl">
               <p className="text-xl font-black text-emerald-400 mb-3 uppercase tracking-tight">💡 Brillo de Pantalla Máximo</p>
               <p className="text-base text-zinc-350 leading-relaxed font-semibold">
                 Apunta la pantalla de tu teléfono hacia el envase del producto para iluminar las letras pequeñas.
               </p>
               {errorMessage && (
                 <div className="mt-3 p-3 bg-zinc-900/80 rounded-lg text-xs text-zinc-400 text-left border border-zinc-800 flex items-start gap-2">
                   <Info className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                   <span>{errorMessage}</span>
                 </div>
               )}
             </div>
           </div>
 
           <div className="pb-10 flex flex-col items-center gap-3">
             <button
               id="btn-close-lantern-footer"
               onClick={() => setShowScreenLantern(false)}
               className="w-full max-w-sm py-4 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all cursor-pointer text-center uppercase tracking-wide"
             >
               Volver a la Aplicación
             </button>
             <p className="text-xs text-zinc-550 font-bold uppercase tracking-wider">Pulsa este botón para apagar la luz de pantalla.</p>
           </div>
         </div>
      )}
    </div>
  );
}
