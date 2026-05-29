/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Database, Plus, Search, Check, FileSpreadsheet, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { listSpreadsheets, createDefaultSpreadsheet } from '../googleSheetsService';

interface SpreadsheetSelectorProps {
  accessToken: string;
  onSelect: (spreadsheetId: string, sheetName: string) => void;
}

export default function SpreadsheetSelector({ accessToken, onSelect }: SpreadsheetSelectorProps) {
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [manualId, setManualId] = useState('');
  const [sheetName, setSheetName] = useState('Productos');
  const [isCreating, setIsCreating] = useState(false);
  const [newSheetTitle, setNewSheetTitle] = useState('Inventario y Productos Escáner');

  const fetchSheets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const files = await listSpreadsheets(accessToken);
      setSpreadsheets(files);
      if (files.length > 0) {
        setSelectedId(files[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching sheets list:', err);
      setError('No pudimos listar tus Hojas de cálculo desde Google Drive. Intenta de nuevo o ingresa el ID de tu hoja manualmente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchSheets();
    }
  }, [accessToken]);

  const handleCreateNew = async () => {
    if (!newSheetTitle.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const newId = await createDefaultSpreadsheet(accessToken, newSheetTitle);
      // Automatically triggers select
      onSelect(newId, 'Productos');
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      setError('Ocurrió un error al crear la nueva hoja de cálculo. Por favor verifica tus permisos.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmSelected = () => {
    const idToUse = selectedId || manualId;
    if (!idToUse) {
      setError('Por favor, selecciona una hoja o ingresa el ID directamente.');
      return;
    }
    onSelect(idToUse, sheetName || 'Productos');
  };

  const filteredSheets = spreadsheets.filter((sheet) =>
    sheet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
      <div className="text-center mb-6">
        <div className="inline-flex p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 border border-indigo-100">
          <Database size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Vincular Base de Datos</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          Para ver o registrar tus productos, vincula una Hoja de Cálculo (Google Sheets) vinculada a tu cuenta de Google.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 text-left">
          <AlertTriangle className="shrink-0 text-amber-600" size={20} />
          <p className="text-xs text-amber-800 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="space-y-6">
        {/* Create Spreadsheet Banner */}
        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 text-left space-y-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">¡Opción Recomendada!</span>
            <h3 className="font-bold text-slate-800 mt-2 text-sm sm:text-base">¿No tienes una hoja de cálculo estructurada?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Crea una base de datos de inventario formateada con productos de muestra en un solo clic directamente en tu Google Suite.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Nombre de la nueva hoja"
              value={newSheetTitle}
              onChange={(e) => setNewSheetTitle(e.target.value)}
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs sm:text-xs font-semibold"
            />
            <button
              id="btn-create-sheet"
              onClick={handleCreateNew}
              disabled={isCreating}
              className="bg-indigo-600 hover:bg-indigo-700 duration-200 disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2.5 transition-colors text-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Crear plantilla en 1 clic</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Existing Spreadsheets List */}
        <div className="text-left space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-[11px] font-bold text-slate-550 uppercase tracking-wider">Buscar en tus hojas de Google Drive</label>
            <button
              onClick={fetchSheets}
              disabled={isLoading}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors text-[10px] uppercase font-bold cursor-pointer"
            >
              <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
              Refrescar
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 border border-slate-200 rounded-2xl bg-slate-50/50">
              <Loader2 className="animate-spin text-indigo-500 mb-2" size={24} />
              <span className="text-xs text-slate-500">Cargando hojas de cálculo...</span>
            </div>
          ) : spreadsheets.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/20 space-y-2">
              <FileSpreadsheet className="mx-auto text-slate-400 mb-1" size={28} />
              <p className="text-xs text-slate-500">No encontramos archivos de Google Sheets en tu Drive.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Filtrar archivos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* List */}
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100 pr-1 select-none">
                {filteredSheets.map((sheet) => (
                  <label
                    key={sheet.id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <input
                      type="radio"
                      name="selected-sheet"
                      checked={selectedId === sheet.id}
                      onChange={() => {
                        setSelectedId(sheet.id);
                        setManualId('');
                      }}
                      className="accent-indigo-600 shrink-0"
                    />
                    <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                    <span className="text-slate-700 truncate font-semibold flex-1">{sheet.name}</span>
                  </label>
                ))}

                {filteredSheets.length === 0 && (
                  <div className="p-4 text-center text-[11px] text-slate-500">Ninguna hoja coincide con la búsqueda.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manual ID / Settings Accordion */}
        <div className="border-t border-slate-200 pt-4 text-left space-y-3">
          <details className="group">
            <summary className="list-none flex items-center justify-between text-xs font-semibold text-slate-500 group-open:text-slate-800 cursor-pointer select-none font-bold uppercase tracking-wider text-[11px]">
              <span>Ingresar ID manualmente / Ajustes avanzados</span>
              <span className="text-[10px] text-indigo-600 font-bold uppercase shrink-0 transition-transform group-open:rotate-180">▼</span>
            </summary>
            
            <div className="mt-4 space-y-3 pl-1">
              <div>
                <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wide">ID de la Hoja de Cálculo</label>
                <input
                  type="text"
                  placeholder="Ej: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                  value={manualId}
                  onChange={(e) => {
                    setManualId(e.target.value);
                    setSelectedId('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wide">Nombre de la Pestaña (Sheet)</label>
                <input
                  type="text"
                  placeholder="Productos"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </details>
        </div>

        {/* Action Connect Button */}
        <button
          id="btn-confirm-sheet-link"
          onClick={handleConfirmSelected}
          disabled={!selectedId && !manualId}
          className="w-full bg-indigo-600 hover:bg-indigo-700 duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100"
        >
          <Check size={16} />
          <span>Vincular y Cargar Inventario</span>
        </button>
      </div>
    </div>
  );
}
