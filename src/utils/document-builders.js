const { EB_COMMISSION_RATE } = require('../config/constants');
const { readSettings } = require('../features/financial-settings/financial-settings.store');
const { formatUsd, roundMoney } = require('./financial');

const CLEANING_TYPE_LABELS = {
  deep: 'Deep Cleaning',
  regular: 'Standard Cleaning',
  post_construction: 'Post-Construction Cleaning',
  move_in: 'Move-In Cleaning',
  move_out: 'Move-Out Cleaning',
  regular_airbnb: 'Regular Airbnb Turnover',
};

function formatUsDate(value) {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getCompanyContext(settings) {
  return {
    companyName: settings.companyName,
    companyEmail: settings.companyEmail,
    companyPhone: settings.companyPhone,
    companyAddress: settings.companyAddress,
    logoUrl: settings.logoUrl || '',
  };
}

function buildPaymentMethods(settings) {
  const methods = [];
  if (settings.zelle) methods.push(`Zelle: ${settings.zelle}`);
  if (settings.venmo) methods.push(`Venmo: ${settings.venmo}`);
  methods.push('Check: Payable to EB Services and Solutions');
  return methods;
}

function getCleaningLabel(cleaningType) {
  return CLEANING_TYPE_LABELS[cleaningType] || 'Professional Cleaning Service';
}

function buildInvoiceLineItems(order) {
  const items = [];
  const hours =
    order.estimatedDurationMinutes != null
      ? roundMoney(Number(order.estimatedDurationMinutes) / 60)
      : 1;
  const basePrice = roundMoney(order.basePrice || 0);
  const baseRate = hours > 0 ? roundMoney(basePrice / hours) : basePrice;

  items.push({
    description: `${getCleaningLabel(order.cleaningType)} — ${order.property?.name || 'Property'}`,
    quantity: hours,
    rate: baseRate,
    total: basePrice,
    rateFormatted: formatUsd(baseRate),
    totalFormatted: formatUsd(basePrice),
  });

  for (const extra of order.extras || []) {
    const total = roundMoney(extra.priceAtTime || extra.serviceExtra?.defaultPrice || extra.price || 0);
    items.push({
      description: `Add-on: ${extra.serviceExtra?.name || extra.name || 'Extra service'}`,
      quantity: 1,
      rate: total,
      total,
      rateFormatted: formatUsd(total),
      totalFormatted: formatUsd(total),
    });
  }

  return items;
}

function buildInvoiceViewModel(order, invoiceNumber) {
  const settings = readSettings();
  const issueDate = new Date();
  const dueDate = addDays(issueDate, Number(settings.invoiceDueDays || 14));
  const client = order.property?.client || {};
  const lineItems = buildInvoiceLineItems(order);
  const subtotal = roundMoney(lineItems.reduce((sum, item) => sum + item.total, 0));
  const discount = roundMoney(order.discountAmount || 0);
  const totalDue = roundMoney(Math.max(0, subtotal - discount));
  const clientContact = [client.phone, client.email].filter(Boolean).join(' · ');

  return {
    ...getCompanyContext(settings),
    documentTitle: 'Invoice',
    invoiceNumber,
    metaRows: [
      { label: 'Invoice #', value: `#${invoiceNumber}` },
      { label: 'Date Issued', value: formatUsDate(issueDate) },
      { label: 'Due Date', value: formatUsDate(dueDate) },
      { label: 'Service Date', value: formatUsDate(order.scheduledDate) },
    ],
    clientName: client.name || 'Client',
    serviceAddress: order.property?.address || order.propertyAddress || '—',
    clientContact,
    lineItems,
    subtotal,
    discount,
    totalDue,
    hasDiscount: discount > 0,
    subtotalFormatted: formatUsd(subtotal),
    discountFormatted: formatUsd(discount),
    totalDueFormatted: formatUsd(totalDue),
    paymentMethods: buildPaymentMethods(settings),
    footerNote:
      settings.invoiceFooter ||
      'Thank you for your business! If you have any questions about this invoice, please contact us.',
  };
}

function buildReceiptViewModel(order, receiptNumber) {
  const settings = readSettings();
  const provider = order.provider || {};
  const commissionRate = Number(order.commissionRate || EB_COMMISSION_RATE);
  const commissionPercent = Math.round(commissionRate * 100);

  return {
    ...getCompanyContext(settings),
    documentTitle: 'Payment Receipt',
    receiptNumber,
    metaRows: [
      { label: 'Receipt #', value: `#${receiptNumber}` },
      { label: 'Date Paid', value: formatUsDate(new Date()) },
      { label: 'Service Date', value: formatUsDate(order.scheduledDate) },
    ],
    providerName: provider.name || 'Provider',
    providerEmail: provider.email || '',
    propertyName: order.property?.name || '—',
    propertyAddress: order.property?.address || '—',
    clientTotalFormatted: formatUsd(order.totalPrice),
    commissionFormatted: formatUsd(order.commissionAmount),
    commissionRatePercent: commissionPercent,
    providerPayoutFormatted: formatUsd(order.providerPayoutAmount),
    footerNote:
      settings.receiptFooter || 'Payment recorded manually by EB Services admin.',
  };
}

function buildContractViewModel(contract, signer = {}, acceptance = null) {
  const settings = readSettings();
  const typeLabels = {
    client_eb: 'Client Services Agreement',
    provider_eb: 'Provider Services Agreement',
  };

  return {
    ...getCompanyContext(settings),
    documentTitle: 'Agreement',
    contractTitle: contract.title,
    contractVersion: contract.version,
    contractTypeLabel: typeLabels[contract.type] || contract.type,
    contractContent: contract.content,
    signerName: signer.name || '—',
    signerEmail: signer.email || '',
    acceptedAt: acceptance?.acceptedAt ? formatUsDate(acceptance.acceptedAt) : null,
    signerIp: acceptance?.ipAddress || null,
    metaRows: [
      { label: 'Document', value: contract.title },
      { label: 'Version', value: `v${contract.version}` },
      { label: 'Issued', value: formatUsDate(contract.updatedAt || contract.createdAt) },
    ],
    footerNote:
      settings.documentDisclaimer ||
      'This agreement is between the signatory and EB Services and Solutions.',
  };
}

module.exports = {
  buildInvoiceViewModel,
  buildReceiptViewModel,
  buildContractViewModel,
  formatUsDate,
};
