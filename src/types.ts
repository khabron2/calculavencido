/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  barcode: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  rowNumber?: number; // Keep track of the Excel/Sheet row index for potential edits
}

export interface ScanItem {
  product: Product;
  quantity: number;
  timestamp: string;
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
}

export interface GoogleSheetFile {
  id: string;
  name: string;
  mimeType: string;
}
