# Currency Conversion Debug Guide

## Quick Check Steps

### 1. Check if exchange rates are loaded
Open browser console on the app and run:
```javascript
// Check if rates are loaded
const rates = JSON.parse(localStorage.getItem('exchangeRates') || '{}');
console.log('Exchange Rates:', rates);
```

### 2. Check asset data
In the Stocks or Depreciating Assets page, open console and check:
```javascript
// For debugging - check what data is returned
console.log('Asset data:', data.assets.stocks.items || data.assets.depreciatingAssets.items);
```

### 3. Test conversion manually
```javascript
// Test if convert function works
// In browser console where the app is running
```

## Common Issues

### Issue 1: Exchange rates not loaded
**Symptom**: Values appear the same regardless of currency selection
**Fix**: Backend `/exchange-rates` endpoint needs to be working

### Issue 2: Currency field not in database
**Symptom**: `asset.currency` or `asset.purchaseCurrency` is undefined
**Fix**: Database may need migration or existing records don't have currency set

### Issue 3: Wrong field name
**Stocks**: Use `asset.currency`
**Depreciating Assets**: Use `asset.purchaseCurrency`

## Testing

### Add test asset with specific currency:
1. Go to Stocks page
2. Add stock with USD currency
3. Purchase price: 100 USD
4. Set profile currency to AED
5. Expected display: ~367 AED (at current rate)

### Check backend response:
```bash
# Check if currency is returned
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/stock-assets
```
