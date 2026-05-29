/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product } from './types';

/**
 * Lists all Google Sheets from the user's Google Drive.
 */
export async function listSpreadsheets(accessToken: string): Promise<any[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&orderBy=name`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error listing spreadsheets:', errorText);
    throw new Error(`Error al listar archivos de Drive: ${response.statusText}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Creates a brand new Spreadsheet with a standard Inventory schema and sample products.
 */
export async function createDefaultSpreadsheet(accessToken: string, name: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: name },
      sheets: [{ properties: { title: 'Productos' } }]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error creating spreadsheet:', errorText);
    throw new Error(`Error al crear la hoja en Google Sheets: ${response.statusText}`);
  }

  const sheetData = await response.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // 1. Write the Headers
  await updateSheetValues(accessToken, spreadsheetId, 'Productos!A1:E1', [
    ['Código de barras', 'Producto', 'Precio', 'Categoría', 'Stock']
  ]);

  // 2. Append standard sample products
  const samples = [
    ['7501055300074', 'Coca-Cola Original 355ml', '18.50', 'Bebidas', '120'],
    ['7501000111205', 'Papas Sabritas Sal 45g', '17.00', 'Snacks', '50'],
    ['7501031301071', 'Galletas Oreo Classic 114g', '21.50', 'Galletas', '45'],
    ['12345678', 'Producto de Demo', '99.90', 'Demo', '10']
  ];

  await appendProductRow(accessToken, spreadsheetId, 'Productos', samples);

  return spreadsheetId;
}

/**
 * Fetches sheet names of a spreadsheet to find the correct sheets available.
 */
export async function getSpreadsheetSheets(accessToken: string, spreadsheetId: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties/title)`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error getting spreadsheet details:', errorText);
    throw new Error(`No se pudo leer la información de la hoja. Verifica los permisos.`);
  }

  const data = await response.json();
  return (data.sheets || []).map((s: any) => s.properties.title);
}

/**
 * Reads all rows from a spreadsheet and maps them into safe Product JSON.
 */
export async function fetchProductsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<Product[]> {
  const range = `${sheetName}!A:G`; // Allow up to G columns to avoid capping
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error fetching sheet rows:', errorText);
    throw new Error(`Error al leer datos de la hoja "${sheetName}": ${response.statusText}`);
  }

  const data = await response.json();
  const rows = data.values || [];

  if (rows.length === 0) {
    try {
      // Automatically construct template headers if sheet has no content at all
      await updateSheetValues(accessToken, spreadsheetId, `${sheetName}!A1:E1`, [
        ['Código de barras', 'Producto', 'Precio', 'Categoría', 'Stock']
      ]);
    } catch (e) {
      console.error('Error writing default headers to empty sheet:', e);
    }
    return [];
  }

  const header = rows[0].map((h: string) => h.toLowerCase().trim());
  
  // Find indices for essential columns dynamically, falling back to 0, 1, 2, 3, 4
  const colBarcode = header.findIndex((h: string) => 
    h.includes('código') || h.includes('codigo') || h.includes('barcode') || h.includes('upc') || h.includes('sku') || h.includes('id')
  ) !== -1 ? header.findIndex((h: string) => 
    h.includes('código') || h.includes('codigo') || h.includes('barcode') || h.includes('upc') || h.includes('sku') || h.includes('id')
  ) : 0;

  const colName = header.findIndex((h: string) => 
    h.includes('nombre') || h.includes('producto') || h.includes('name') || h.includes('descrip') || h.includes('título') || h.includes('titulo')
  ) !== -1 ? header.findIndex((h: string) => 
    h.includes('nombre') || h.includes('producto') || h.includes('name') || h.includes('descrip') || h.includes('título') || h.includes('titulo')
  ) : 1;

  const colPrice = header.findIndex((h: string) => 
    h.includes('precio') || h.includes('price') || h.includes('cost') || h.includes('costo') || h.includes('valor')
  ) !== -1 ? header.findIndex((h: string) => 
    h.includes('precio') || h.includes('price') || h.includes('cost') || h.includes('costo') || h.includes('valor')
  ) : 2;

  const colCategory = header.findIndex((h: string) => 
    h.includes('categor') || h.includes('category') || h.includes('grupo') || h.includes('tag')
  ) !== -1 ? header.findIndex((h: string) => 
    h.includes('categor') || h.includes('category') || h.includes('grupo') || h.includes('tag')
  ) : 3;

  const colStock = header.findIndex((h: string) => 
    h.includes('stock') || h.includes('existencia') || h.includes('cantidad') || h.includes('qty') || h.includes('inventario')
  ) !== -1 ? header.findIndex((h: string) => 
    h.includes('stock') || h.includes('existencia') || h.includes('cantidad') || h.includes('qty') || h.includes('inventario')
  ) : 4;

  const products: Product[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Skip empty lines
    if (!row || row.length === 0) continue;

    const barcode = (row[colBarcode] || '').toString().trim();
    if (!barcode) continue; // Must have barcode

    const name = (row[colName] || 'Producto sin nombre').toString().trim();
    
    // Clean price string from "$" or spaces
    const rawPrice = (row[colPrice] || '0').toString().replace(/[$,]/g, '').trim();
    const price = parseFloat(rawPrice) || 0;

    const category = (row[colCategory] || 'Varios').toString().trim();

    // Clean stock string
    const rawStock = (row[colStock] || '0').toString().replace(/[,]/g, '').trim();
    const stock = parseInt(rawStock, 10) || 0;

    // Excel row is i + 1 (since array is 0-indexed and header row counts as 1)
    products.push({
      barcode,
      name,
      price,
      category,
      stock,
      rowNumber: i + 1,
    });
  }

  return products;
}

/**
 * Appends rows to a spreadsheet.
 */
export async function appendProductRow(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rows: string[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:E:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `${sheetName}!A:E`,
      majorDimension: 'ROWS',
      values: rows,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error appending product row:', errorText);
    throw new Error(`No se pudo agregar el producto en Google Sheet: ${response.statusText}`);
  }
}

/**
 * Updates full or partial cells in a spreadsheet.
 */
export async function updateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error updating values:', errorText);
    throw new Error(`Error al actualizar valores en la hoja: ${response.statusText}`);
  }
}

/**
 * Updates a product's stock directly in the Google Sheet based on rowNumber.
 */
export async function updateProductStockInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  product: Product,
  newStock: number
): Promise<void> {
  if (!product.rowNumber) {
    throw new Error('No se puede actualizar el stock porque no se encontró la fila en la hoja de cálculo.');
  }

  // To be super safe, let's assume standard headers map A to E:
  // Column A: Barcode, Column B: Name, Column C: Price, Column D: Category, Column E: Stock
  // Let's just update Column E (Stock) of the specific row!
  // Column E is index 5
  const range = `${sheetName}!E${product.rowNumber}`;
  await updateSheetValues(accessToken, spreadsheetId, range, [[newStock.toString()]]);
}

/**
 * Edit full details of a product in the Google Sheet.
 */
export async function updateProductDetailsInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  product: Product
): Promise<void> {
  if (!product.rowNumber) {
    throw new Error('No se puede editar el producto porque no se encontró la fila en la hoja de cálculo.');
  }

  const range = `${sheetName}!A${product.rowNumber}:E${product.rowNumber}`;
  const values = [
    [
      product.barcode,
      product.name,
      product.price.toString(),
      product.category,
      product.stock.toString()
    ]
  ];

  await updateSheetValues(accessToken, spreadsheetId, range, values);
}
