const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const config = require('../config');
const { formatUsd } = require('./financial');

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

function writePdfToFile(doc, filename) {
  ensureFinancialDir();
  const filePath = path.join(getFinancialDir(), filename);

  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.end();
    stream.on('finish', () => {
      resolve({
        filename,
        path: filePath,
        url: buildFinancialUrl(filename),
      });
    });
    stream.on('error', reject);
  });
}

function buildInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `INV-${date}-${String(order.id).slice(0, 8).toUpperCase()}`;
}

function renderDocumentHeader(doc, title) {
  const company = config.company;
  doc.fontSize(20).text(company.name, { continued: false });
  doc.fontSize(10).fillColor('#555555');
  doc.text(company.address || '');
  if (company.email) doc.text(company.email);
  if (company.phone) doc.text(company.phone);
  doc.moveDown();
  doc.fillColor('#000000').fontSize(16).text(title);
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor('#666666').text('TEST TEMPLATE — final layout pending client branding');
  doc.fillColor('#000000').moveDown();
}

function buildLineItems(order) {
  const items = [
    {
      description: `Cleaning service — ${order.property?.name || 'Property'}`,
      amount: Number(order.basePrice || 0),
    },
  ];

  for (const extra of order.extras || []) {
    items.push({
      description: extra.serviceExtra?.name || extra.name || 'Extra service',
      amount: Number(extra.priceAtTime || extra.serviceExtra?.defaultPrice || 0),
    });
  }

  return items;
}

async function generateInvoicePdf(order) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const invoiceNumber = buildInvoiceNumber(order);
  const client = order.property?.client;
  const filename = `invoice-${invoiceNumber}-${crypto.randomUUID().slice(0, 8)}.pdf`;

  renderDocumentHeader(doc, 'INVOICE');
  doc.fontSize(11);
  doc.text(`Invoice #: ${invoiceNumber}`);
  doc.text(`Issue date: ${new Date().toLocaleDateString('en-US')}`);
  doc.text(`Service date: ${order.scheduledDate || '—'}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Bill to:');
  doc.font('Helvetica');
  doc.text(client?.name || order.property?.clientId || 'Client');
  if (client?.email) doc.text(client.email);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Property:');
  doc.font('Helvetica');
  doc.text(order.property?.name || '—');
  doc.text(order.property?.address || '—');
  doc.moveDown();

  doc.font('Helvetica-Bold');
  doc.text('Description', 50, doc.y, { continued: true });
  doc.text('Amount', 450, doc.y, { align: 'right', width: 100 });
  doc.moveDown(0.5);
  doc.font('Helvetica');

  for (const item of buildLineItems(order)) {
    const y = doc.y;
    doc.text(item.description, 50, y, { width: 360 });
    doc.text(formatUsd(item.amount), 450, y, { align: 'right', width: 100 });
    doc.moveDown(0.4);
  }

  doc.moveDown();
  doc.font('Helvetica-Bold');
  doc.text(`Total due: ${formatUsd(order.totalPrice)}`, { align: 'right' });
  doc.moveDown();
  doc.font('Helvetica');
  doc.text('Payment methods: Zelle or check');
  doc.text(`Zelle: ${config.company.zelle}`);
  doc.moveDown();
  doc.fontSize(9).fillColor('#666666');
  doc.text('This is a test invoice template. Final company details and layout will be updated.');

  return writePdfToFile(doc, filename);
}

async function generateReceiptPdf(order) {
  const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
  const receiptNumber = `RCP-${String(order.id).slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`;
  const filename = `receipt-${receiptNumber}.pdf`;
  const provider = order.provider;

  renderDocumentHeader(doc, 'PAYMENT RECEIPT');
  doc.fontSize(11);
  doc.text(`Receipt #: ${receiptNumber}`);
  doc.text(`Paid on: ${new Date().toLocaleDateString('en-US')}`);
  doc.text(`Service date: ${order.scheduledDate || '—'}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Paid to:');
  doc.font('Helvetica');
  doc.text(provider?.name || 'Provider');
  if (provider?.email) doc.text(provider.email);
  doc.moveDown();

  doc.text(`Property: ${order.property?.name || '—'}`);
  doc.text(`Client total: ${formatUsd(order.totalPrice)}`);
  doc.text(`EB commission (33%): ${formatUsd(order.commissionAmount)}`);
  doc.moveDown();
  doc.font('Helvetica-Bold').text(`Provider payout: ${formatUsd(order.providerPayoutAmount)}`);
  doc.moveDown();
  doc.font('Helvetica').fontSize(9).fillColor('#666666');
  doc.text('Test receipt — payment recorded manually by EB Services admin.');

  return writePdfToFile(doc, filename);
}

module.exports = {
  generateInvoicePdf,
  generateReceiptPdf,
  buildInvoiceNumber,
  FINANCIAL_RELATIVE_PATH,
};
