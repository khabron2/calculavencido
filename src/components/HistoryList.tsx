import { useState } from 'react';
import { Search, Trash2, Calendar, AlertTriangle, CheckCircle2, ListFilter, ArrowUpDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { getDaysDiff, formatFriendlyDate } from '../utils/dateHelpers';

interface HistoryListProps {
  products: Product[];
  onDeleteProduct: (id: string) => void;
  onClearHistory: () => void;
  textSizeClass: (factor: number) => string;
}

export default function HistoryList({
  products,
  onDeleteProduct,
  onClearHistory,
  textSizeClass,
}: HistoryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'vigente' | 'vencido'>('all');
  const [sortByNewest, setSortByNewest] = useState(true);

  const getProductStatusStats = (prod: Product) => {
    const daysDiff = getDaysDiff(prod.expirationDate);
    const isExpired = daysDiff < 0;
    const isToday = daysDiff === 0;
    return { daysDiff, isExpired, isToday };
  };

  // Filter and sort items
  const filteredProducts = products
    .filter((prod) => {
      // Search term
      const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Status term
      const { isExpired } = getProductStatusStats(prod);
      if (filterType === 'vigente') return !isExpired;
      if (filterType === 'vencido') return isExpired;
      return true;
    })
    .sort((a, b) => {
      // Sort priority or chronological ordering
      if (sortByNewest) {
        return b.createdAt - a.createdAt; // Newest entry first
      } else {
        // Chronological order by expiration date
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      }
    });

  const countVigentes = products.filter(p => getDaysDiff(p.expirationDate) >= 0).length;
  const countVencidos = products.length - countVigentes;

  return (
    <div
      id="list-expiration-history"
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-md transition-all space-y-5"
    >
      {/* Header and counter stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-805 pb-4">
        <div>
          <h2 id="lbl-history-title" className={`font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight ${textSizeClass(1.25)}`}>
            Historial Guardado
          </h2>
          <p id="lbl-history-subtitle" className={`text-zinc-500 dark:text-zinc-400 font-bold ${textSizeClass(0.85)}`}>
            {products.length === 1 ? '1 producto registrado' : `${products.length} productos registrados`}
          </p>
        </div>

        {products.length > 0 && (
          <button
            type="button"
            id="btn-clear-all"
            onClick={() => {
              if (window.confirm('¿Estás seguro de que deseas borrar todo el historial? Esta acción no se puede deshacer.')) {
                onClearHistory();
              }
            }}
            className="self-start sm:self-center px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold rounded-xl transition-all text-xs cursor-pointer border border-rose-200/50 uppercase tracking-wide"
          >
            Vaciar Historial
          </button>
        )}
      </div>

      {products.length === 0 ? (
        <div id="ctr-empty-history" className="text-center py-10 px-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-805">
          <p className="text-4xl mb-3">📦</p>
          <p className={`font-extrabold text-zinc-700 dark:text-zinc-350 ${textSizeClass(1.1)}`}>
            Historial Vacío
          </p>
          <p id="lbl-empty-helper-text" className={`text-zinc-400 dark:text-zinc-500 max-w-sm mx-auto mt-2 leading-relaxed ${textSizeClass(0.9)}`}>
            Ingresa un producto arriba y haz clic en "Guardar en Historial" para registrarlo aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Counter Badges */}
          <div className="grid grid-cols-2 gap-3" id="stats-summary">
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-3 rounded-2xl flex items-center justify-between">
              <span className={`font-bold text-emerald-800 dark:text-emerald-400 text-xs uppercase tracking-wide ${textSizeClass(0.9)}`}>Vigentes:</span>
              <span className={`font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-xl font-mono ${textSizeClass(1.0)}`}>
                {countVigentes}
              </span>
            </div>
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-3 rounded-2xl flex items-center justify-between">
              <span className={`font-bold text-rose-800 dark:text-rose-400 text-xs uppercase tracking-wide ${textSizeClass(0.9)}`}>Vencidos:</span>
              <span className={`font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 px-3 py-1 rounded-xl font-mono ${textSizeClass(1.0)}`}>
                {countVencidos}
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              id="txt-search-query"
              placeholder="Buscar producto por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:outline-none focus:border-emerald-500 font-bold transition-all ${textSizeClass(0.95)}`}
            />
          </div>

          {/* Filter options and Sort */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-zinc-50 dark:bg-zinc-950/30 p-2.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800">
            {/* Filter segments */}
            <div className="flex gap-1.5 w-full sm:w-auto">
              {(['all', 'vigente', 'vencido'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  id={`btn-filter-${type}`}
                  onClick={() => setFilterType(type)}
                  className={`flex-1 sm:flex-initial px-3.5 py-2 font-black rounded-lg transition-all text-xs cursor-pointer uppercase tracking-wider ${
                    filterType === type
                      ? 'bg-emerald-500 text-zinc-950 shadow-sm font-black'
                      : 'text-zinc-550 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                  }`}
                >
                  {type === 'all' && 'Todos'}
                  {type === 'vigente' && 'Vigentes'}
                  {type === 'vencido' && 'Vencidos'}
                </button>
              ))}
            </div>

            {/* Sort direction */}
            <button
              type="button"
              id="btn-toggle-sort"
              onClick={() => setSortByNewest(!sortByNewest)}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer py-1 self-end sm:self-auto"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Ordenar: {sortByNewest ? 'Nuevos Primero' : 'Prontos a Expire'}</span>
            </button>
          </div>

          {/* Table / List Container */}
          {filteredProducts.length === 0 ? (
            <div id="ctr-no-search-results" className="text-center py-8 text-zinc-400 dark:text-zinc-500">
              <p className="text-2xl mb-1">🔍</p>
              <p className={`font-bold ${textSizeClass(0.95)}`}>Ningún producto coincide con el filtro.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 font-sans">
              <AnimatePresence mode="popLayout">
                {filteredProducts.map((prod) => {
                  const { daysDiff, isExpired, isToday } = getProductStatusStats(prod);
                  return (
                    <motion.div
                      key={prod.id}
                      id={`item-prod-${prod.id}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`relative border-2 rounded-2xl p-4.5 flex flex-col justify-between md:flex-row md:items-center gap-4 transition-all shadow-sm ${
                        isExpired
                          ? 'border-rose-200 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10'
                          : 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10'
                      }`}
                    >
                      {/* Product Main details */}
                      <div className="flex-1 space-y-2.5 font-sans">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 id={`lbl-prod-name-${prod.id}`} className={`font-black text-zinc-805 dark:text-zinc-100 leading-tight ${textSizeClass(1.15)}`}>
                              {prod.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400 dark:text-zinc-500 font-mono mt-0.5 text-xs">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                Elab: {prod.fabricationDate}
                              </span>
                              <span>•</span>
                              <span>Duración: {prod.durationValue} {prod.durationType === 'days' ? 'días' : prod.durationType === 'months' ? 'meses' : 'años'}</span>
                            </div>
                          </div>

                          <div className="md:hidden">
                            {/* Mobile action button */}
                            <button
                              type="button"
                              id={`btn-del-prod-mob-${prod.id}`}
                              onClick={() => onDeleteProduct(prod.id)}
                              className="p-3 bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 rounded-xl transition-all cursor-pointer"
                              title="Borrar producto de lista"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Status calculation description block */}
                        <div className="pb-1">
                          <p id={`lbl-prod-expdate-pref-${prod.id}`} className={`font-semibold text-zinc-555 dark:text-zinc-400 uppercase tracking-widest text-[10px] ${textSizeClass(0.85)}`}>
                            Vence el:
                          </p>
                          <p id={`lbl-prod-expdate-val-${prod.id}`} className={`font-extrabold text-zinc-900 dark:text-white uppercase ${textSizeClass(1.1)}`}>
                            {formatFriendlyDate(prod.expirationDate)}
                          </p>
                        </div>
                      </div>

                      {/* Right-hand Status tag and Delete button (Desktop layout) */}
                      <div className="flex items-center justify-between gap-3 border-t md:border-t-0 border-zinc-200/60 dark:border-zinc-800 pt-3 md:pt-0">
                        {/* High visual contrast badges for accessibility */}
                        <div className="flex flex-col items-start md:items-end gap-1 flex-1 md:flex-none">
                          <span
                            id={`badge-status-${prod.id}`}
                            className={`px-3 py-1.5 font-bold tracking-wider rounded-xl uppercase flex items-center gap-1.5 ${
                              isExpired
                                ? 'bg-rose-600 text-white shadow-sm border border-rose-700'
                                : 'bg-emerald-600 text-white shadow-sm border border-emerald-700'
                            } ${textSizeClass(0.85)}`}
                          >
                            {isExpired ? (
                              <>
                                <AlertTriangle className="w-4 h-4 text-white" />
                                <span>Vencido</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-white" />
                                <span>Vigente</span>
                              </>
                            )}
                          </span>

                          <span id={`lbl-elapsed-${prod.id}`} className={`font-black tracking-tight ${
                            isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          } ${textSizeClass(0.9)}`}>
                            {isExpired ? (
                              <>Hace {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'día' : 'días'}</>
                            ) : isToday ? (
                              <span className="text-yellow-600 dark:text-yellow-400 font-extrabold animate-pulse">¡VENCE HOY!</span>
                            ) : (
                              <>{daysDiff} {daysDiff === 1 ? 'día restante' : 'días restantes'}</>
                            )}
                          </span>
                        </div>

                        {/* Desktop action button */}
                        <button
                          type="button"
                          id={`btn-del-prod-desk-${prod.id}`}
                          onClick={() => onDeleteProduct(prod.id)}
                          className="hidden md:block p-3.5 bg-zinc-100 hover:bg-rose-50 hover:text-rose-700 dark:bg-zinc-800/60 dark:hover:bg-rose-950/30 dark:hover:text-rose-450 rounded-xl text-zinc-500 dark:text-zinc-400 transition-all cursor-pointer"
                          title="Borrar producto de lista"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
