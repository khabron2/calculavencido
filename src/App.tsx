/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Barcode,
  BookOpen,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  History,
  Info,
  Layers,
  Loader2,
  LogOut,
  Package,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  UserCheck,
  Wrench
} from 'lucide-react';

import { initAuth, googleSignIn, logout, getAccessToken, setAccessToken } from './firebaseAuth';
import {
  fetchProductsFromSheet,
  getSpreadsheetSheets,
  appendProductRow,
  updateProductStockInSheet,
  updateProductDetailsInSheet
} from './googleSheetsService';
import { Product, ScanItem } from './types';
import { generateScanningReport } from './utils/pdfGenerator';

import BarcodeScanner from './components/BarcodeScanner';
import SpreadsheetSelector from './components/SpreadsheetSelector';
import ProductForm from './components/ProductForm';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [isAuthResolving, setIsAuthResolving] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState('Productos');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string | null>(null);
  const [productsCatalog, setProductsCatalog] = useState<Product[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Active Scanning Session state
  const [scannedItems, setScannedItems] = useState<ScanItem[]>([]);
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string | null>(null);
  
  // UI Panels / Modals
  const [isAddingNewProduct, setIsAddingNewProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isSyncingStock, setIsSyncingStock] = useState(false);
  const [notes, setNotes] = useState('');
  const [companyName, setCompanyName] = useState('Mi Tienda / Almacén');
  const [shouldDeductStock, setShouldDeductStock] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Trigger loading stored links or initialize auth
  useEffect(() => {
    // Read local cache for spreadsheet config if any
    const savedId = localStorage.getItem('barcode_spreadsheet_id');
    const savedName = localStorage.getItem('barcode_sheet_name');
    if (savedId) setSpreadsheetId(savedId);
    if (savedName) setSheetName(savedName);

    // Initialize Auth state
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessTokenState(token);
        setAccessToken(token);
        setNeedsAuth(false);
        setIsAuthResolving(false);
      },
      () => {
        setUser(null);
        setAccessTokenState(null);
        setNeedsAuth(true);
        setIsAuthResolving(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch product catalog on spreadsheet link
  useEffect(() => {
    if (accessToken && spreadsheetId && sheetName) {
      loadCatalog();
    }
  }, [accessToken, spreadsheetId, sheetName]);

  const loadCatalog = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      let currentSheetName = sheetName;

      // 1. Fetch spreadsheet general details to verify access and get real title
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const metadata = await response.json();
        setSpreadsheetTitle(metadata.properties.title);

        const sheets = (metadata.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
        if (sheets.length > 0) {
          const hasTargetSheet = sheets.some((s: string) => s.toLowerCase() === currentSheetName.toLowerCase());
          if (!hasTargetSheet) {
            // Find a sheet whose name suggests inventory/products, or fall back to the first sheet tab
            const match = sheets.find((s: string) => 
              s.toLowerCase().includes('prod') || 
              s.toLowerCase().includes('invent') || 
              s.toLowerCase().includes('stock') ||
              s.toLowerCase().includes('hoja') ||
              s.toLowerCase().includes('sheet')
            ) || sheets[0];
            
            if (match) {
              currentSheetName = match;
              setSheetName(match);
              localStorage.setItem('barcode_sheet_name', match);
            }
          } else {
            // Use exact casing from the spreadsheet
            const exactMatch = sheets.find((s: string) => s.toLowerCase() === currentSheetName.toLowerCase());
            if (exactMatch && exactMatch !== currentSheetName) {
              currentSheetName = exactMatch;
              setSheetName(exactMatch);
              localStorage.setItem('barcode_sheet_name', exactMatch);
            }
          }
        }
      }

      // 2. Load the actual rows
      const products = await fetchProductsFromSheet(accessToken, spreadsheetId, currentSheetName);
      setProductsCatalog(products);
    } catch (err: any) {
      console.error(err);
      setCatalogError(err.message || 'Error al descargar datos del catálogo de Google Sheets.');
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessTokenState(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessTokenState(null);
    setSpreadsheetId(null);
    setSpreadsheetTitle(null);
    setProductsCatalog([]);
    setScannedItems([]);
    setLastScannedProduct(null);
    setLastScannedBarcode(null);
    setNeedsAuth(true);
    localStorage.removeItem('barcode_spreadsheet_id');
    localStorage.removeItem('barcode_sheet_name');
  };

  const handleSpreadsheetSelect = (id: string, name: string) => {
    setSpreadsheetId(id);
    setSheetName(name);
    localStorage.setItem('barcode_spreadsheet_id', id);
    localStorage.setItem('barcode_sheet_name', name);
    setShowConfigModal(false);
  };

  /**
   * core barcode scanner trigger
   */
  const handleBarcodeScanned = (barcode: string) => {
    setLastScannedBarcode(barcode);

    // Look up in loaded products cache
    const matchedProduct = productsCatalog.find(
      (p) => p.barcode.toLowerCase() === barcode.toLowerCase()
    );

    if (matchedProduct) {
      setLastScannedProduct(matchedProduct);

      // Append or increase quantity in the dynamic list
      setScannedItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.barcode === matchedProduct.barcode);
        if (existingIndex !== -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
            timestamp: new Date().toLocaleTimeString(),
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              product: matchedProduct,
              quantity: 1,
              timestamp: new Date().toLocaleTimeString(),
            },
          ];
        }
      });

      // Show temporary positive overlay
      setSuccessMessage(`¡Pre-escaneado con éxito! ${matchedProduct.name}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setLastScannedProduct(null);
      // Open Product Creation modal to register immediately!
      setIsAddingNewProduct(true);
    }
  };

  // Create new product and append to Google Sheet
  const handleSaveNewProduct = async (newProductData: Omit<Product, 'rowNumber'>) => {
    if (!accessToken || !spreadsheetId) return;

    try {
      const formattedRow = [
        newProductData.barcode,
        newProductData.name,
        newProductData.price.toFixed(2),
        newProductData.category,
        newProductData.stock.toString(),
      ];

      // Append row to Google Sheets
      await appendProductRow(accessToken, spreadsheetId, sheetName, [formattedRow]);

      // Reload catalog to sync state
      await loadCatalog();

      // Retrieve the freshly appended product from catalog to have its rowNumber
      const refreshedCatalog = await fetchProductsFromSheet(accessToken, spreadsheetId, sheetName);
      setProductsCatalog(refreshedCatalog);

      const addedProduct = refreshedCatalog.find((p) => p.barcode === newProductData.barcode);
      if (addedProduct) {
        // Automatically inject as scanned
        setScannedItems((prev) => [
          ...prev,
          {
            product: addedProduct,
            quantity: 1,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        setLastScannedProduct(addedProduct);
      }

      setIsAddingNewProduct(false);
      setLastScannedBarcode(null);
    } catch (e: any) {
      console.error('Error saving new product:', e);
      throw new Error(`Error al registrar en Google Sheet: ${e.message}`);
    }
  };

  // Edit details of product in Google Sheet from catalog inspector
  const handleEditProductDetails = async (editedData: Omit<Product, 'rowNumber'> & { rowNumber?: number }) => {
    if (!accessToken || !spreadsheetId || !editedData.rowNumber) return;

    try {
      const fullProd: Product = {
        barcode: editedData.barcode,
        name: editedData.name,
        price: editedData.price,
        category: editedData.category,
        stock: editedData.stock,
        rowNumber: editedData.rowNumber,
      };

      await updateProductDetailsInSheet(accessToken, spreadsheetId, sheetName, fullProd);
      setEditingProduct(null);

      // Re-load sheet
      await loadCatalog();
    } catch (e: any) {
      console.error('Error editing product:', e);
      throw new Error(`Error al actualizar Google Sheet: ${e.message}`);
    }
  };

  // Adjust scanning session product totals
  const handleUpdateQuantity = (barcode: string, amount: number) => {
    setScannedItems((prev) =>
      prev
        .map((item) => {
          if (item.product.barcode === barcode) {
            const nextQty = item.quantity + amount;
            if (nextQty <= 0) return null;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item): item is ScanItem => item !== null)
    );
  };

  const handleRemoveScanItem = (barcode: string) => {
    setScannedItems((prev) => prev.filter((item) => item.product.barcode !== barcode));
  };

  const handleClearSession = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar TODOS los productos escaneados en esta sesión?')) {
      setScannedItems([]);
      setLastScannedProduct(null);
      setLastScannedBarcode(null);
    }
  };

  /**
   * Finalize and issue report
   */
  const handleFinalizeReport = async () => {
    if (scannedItems.length === 0) return;

    let subError = false;

    // Deduct stock if checked
    if (shouldDeductStock) {
      setIsSyncingStock(true);
      try {
        for (const item of scannedItems) {
          if (item.product.rowNumber) {
            const nextStock = Math.max(0, item.product.stock - item.quantity);
            await updateProductStockInSheet(accessToken!, spreadsheetId!, sheetName, item.product, nextStock);
          }
        }
        // Force refresh Google Sheet catalog
        await loadCatalog();
      } catch (err: any) {
        console.error('Error updating stocks:', err);
        alert(`Ocurrió un error al descontar parte del stock en Google Sheets: ${err.message}. El reporte PDF se generará igual.`);
        subError = true;
      } finally {
        setIsSyncingStock(false);
      }
    }

    try {
      // Create PDF
      const pdf = generateScanningReport({
        userName: user?.displayName || 'Usuario de Google',
        userEmail: user?.email || '',
        sheetName: sheetName,
        scannedItems,
        companyName: companyName,
        notes: notes,
      });

      // Save file
      const dateString = new Date().toISOString().slice(0, 10);
      pdf.save(`Reporte_Escaneo_${dateString}.pdf`);

      if (!subError) {
        alert('¡Sesión Completada! El reporte PDF ha sido descargado' + (shouldDeductStock ? ' y el stock de inventario se ha actualizado en tu Google Sheets.' : '.'));
      }
    } catch (pdfErr) {
      console.error(pdfErr);
      alert('Error al generar el PDF. Por favor re-intenta.');
    }
  };

  // Helpers to get list of categories
  const categories = Array.from(new Set(productsCatalog.map((p) => p.category))).filter(Boolean);

  // Filtered catalog
  const filteredCatalog = productsCatalog.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      product.barcode.includes(catalogSearch);
    const matchesCategory = categoryFilter ? product.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const grandTotal = scannedItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const grandTotalItems = scannedItems.reduce((acc, item) => acc + item.quantity, 0);

  // Authentication page when needsAuth is true
  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col justify-between p-6 select-none relative overflow-hidden text-slate-800">
        {/* Abstract design elements to establish a mood */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

        <header className="max-w-7xl mx-auto w-full flex items-center justify-between pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <QrCode size={20} />
            </div>
            <span className="font-display font-semibold tracking-tight text-slate-850 text-base">Barcode Sheet Scanner</span>
          </div>
        </header>

        <main className="max-w-md mx-auto w-full my-auto text-center space-y-8 z-10">
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold text-slate-800 tracking-tight leading-none sm:text-5xl">
              Escáner de Inventario Inteligente
            </h1>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              Lee códigos de barras con tu cámara o pistola USB, conecta tu base de datos de Google Sheets y emite reportes en PDF de forma instantánea.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl shadow-slate-100">
            {isAuthResolving ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <Loader2 className="animate-spin text-indigo-500" size={28} />
                <span className="text-xs text-slate-400">Verificando sesión...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center -space-x-1 py-1">
                  <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3.5 py-1.5 rounded-full text-[11px] font-bold tracking-wider uppercase">
                    VÍNCULO FÁCIL DRIVE & SHEETS
                  </div>
                </div>

                <button
                  id="btn-google-signin"
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className="w-full relative flex items-center justify-center gap-3 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 font-semibold px-5 py-4 rounded-2xl transition-all border border-slate-200 shadow-sm cursor-pointer"
                >
                  {isLoggingIn ? (
                    <Loader2 className="animate-spin text-indigo-600" size={18} />
                  ) : (
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-[18px] h-[18px]">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>Iniciar sesión con Google</span>
                </button>
              </div>
            )}
          </div>
        </main>

        <footer className="text-center py-4 text-[11px] text-slate-400 font-mono tracking-wider uppercase max-w-7xl mx-auto w-full">
          Conexión cifrada a Google Sheets API v4
        </footer>
      </div>
    );
  }

  // Logged-in view
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-705 relative pb-16">
      {/* Visual background gradient glow */}
      <div className="absolute top-0 left-10 w-96 h-96 bg-indigo-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Header */}
      <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 text-white select-none">
            <QrCode size={22} />
          </div>
          <div className="text-left">
            <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-1">ScanSheet <span className="text-indigo-600">Pro</span></h1>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {spreadsheetId ? `Connected: ${spreadsheetTitle || 'Inicializado'}` : 'Inventario de Hojas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Spreadsheet Status Header */}
          {spreadsheetId ? (
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 select-none">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-emerald-700">Cloud Sync Active</span>
              <button
                id="btn-edit-spreadsheet-link"
                onClick={() => setShowConfigModal(true)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-bold ml-1 hover:underline cursor-pointer"
              >
                (Cambiar)
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-full font-medium">
              ⚠️ Ninguna hoja de cálculo vinculada aún
            </div>
          )}

          {/* Profile User Panel */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/90 rounded-xl p-1.5 pl-3.5">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800 leading-tight">{user?.displayName || 'Admin User'}</p>
              <p className="text-[10px] text-slate-400">{user?.email || 'Warehouse Alpha'}</p>
            </div>
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                referrerPolicy="no-referrer"
                alt="Avatar"
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center">
                {user?.displayName?.slice(0, 2).toUpperCase() || 'JD'}
              </div>
            )}
            <button
              id="btn-logout"
              onClick={handleLogout}
              className="p-1 px-2.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 md:px-8 pt-8">
        {/* If spreadsheets not loaded, block dashboard with Selection */}
        {!spreadsheetId || showConfigModal ? (
          <div className="py-12">
            <SpreadsheetSelector
              accessToken={accessToken!}
              onSelect={handleSpreadsheetSelect}
            />
            {spreadsheetId && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs font-semibold underline cursor-pointer"
                >
                  Regresar al Dashboard actual
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Dashboard Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Scanning and Last scanned card */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Barcode scanner */}
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <QrCode size={14} className="text-indigo-600" />
                    <span>Lector de Códigos</span>
                  </h2>
                  <BarcodeScanner
                    onScan={handleBarcodeScanned}
                    productsCatalog={productsCatalog}
                    isLoadingCatalog={isLoadingCatalog}
                  />
                </div>

                {/* Last scan display block */}
                <div className="bg-white rounded-2xl p-5 text-left relative overflow-hidden shadow-sm border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5">Último Item Identificado</h3>
                  
                  {lastScannedBarcode ? (
                    <div className="mt-2.5 space-y-3.5">
                      {lastScannedProduct ? (
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-mono text-xs shrink-0 select-none">
                            PROD
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{lastScannedProduct.name}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">SKU: {lastScannedProduct.barcode}</p>
                            
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                                {lastScannedProduct.category}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded text-[10px] font-bold font-mono">
                                ${lastScannedProduct.price.toFixed(2)}
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold font-mono">
                                Stock: {lastScannedProduct.stock}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-850 text-xs leading-relaxed">
                            ⚠️ El código <span className="font-mono font-bold text-orange-950">"{lastScannedBarcode}"</span> no se encuentra registrado en tu base de datos de Google Sheets.
                          </div>
                          <button
                            id="btn-add-product-scanner"
                            onClick={() => setIsAddingNewProduct(true)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>Registrar este producto nuevo</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 mb-2 text-center text-slate-400 space-y-2">
                      <Barcode className="mx-auto text-slate-300 animate-pulse" size={32} />
                      <p className="text-xs">Escanea o escribe un código para ver los detalles aquí.</p>
                    </div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: Scanning Cart Session and Actions */}
              <div className="lg:col-span-7 space-y-6 text-left">
                
                <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                      <h2 className="text-base font-bold text-slate-800">Artículos de la Sesión</h2>
                      <p className="text-xs text-slate-500">{scannedItems.length} productos en el lote actual</p>
                    </div>
                    {scannedItems.length > 0 && (
                      <button
                        onClick={handleClearSession}
                        className="px-3 py-1.5 bg-slate-105 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Trash2 size={12} />
                        Vaciar lote
                      </button>
                    )}
                  </div>

                  {/* Scanned Items Cart Table/List */}
                  <div>
                    {scannedItems.length === 0 ? (
                      <div className="py-14 text-center text-slate-400 space-y-3">
                        <ShoppingCart className="mx-auto text-slate-300" size={36} />
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-slate-700">La lista de escaneados está vacía.</p>
                          <p className="text-[11px] text-slate-550 max-w-xs mx-auto">Comienza a leer códigos para registrar transacciones o inventario físico.</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* List */}
                        <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                          {scannedItems.map((item, idx) => (
                            <div
                              key={item.product.barcode}
                              className={`p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors ${idx % 2 === 1 ? 'bg-indigo-50/10' : 'bg-white'}`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-slate-800 text-sm truncate">{item.product.name}</div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                                  <span>Código: {item.product.barcode}</span>
                                  <span>•</span>
                                  <span>Precio: ${item.product.price.toFixed(2)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 shrink-0">
                                {/* Quantity controls */}
                                <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50 p-0.5">
                                  <button
                                    onClick={() => handleUpdateQuantity(item.product.barcode, -1)}
                                    className="p-1 px-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition-all font-bold text-xs cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 text-xs font-bold font-mono text-slate-800">{item.quantity}</span>
                                  <button
                                    onClick={() => handleUpdateQuantity(item.product.barcode, 1)}
                                    className="p-1 px-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded transition-all font-bold text-xs cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Item subtotal and remove */}
                                <div className="text-right min-w-[70px]">
                                  <div className="text-xs font-mono font-bold text-slate-800">${(item.product.price * item.quantity).toFixed(2)}</div>
                                </div>

                                <button
                                  onClick={() => handleRemoveScanItem(item.product.barcode)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                  title="Quitar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Totals Frame in clean slate background footer format */}
                        <div className="p-6 bg-slate-800 text-white select-none">
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex gap-8">
                              <div>
                                <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Total Leído</p>
                                <p className="text-2xl font-light">{grandTotalItems} <span className="text-sm text-slate-400">piezas</span></p>
                              </div>
                              <div className="w-px h-10 bg-slate-705"></div>
                              <div>
                                <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Valor Estimado</p>
                                <p className="text-2xl font-light tracking-tight text-indigo-300 font-mono">${grandTotal.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                </div>

                {/* Print Configuration Form - sleek card form */}
                {scannedItems.length > 0 && (
                  <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm text-left">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      <span>Configuración del Informe PDF</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Emisor del Reporte (Empresa/Local)</label>
                        <input
                          type="text"
                          placeholder="Mi Almacén S.A."
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 font-mono">ID de Hoja Activa (Solo Lectura)</label>
                        <div className="bg-slate-50 border border-slate-250/70 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono select-all truncate">
                          {spreadsheetId}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Notas adicionales al reporte</label>
                      <textarea
                        placeholder="Ej. Revisión física semanal de stock / Ajustes de merma por productos dañados..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-sans"
                      />
                    </div>

                    {/* Highly Professional Stock Sync Feature */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="deduct-stock-toggle"
                        checked={shouldDeductStock}
                        onChange={(e) => setShouldDeductStock(e.target.checked)}
                        className="accent-indigo-600 h-4 w-4 mt-0.5 shrink-0"
                      />
                      <label htmlFor="deduct-stock-toggle" className="text-xs cursor-pointer select-none text-left">
                        <span className="block font-bold text-slate-800">Descontar stock en Google Sheets automáticamente</span>
                        <span className="block text-[11px] text-slate-550 mt-1">
                          Si marcas esta casilla, al finalizar la sesión, restaremos las cantidades leídas de la columna de Stock en tu Hoja de Cálculo en tiempo real.
                        </span>
                      </label>
                    </div>

                    <button
                      id="btn-finalize-scans"
                      onClick={handleFinalizeReport}
                      disabled={isSyncingStock}
                      className="w-full bg-indigo-600 hover:bg-slate-900 duration-200 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2.5 shadow-md shadow-indigo-100/50 text-sm cursor-pointer"
                    >
                      {isSyncingStock ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Actualizando stock de Google Sheets...</span>
                        </>
                      ) : (
                        <>
                          <FileText size={18} />
                          <span>Finalizar y Descargar Reporte PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>

            </div>

            {/* DATABASE INSPECTOR & TABLE SECTION */}
            <div className="border-t border-slate-200 pt-8 text-left col-span-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <BookOpen size={16} className="text-indigo-600" />
                    <span>Catálogo de Google Sheets ({productsCatalog.length} productos)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Vista en vivo del inventario conectado en Google Sheets. Puedes editar cualquier fila o registrar nuevos productos.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    id="btn-add-product-catalog"
                    onClick={() => {
                      setLastScannedBarcode(null);
                      setLastScannedProduct(null);
                      setIsAddingNewProduct(true);
                    }}
                    className="bg-indigo-600 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                  >
                    <Plus size={14} />
                    <span>Añadir Producto</span>
                  </button>
                  <button
                    onClick={loadCatalog}
                    disabled={isLoadingCatalog}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {isLoadingCatalog ? <Loader2 size={13} className="animate-spin" /> : null}
                    Refrescar
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center mb-4 shadow-sm">
                <div className="relative w-full md:flex-1">
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o número de código..."
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="w-full md:w-56">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 focus:outline-none"
                  >
                    <option value="">Todas las Categorías</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table rendering */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                {isLoadingCatalog ? (
                  <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-indigo-500" size={28} />
                    <span className="text-xs font-semibold">Sincronizando inventario con Google Sheets...</span>
                  </div>
                ) : catalogError ? (
                  <div className="py-14 text-center text-amber-600 space-y-3 p-6">
                    <Info className="mx-auto text-amber-500" size={28} />
                    <p className="text-xs font-bold font-mono">{catalogError}</p>
                    <button
                      onClick={loadCatalog}
                      className="bg-indigo-600 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Re-intentar carga
                    </button>
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="py-14 text-center text-slate-400 p-6 space-y-1">
                    <Package className="mx-auto text-slate-300 mb-2" size={32} />
                    <p className="text-xs font-semibold">Ningún producto coincide con la búsqueda.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-450 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3.5 px-5">Fila</th>
                          <th className="py-3.5 px-5">Código de barras</th>
                          <th className="py-3.5 px-5">Producto / Nombre</th>
                          <th className="py-3.5 px-5">Categoría</th>
                          <th className="py-3.5 px-5 text-right">Precio</th>
                          <th className="py-3.5 px-5 text-center">Stock</th>
                          <th className="py-3.5 px-5 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filteredCatalog.map((product, idx) => (
                          <tr key={product.barcode} className={`hover:bg-indigo-50/20 transition-all ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                            <td className="py-3.5 px-5 text-slate-400 font-mono font-medium">#{product.rowNumber}</td>
                            <td className="py-3.5 px-5 text-slate-700 font-mono font-bold tracking-tight">{product.barcode}</td>
                            <td className="py-3.5 px-5 font-bold text-slate-900">{product.name}</td>
                            <td className="py-3.5 px-5">
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">{product.category}</span>
                            </td>
                            <td className="py-3.5 px-5 text-right font-mono font-bold text-slate-800">${product.price.toFixed(2)}</td>
                            <td className="py-3.5 px-5 text-center font-mono">
                              <span className={`font-semibold px-2 py-1 rounded-md text-[10px] ${
                                product.stock > 10 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {product.stock} pz
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-right">
                              <button
                                onClick={() => setEditingProduct(product)}
                                className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-100 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADD PRODUCT FORM */}
      {isAddingNewProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm">
            <ProductForm
              initialBarcode={lastScannedBarcode || ''}
              onSave={handleSaveNewProduct}
              onCancel={() => {
                setIsAddingNewProduct(false);
                setLastScannedBarcode(null);
              }}
            />
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT FORM */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm">
            <ProductForm
              editingProduct={editingProduct}
              onSave={handleEditProductDetails}
              onCancel={() => setEditingProduct(null)}
            />
          </div>
        </div>
      )}

      {/* Global scan notification toast */}
      {successMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-white border border-emerald-250 text-emerald-800 px-4 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-xl animate-slide-up leading-none text-xs font-bold">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Bottom Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 px-8 py-2 bg-white border-t border-slate-200 flex justify-between text-[10px] font-medium text-slate-400 uppercase tracking-widest">
        <div className="flex gap-4">
          <span>Version 2.4.1</span>
          <span>System Status: Optimal</span>
        </div>
        <div className="flex gap-4">
          <span>Session ID: SES-992-XPA</span>
          <span>Local Time: {new Date().toLocaleTimeString()}</span>
        </div>
      </footer>
    </div>
  );
}
