const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { formatUsd } = require('./financial');
const { readSettings } = require('../features/financial-settings/financial-settings.store');
const { renderDocumentTemplate } = require('./document-templates');
const { renderHtmlToPdf, resolveExecutablePath } = require('./html-to-pdf');
const {
  buildInvoiceViewModel,
  buildReceiptViewModel,
  buildContractViewModel,
} = require('./document-builders');

const FINANCIAL_SUBDIR = 'financial';
const FINANCIAL_RELATIVE_PATH = `/uploads/${FINANCIAL_SUBDIR}`;

function getFinancialDir() {
  return path.join(process.cwd(), 'public', 'uploads', FINANCIAL_SUBDIR);
}

function ensureFinancialDir() {
  const dir = getFinancialDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function buildFinancialUrl(filename) {
  return `${FINANCIAL_RELATIVE_PATH}/${filename}`;
}

function buildInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${date}-${String(order.id).slice(0, 8).toUpperCase()}`;
}

function buildReceiptNumber(order) {
  if (order.receiptNumber) return order.receiptNumber;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `RCP-${date}-${String(order.id).slice(0, 8).toUpperCase()}`;
}

async function writePdfFromHtml(html, filename) {
  ensureFinancialDir();
  const outputDir = getFinancialDir();

  if (resolveExecutablePath()) {
    const filePath = await renderHtmlToPdf(html, { filename, outputDir });
    return {
      filename,
      path: filePath,
      url: buildFinancialUrl(filename),
    };
  }

  return writePlainTextFallbackPdf(filename, 'Document preview unavailable — install Chromium in the API container.');
}

function writePlainTextFallbackPdf(filename, message) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  ensureFinancialDir();
  const filePath = path.join(getFinancialDir(), filename);

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(14).text(message);
    doc.end();
    stream.on('finish', () => {
      resolve({ filename, path: filePath, url: buildFinancialUrl(filename) });
    });
    stream.on('error', reject);
  });
}

async function generateInvoicePdf(order) {
  const invoiceNumber = buildInvoiceNumber(order);
  const filename = `invoice-${invoiceNumber}-${crypto.randomUUID().slice(0, 8)}.pdf`;
  const viewModel = buildInvoiceViewModel(order, invoiceNumber);
  const html = renderDocumentTemplate('invoice', viewModel);
  return writePdfFromHtml(html, filename);
}

async function generateReceiptPdf(order) {
  const receiptNumber = buildReceiptNumber(order);
  const filename = `receipt-${receiptNumber}.pdf`;
  const viewModel = buildReceiptViewModel(order, receiptNumber);
  const html = renderDocumentTemplate('receipt', viewModel);
  return writePdfFromHtml(html, filename);
}

async function generateContractPdf(contract, signer = {}, acceptance = null) {
  const safeTitle = String(contract.title || 'contract')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
  const filename = `contract-${safeTitle}-v${contract.version}-${crypto.randomUUID().slice(0, 8)}.pdf`;
  const viewModel = buildContractViewModel(contract, signer, acceptance);
  const html = renderDocumentTemplate('contract', viewModel);
  return writePdfFromHtml(html, filename);
}

module.exports = {
  generateInvoicePdf,
  generateReceiptPdf,
  generateContractPdf,
  buildInvoiceNumber,
  buildReceiptNumber,
  FINANCIAL_RELATIVE_PATH,
};
