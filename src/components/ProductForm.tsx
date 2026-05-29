/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { Tag, Barcode, DollarSign, Package, Folder, Plus, Save, X, Loader2 } from 'lucide-react';

interface ProductFormProps {
  initialBarcode?: string; // If prefilled on a scan that matched nothing
  editingProduct?: Product | null; // If editing an existing one
  onSave: (product: Omit<Product, 'rowNumber'> & { rowNumber?: number }) => Promise<void>;
  onCancel: () => void;
}

export default function ProductForm({ initialBarcode = '', editingProduct = null, onSave, onCancel }: ProductFormProps) {
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setBarcode(editingProduct.barcode);
      setName(editingProduct.name);
      setPrice(editingProduct.price.toString());
      setCategory(editingProduct.category);
      setStock(editingProduct.stock.toString());
    } else if (initialBarcode) {
      setBarcode(initialBarcode);
    }
  }, [editingProduct, initialBarcode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!barcode.trim()) {
      setError('El código de barras es obligatorio.');
      return;
    }
    if (!name.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('El precio debe ser un número válido mayor o igual a 0.');
      return;
    }

    const stockNum = parseInt(stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      setError('El stock debe ser un número entero mayor o igual a 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        barcode: barcode.trim(),
        name: name.trim(),
        price: priceNum,
        category: category.trim() || 'Varios',
        stock: stockNum,
        rowNumber: editingProduct?.rowNumber, // Pass row index if it's an edit
      });
    } catch (e: any) {
      setError(e.message || 'Error al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xl relative">
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
      >
        <X size={18} />
      </button>

      <div className="mb-6 text-left">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">
          {editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {editingProduct
            ? 'Actualiza los detalles del producto en la hoja de Google Sheets.'
            : 'Este producto no existe en tu base de datos. Complétalo para registrarlo en Google Sheets.'}
        </p>
      </div>

      {error && (
        <p className="mb-4 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-100 rounded-xl p-3 text-left">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1.5">Código de Barras</label>
          <div className="relative">
            <Barcode className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
            <input
              type="text"
              required
              disabled={!!editingProduct} // Cannot change barcode on edit
              placeholder="Escribe o escanea el código"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1.5">Nombre del Producto</label>
          <div className="relative">
            <Tag className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
            <input
              type="text"
              required
              placeholder="Ej: Sabritas Crujientes 45g"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1.5">Precio ($)</label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1.5">Inventario / Stock</label>
            <div className="relative">
              <Package className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
              <input
                type="number"
                required
                placeholder="10"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-550 uppercase tracking-wide mb-1.5">Categoría</label>
          <div className="relative">
            <Folder className="absolute left-3.5 top-3.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Ej: Snacks, Bebidas, Lácteos"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex gap-2.5 pt-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-slate-800 py-3 rounded-xl hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            id="btn-save-product-modal"
            disabled={isSubmitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white py-3 rounded-xl transition-colors font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                <span>Guardando...</span>
              </>
            ) : editingProduct ? (
              <>
                <Save size={14} />
                <span>Actualizar</span>
              </>
            ) : (
              <>
                <Plus size={14} />
                <span>Agregar a Hoja</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
