import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Minus, RotateCcw, Save, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { DurationType, Product } from '../types';
import { calculateExpiration, getDaysDiff, formatFriendlyDate } from '../utils/dateHelpers';

interface ProductFormProps {
  onAddProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  textSizeClass: (factor: number) => string;
}

export default function ProductForm({ onAddProduct, textSizeClass }: ProductFormProps) {
  const [name, setName] = useState('');
  const [fabricationDate, setFabricationDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [durationValue, setDurationValue] = useState<number | ''>(30);
  const [durationType, setDurationType] = useState<DurationType>('days');

  // Live calculation states
  const [liveExpirationDate, setLiveExpirationDate] = useState('');
  const [daysDifference, setDaysDifference] = useState<number>(0);

  // Auto calculate expiration whenever values change
  useEffect(() => {
    const numericValue = durationValue === '' ? 1 : durationValue;
    const calculated = calculateExpiration(fabricationDate, numericValue, durationType);
    setLiveExpirationDate(calculated);
    if (calculated) {
      setDaysDifference(getDaysDiff(calculated));
    } else {
      setDaysDifference(0);
    }
  }, [fabricationDate, durationValue, durationType]);

  const setTodayDate = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setFabricationDate(`${y}-${m}-${d}`);
  };

  const handleIncrement = () => {
    setDurationValue(prev => {
      const num = prev === '' ? 0 : prev;
      return Math.max(1, num + 1);
    });
  };

  const handleDecrement = () => {
    setDurationValue(prev => {
      const num = prev === '' ? 2 : prev;
      return Math.max(1, num - 1);
    });
  };

  const handleBlur = () => {
    if (durationValue === '' || durationValue < 1) {
      setDurationValue(1);
    }
  };

  const resetForm = () => {
    setName('');
    setTodayDate();
    setDurationValue(30);
    setDurationType('days');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!liveExpirationDate) return;

    const finalDurationValue = durationValue === '' ? 1 : durationValue;

    onAddProduct({
      name: name.trim(),
      fabricationDate,
      durationValue: finalDurationValue,
      durationType,
      expirationDate: liveExpirationDate,
    });

    // Reset only the name for quick sequential entries
    setName('');
  };

  const isExpired = daysDifference < 0;
  const isToday = daysDifference === 0;

  return (
    <form
      id="frm-vencimiento-input"
      onSubmit={handleSubmit}
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-md transition-all space-y-5"
    >
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
        <h2 id="lbl-form-title" className={`font-black text-zinc-800 dark:text-zinc-100 flex items-center gap-2 ${textSizeClass(1.22)}`}>
          <Sparkles className="w-6 h-6 text-emerald-500 shrink-0" />
          <span className="uppercase tracking-tight">Nuevo Control</span>
        </h2>
        <button
          type="button"
          id="btn-rorm-reset"
          onClick={resetForm}
          className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
          title="Limpiar campos"
        >
          <RotateCcw className="w-5 h-5" />
          <span id="txt-form-reset-lbl" className="text-xs font-bold font-mono">LIMPIAR</span>
        </button>
      </div>

      {/* Product Name */}
      <div className="space-y-2">
        <label id="lbl-name-input-tag" htmlFor="txt-product-name" className={`block font-extrabold text-zinc-650 dark:text-zinc-405 uppercase tracking-wide text-xs ${textSizeClass(0.85)}`}>
          Nombre del Producto
        </label>
        <div className="relative">
          <input
            type="text"
            id="txt-product-name"
            placeholder="Ej: Leche Descremada, Queso, Medicina..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full px-4 py-4 md:py-5 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all placeholder-zinc-400 dark:placeholder-zinc-500 font-bold ${textSizeClass(1.0)}`}
            required
            autoComplete="off"
          />
        </div>
      </div>

      {/* Fabrication Date */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label id="lbl-fabdate-input-tag" htmlFor="dat-fabrication-date" className={`font-extrabold text-zinc-650 dark:text-zinc-405 flex items-center gap-1.5 uppercase tracking-wide text-xs ${textSizeClass(0.85)}`}>
            <Calendar className="w-5 h-5 text-emerald-500 shrink-0" />
            Fecha de Elaboración
          </label>
          <button
            type="button"
            id="btn-set-today"
            onClick={setTodayDate}
            className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-emerald-650 dark:text-emerald-400 font-extrabold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer text-xs uppercase"
          >
            Usar HOY
          </button>
        </div>
        <input
          type="date"
          id="dat-fabrication-date"
          value={fabricationDate}
          onChange={(e) => setFabricationDate(e.target.value)}
          className={`w-full px-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-2xl focus:border-emerald-500 focus:outline-none transition-all font-mono font-bold ${textSizeClass(1.0)}`}
          required
        />
      </div>

      {/* Duration input: Number with big buttons and segments */}
      <div className="space-y-3">
        <label id="lbl-duration-input-tag" className={`font-extrabold text-zinc-650 dark:text-zinc-405 block uppercase tracking-wide text-xs ${textSizeClass(0.85)}`}>
          Duración del Producto
        </label>

        {/* Big tactile step indicators for volume control */}
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl p-2.5">
          <button
            type="button"
            id="btn-duration-minus"
            onClick={handleDecrement}
            className="w-14 h-14 bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl flex items-center justify-center font-black shadow-sm shrink-0 cursor-pointer text-2xl active:scale-90 transition-all"
            title="Restar 1"
          >
            <Minus className="w-6 h-6 stroke-[3]" />
          </button>

          <input
            type="number"
            id="num-duration-value"
            min="1"
            value={durationValue}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setDurationValue('');
              } else {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) {
                  setDurationValue(parsed);
                }
              }
            }}
            onBlur={handleBlur}
            className={`w-24 md:w-32 min-w-0 text-center bg-transparent border-0 text-zinc-900 dark:text-white focus:outline-none font-bold tracking-tight focus:ring-0 select-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${textSizeClass(1.5)}`}
          />

          <button
            type="button"
            id="btn-duration-plus"
            onClick={handleIncrement}
            className="w-14 h-14 bg-white dark:bg-zinc-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-xl flex items-center justify-center font-black shadow-sm shrink-0 cursor-pointer text-2xl active:scale-90 transition-all"
            title="Sumar 1"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Duration unit segment button (días, meses, años) - No tiny dropdowns! */}
        <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-950/65 p-1.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800">
          <button
            type="button"
            id="btn-unit-days"
            onClick={() => setDurationType('days')}
            className={`py-3.5 px-2 font-extrabold rounded-xl transition-all text-center cursor-pointer ${
              durationType === 'days'
                ? 'bg-emerald-500 text-zinc-950 shadow-md scale-[1.02]'
                : 'text-zinc-655 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            } ${textSizeClass(1.0)}`}
          >
            Días
          </button>
          <button
            type="button"
            id="btn-unit-months"
            onClick={() => setDurationType('months')}
            className={`py-3.5 px-2 font-extrabold rounded-xl transition-all text-center cursor-pointer ${
              durationType === 'months'
                ? 'bg-emerald-500 text-zinc-950 shadow-md scale-[1.02]'
                : 'text-zinc-655 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            } ${textSizeClass(1.0)}`}
          >
            Meses
          </button>
          <button
            type="button"
            id="btn-unit-years"
            onClick={() => setDurationType('years')}
            className={`py-3.5 px-2 font-extrabold rounded-xl transition-all text-center cursor-pointer ${
              durationType === 'years'
                ? 'bg-emerald-500 text-zinc-950 shadow-md scale-[1.02]'
                : 'text-zinc-655 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            } ${textSizeClass(1.0)}`}
          >
            Años
          </button>
        </div>
      </div>

      {/* Auto Calculation Preview Block */}
      {liveExpirationDate && (
        <div
          id="lbl-auto-calc-preview"
          className={`rounded-2xl p-4 md:p-5 border transition-all ${
            isExpired
              ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-350 dark:border-rose-900/40 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-350 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {isExpired ? (
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span id="lbl-preview-status-badge" className={`font-black tracking-widest uppercase ${textSizeClass(1.15)}`}>
              {isExpired ? 'VENCIDO' : 'VIGENTE'}
            </span>
          </div>

          <div className="space-y-1 mt-1 border-t border-zinc-205/50 dark:border-zinc-850/55 pt-3">
            <p id="lbl-preview-expdate" className={`font-bold uppercase tracking-wider text-xs text-zinc-500 dark:text-zinc-400 ${textSizeClass(0.85)}`}>
              Fecha de Vencimiento:
            </p>
            <p id="lbl-preview-expdate-value" className={`font-extrabold uppercase tracking-tight ${textSizeClass(1.35)}`}>
              {formatFriendlyDate(liveExpirationDate)}
            </p>
            <p id="lbl-preview-countdown" className={`font-black mt-1 font-mono tracking-tight ${textSizeClass(1.1)}`}>
              {isExpired ? (
                <span className="text-rose-600 dark:text-rose-400">❌ Venció hace {Math.abs(daysDifference)} {Math.abs(daysDifference) === 1 ? 'día' : 'días'}</span>
              ) : isToday ? (
                <span className="text-amber-600 dark:text-amber-400">⚠️ ¡VENCE HOY MISMO!</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">✅ Faltan {daysDifference} {daysDifference === 1 ? 'día' : 'días'} restantes</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Save Button (Enorme) */}
      <button
        type="submit"
        id="btn-save-product"
        disabled={!name.trim()}
        className={`w-full py-4.5 md:py-5 px-6 rounded-2xl font-black text-center flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-[0.98] ${
          name.trim()
            ? 'bg-emerald-500 text-zinc-950 cursor-pointer hover:bg-emerald-400 shadow-lg shadow-emerald-500/10'
            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800/60'
        } ${textSizeClass(1.15)}`}
      >
        <Save className="w-6 h-6 shrink-0" />
        <span className="uppercase tracking-wider">Guardar en Historial</span>
      </button>
    </form>
  );
}
