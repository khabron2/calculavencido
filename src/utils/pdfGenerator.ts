/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { ScanItem } from '../types';

interface PDFParams {
  userName: string;
  userEmail: string;
  sheetName: string;
  scannedItems: ScanItem[];
  companyName: string;
  notes?: string;
}

export function generateScanningReport({
  userName,
  userEmail,
  sheetName,
  scannedItems,
  companyName,
  notes = '',
}: PDFParams): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const totalCost = scannedItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const totalItems = scannedItems.reduce((acc, item) => acc + item.quantity, 0);

  // --- Palette colors ---
  const PRIMARY_COLOR = [22, 38, 76]; // #16264c - Dark indigo
  const SECONDARY_COLOR = [99, 102, 241]; // #6366f1 - Slate violet/blue
  const GRAY_DARK = [51, 65, 85]; // Slate-700
  const GRAY_LIGHT = [241, 245, 249]; // Slate-100

  // --- Page Decoration ---
  // Top primary accent bar
  doc.setFillColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.rect(0, 0, 210, 8, 'F');

  // --- Header Block ---
  // Company Title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text(companyName || 'REGISTRO DE INVENTARIO', 15, 22);

  // Invoice / Report Label
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SECONDARY_COLOR[0], SECONDARY_COLOR[1], SECONDARY_COLOR[2]);
  doc.text('REPORTE OFICIAL DE ESCANEO', 15, 28);

  // Metadata block (Right side)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  
  const currentDateStr = new Date().toLocaleString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  doc.text(`Fecha: ${currentDateStr}`, 130, 22);
  doc.text(`Reporte ID: SR-${Math.floor(100000 + Math.random() * 900000)}`, 130, 27);
  doc.text(`Operador: ${userName || 'Usuario de Google'}`, 130, 32);
  doc.text(`Email: ${userEmail || 'N/A'}`, 130, 37);

  // Horizontal divider banner
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(15, 42, 195, 42);

  // --- Spreadsheet details ---
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('Origen de Datos:', 15, 49);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text(`Google Sheets - Hoja activa: "${sheetName}"`, 48, 49);

  // --- Table implementation ---
  const headers = [['#', 'Código de barras', 'Producto / Artículo', 'Categoría', 'Cant.', 'P. Unitario', 'Subtotal']];
  const tableData = scannedItems.map((item, index) => [
    (index + 1).toString(),
    item.product.barcode,
    item.product.name,
    item.product.category,
    item.quantity.toString(),
    `$${item.product.price.toFixed(2)}`,
    `$${(item.product.price * item.quantity).toFixed(2)}`,
  ]);

  // Using dynamic import-less call for jspdf-autotable
  (doc as any).autoTable({
    head: headers,
    body: tableData,
    startY: 55,
    margin: { left: 15, right: 15 },
    theme: 'striped',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    bodyStyles: {
      textColor: GRAY_DARK,
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 35, fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 25 },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 23, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: GRAY_LIGHT,
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // --- Totals Box ---
  const totalsBoxWidth = 70;
  const totalsBoxX = 210 - 15 - totalsBoxWidth;

  doc.setFillColor(GRAY_LIGHT[0], GRAY_LIGHT[1], GRAY_LIGHT[2]);
  doc.rect(totalsBoxX, finalY, totalsBoxWidth, 24, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(totalsBoxX, finalY, totalsBoxWidth, 24, 'S');

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
  doc.text('Total Artículos:', totalsBoxX + 4, finalY + 7);
  doc.text(totalItems.toString(), totalsBoxX + 50, finalY + 7, { align: 'right' });

  doc.text('Productos Únicos:', totalsBoxX + 4, finalY + 13);
  doc.text(scannedItems.length.toString(), totalsBoxX + 50, finalY + 13, { align: 'right' });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('COSTO TOTAL:', totalsBoxX + 4, finalY + 19);
  doc.text(`$${totalCost.toFixed(2)}`, totalsBoxX + 66, finalY + 19, { align: 'right' });

  // --- Notes Sector ---
  if (notes) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
    doc.text('Notas / Comentarios:', 15, finalY + 6);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(GRAY_DARK[0], GRAY_DARK[1], GRAY_DARK[2]);
    
    // Auto-wrap note text
    const splitNotes = doc.splitTextToSize(notes, 100);
    doc.text(splitNotes, 15, finalY + 12);
  }

  // --- Footer Block ---
  const pageHeight = 297; // A4 height
  doc.setDrawColor(226, 232, 240);
  doc.line(15, pageHeight - 18, 195, pageHeight - 18);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Documento generado electrónicamente en ${currentDateStr} vía Barcode Sheet Scanner.`, 15, pageHeight - 12);
  doc.text('Pág. 1 de 1', 195 - 15, pageHeight - 12, { align: 'right' });

  return doc;
}
