import { useState, useEffect } from 'react';
import { Sparkles, Moon, Sun, ShieldAlert, Calendar, User, Search, Package2, HelpCircle, CheckCircle, Smartphone } from 'lucide-react';
import { Product, TextSizePref } from './types';
import { getDaysDiff } from './utils/dateHelpers';
import ProductForm from './components/ProductForm';
import HistoryList from './components/HistoryList';
import FlashlightController from './components/FlashlightController';

// Pre-populate some examples so the user immediately gets the concept
const DEFAULT_INITIAL_PRODUCTS_MOCK = (refDate: Date): Product[] => {
  // Format target date safely relative to reference date (May 28, 2026)
  const getRelDateStr = (daysOffset: number): string => {
    const d = new Date(refDate.getTime());
    d.setDate(d.getDate() + daysOffset);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const dayMinus15 = getRelDateStr(-15);
  const dayMinus2 = getRelDateStr(-2);

  return [
    {
      id: "mock-牛奶",
      name: "Leche Entera (Ejemplo Vigente)",
      fabricationDate: dayMinus2,
      durationValue: 10,
      durationType: "days",
      expirationDate: getRelDateStr(8), // Expired in 8 days
      createdAt: Date.now() - 60000 * 5,
    },
    {
      id: "mock-奶酪",
      name: "Queso Fresco (Ejemplo Vencido)",
      fabricationDate: dayMinus15,
      durationValue: 12,
      durationType: "days",
      expirationDate: getRelDateStr(-3), // Expired 3 days ago
      createdAt: Date.now() - 60000 * 10,
    }
  ];
};

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [textSize, setTextSize] = useState<TextSizePref>('normal');
  const [showWelcomeTip, setShowWelcomeTip] = useState(true);

  // We set our base reference date based on system clock metadata (May 28, 2026)
  const [currentSystemDate] = useState(() => new Date('2026-05-28T13:30:32Z'));

  // Load state on mount
  useEffect(() => {
    // Products
    const stored = localStorage.getItem('control_vencimientos_prods');
    if (stored) {
      try {
        setProducts(JSON.parse(stored));
      } catch (e) {
        setProducts(DEFAULT_INITIAL_PRODUCTS_MOCK(currentSystemDate));
      }
    } else {
      setProducts(DEFAULT_INITIAL_PRODUCTS_MOCK(currentSystemDate));
    }

    // Dark Mode
    const storedDark = localStorage.getItem('control_vencimientos_dark');
    if (storedDark === 'true') {
      setIsDarkMode(true);
    } else {
      // Default to light mode for maximum legibility but check device preference
      setIsDarkMode(false);
    }

    // Text Size
    const storedTextSize = localStorage.getItem('control_vencimientos_textPref');
    if (storedTextSize) {
      setTextSize(storedTextSize as TextSizePref);
    }
  }, []);

  // Save changes to localStorage on state changes
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('control_vencimientos_prods', JSON.stringify(products));
    } else {
      localStorage.removeItem('control_vencimientos_prods');
    }
  }, [products]);

  const handleToggleDarkMode = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    localStorage.setItem('control_vencimientos_dark', String(nextDark));
  };

  const handleTextSizeChange = (pref: TextSizePref) => {
    setTextSize(pref);
    localStorage.setItem('control_vencimientos_textPref', pref);
  };

  const handleAddProduct = (newProd: Omit<Product, 'id' | 'createdAt'>) => {
    const fresh: Product = {
      ...newProd,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    setProducts(prev => [fresh, ...prev]);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleClearHistory = () => {
    setProducts([]);
  };

  // Text sizes helper configured for high scale readability
  const textSizeClass = (factor: number) => {
    if (textSize === 'large') {
      if (factor < 0.9) return 'text-base';
      if (factor < 1.0) return 'text-lg font-medium';
      if (factor < 1.15) return 'text-xl font-bold';
      if (factor < 1.3) return 'text-2xl font-extrabold';
      return 'text-3xl font-black leading-tight';
    }
    if (textSize === 'huge') {
      if (factor < 0.9) return 'text-xl font-semibold';
      if (factor < 1.0) return 'text-2xl font-bold';
      if (factor < 1.15) return 'text-3xl font-black';
      if (factor < 1.3) return 'text-4xl font-extrabold leading-normal';
      return 'text-5xl font-black leading-snug';
    }
    // Normal / default
    if (factor < 0.9) return 'text-xs md:text-sm';
    if (factor < 1.0) return 'text-sm md:text-base';
    if (factor < 1.15) return 'text-base md:text-lg font-bold';
    if (factor < 1.3) return 'text-lg md:text-xl font-black';
    return 'text-xl md:text-2xl font-extrabold leading-tight';
  };

  // Dynamic system time banner
  const formatFriendlyToday = () => {
    const daysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthsEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    return `${daysEs[currentSystemDate.getDay()]}, ${currentSystemDate.getDate()} de ${monthsEs[currentSystemDate.getMonth()]}, ${currentSystemDate.getFullYear()}`;
  };

  return (
    <div id="app-root-container" className={isDarkMode ? 'dark' : ''}>
      <div id="theme-frame" className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans transition-all pb-12">
        
        {/* TOP STATUS AND ACCESSIBILITY NAV BAR */}
        <header id="app-nav-header" className="sticky top-0 z-50 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm transition-all">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            
            {/* Logo/Title */}
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-emerald-500 rounded-2xl text-zinc-950 shadow-sm flex items-center justify-center">
                <Package2 className="w-6 h-6 shrink-0" />
              </div>
              <div>
                <h1 id="lbl-main-app-title" className="font-extrabold text-lg md:text-xl text-zinc-900 dark:text-white leading-tight tracking-tight uppercase">
                  Control de Vencimientos
                </h1>
                <p id="lbl-main-app-sub" className="text-[10px] md:text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase font-mono tracking-widest">
                  Gestión Inteligente y Ágil
                </p>
              </div>
            </div>

            {/* Accessibility and Theme Buttons Panel */}
            <div className="flex items-center gap-1.5 md:gap-3" id="toolbar-accessibility">
              
              {/* Text Size Selectors */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-805 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800" title="Ajustar tamaño de letra para fácil lectura">
                <button
                  type="button"
                  id="btn-text-size-normal"
                  onClick={() => handleTextSizeChange('normal')}
                  className={`w-9 h-9 rounded-lg font-extrabold text-xs flex items-center justify-center transition-all cursor-pointer ${
                    textSize === 'normal'
                      ? 'bg-zinc-300 dark:bg-zinc-700 text-zinc-955 dark:text-white shadow-sm'
                      : 'text-zinc-550 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                  aria-label="Tamaño de letra normal"
                >
                  A
                </button>
                <button
                  type="button"
                  id="btn-text-size-large"
                  onClick={() => handleTextSizeChange('large')}
                  className={`w-9 h-9 rounded-lg font-black text-sm flex items-center justify-center transition-all cursor-pointer ${
                    textSize === 'large'
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black'
                      : 'text-zinc-555 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                  aria-label="Tamaño de letra grande"
                >
                  A+
                </button>
                <button
                  type="button"
                  id="btn-text-size-huge"
                  onClick={() => handleTextSizeChange('huge')}
                  className={`w-9 h-9 rounded-lg font-black text-lg flex items-center justify-center transition-all cursor-pointer ${
                    textSize === 'huge'
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                      : 'text-zinc-555 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                  aria-label="Tamaño de letra gigante"
                >
                  A++
                </button>
              </div>

              {/* Dark/Light mode toggle */}
              <button
                type="button"
                id="btn-theme-toggle"
                onClick={handleToggleDarkMode}
                className="p-2.5 bg-zinc-105 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-emerald-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                title="Cambiar Modo de Color"
                aria-label="Cambiar tema de color"
              >
                {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              </button>
            </div>

          </div>
        </header>

        {/* CURRENT DATE BANNER */}
        <section id="banner-current-date" className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900/40 dark:border-zinc-900 px-4 py-3 text-center transition-all">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p id="lbl-banner-today" className="font-extrabold text-zinc-800 dark:text-zinc-200 text-sm md:text-base tracking-wide uppercase">
              {formatFriendlyToday()}
            </p>
          </div>
        </section>

        {/* CONTAINER FOR CONTENT */}
        <main className="max-w-3xl mx-auto px-4 py-5 space-y-6">
          
          {/* USER WELCOME ADVISORY */}
          {showWelcomeTip && (
            <div id="tip-educational-alert" className="bg-gradient-to-r from-zinc-50 to-zinc-100/80 dark:from-zinc-900 dark:to-zinc-900/40 border-2 border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm relative transition-all">
              <button
                type="button"
                id="btn-close-tip"
                onClick={() => setShowWelcomeTip(false)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-bold text-sm cursor-pointer"
                aria-label="Cerrar aviso"
              >
                ✕
              </button>
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
                  <Smartphone className="w-7 h-7" />
                </div>
                <div className="pr-6">
                  <h3 className={`font-black text-zinc-805 dark:text-zinc-200 ${textSizeClass(1.05)}`}>
                    👵👴 Diseñado para Alta Claridad & Adultos Mayores
                  </h3>
                  <p className={`text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed ${textSizeClass(0.85)}`}>
                    Esta aplicación está configurada con botones extragrandes, altos contrastes y tipografías grandes para un control cómodo y ágil. Si deseas aumentar todavía más el tamaño de las letras, pulsa el botón <strong className="text-emerald-600 dark:text-emerald-400 select-none">A++</strong> arriba.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DUAL FLASHLIGHT COMPONENT */}
          <FlashlightController textSizeClass={textSizeClass} />

          {/* PRODUCT ENTRY FORM */}
          <section id="sec-product-form" className="space-y-2">
            <ProductForm onAddProduct={handleAddProduct} textSizeClass={textSizeClass} />
          </section>

          {/* SAVED HISTORY DISPLAY */}
          <section id="sec-product-history" className="space-y-2">
            <HistoryList
              products={products}
              onDeleteProduct={handleDeleteProduct}
              onClearHistory={handleClearHistory}
              textSizeClass={textSizeClass}
            />
          </section>

          {/* FOOTER */}
          <footer id="app-footer-info" className="text-center pt-8 pb-4 text-zinc-400 dark:text-zinc-600 space-y-2">
            <div className="flex items-center justify-center gap-1 text-xs font-mono font-bold">
              <span>Usuario:</span>
              <span className="text-zinc-550 dark:text-zinc-400 select-all">khabron@gmail.com</span>
            </div>
            <p className="text-xs font-bold font-mono tracking-tight uppercase">
              Control de Vencimientos • Versión 1.2
            </p>
          </footer>

        </main>
        
      </div>
    </div>
  );
}
