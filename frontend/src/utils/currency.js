export const CURRENCY_SYMBOLS = {
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'INR': '₹',
  'AUD': 'A$',
  'CAD': 'C$',
  'JPY': '¥'
};

export const getCurrencySymbol = (currencyCode) => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode || '₹';
};
