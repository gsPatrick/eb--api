const { EB_COMMISSION_RATE } = require('../config/constants');

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function splitOrderFinancials(totalPrice, commissionRate = EB_COMMISSION_RATE) {
  const total = roundMoney(totalPrice);
  const rate = Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : EB_COMMISSION_RATE;
  const commissionAmount = roundMoney(total * rate);
  const providerPayoutAmount = roundMoney(total - commissionAmount);

  return {
    totalPrice: total,
    commissionAmount,
    providerPayoutAmount,
    commissionRate: rate,
  };
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(toNumber(value));
}

module.exports = {
  splitOrderFinancials,
  roundMoney,
  formatUsd,
};
