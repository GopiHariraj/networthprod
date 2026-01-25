# Fix Exchange Rate Error

## Quick Fix Steps

### 1. Restart Backend on Server
```bash
# SSH into your server (you're already connected)
cd ~/networth-app-Testing
docker-compose restart backend

# Wait 30 seconds, then check logs
docker-compose logs -f backend
```

### 2. If Still Failing - Check Node Version
The code uses native `fetch()` which requires Node.js 18+

```bash
# Check Node version in Docker
docker-compose exec backend node --version
```

**Expected**: v18.x or higher

### 3. Test Alpha Vantage API Directly
```bash
# Test if API key works
curl "https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=AED&to_currency=USD&apikey=TPVKHORBWQ1ZPWQX"
```

**Expected response**:
```json
{
  "Realtime Currency Exchange Rate": {
    "5. Exchange Rate": "0.27230000"
  }
}
```

## Common Issues

### Issue 1: Backend Not Restarted
**Symptom**: Error says "Failed to update exchange rates"
**Fix**: Run `docker-compose restart backend` on server

### Issue 2: Node.js Too Old
**Symptom**: Error about `fetch is not defined`
**Fix**: Update Dockerfile to use Node 18+

### Issue 3: Network/Firewall
**Symptom**: Timeout or connection refused
**Fix**: Check server can reach alphavantage.co

### Issue 4: API Key Invalid
**Symptom**: Error message from Alpha Vantage
**Fix**: Verify API key is correct

## Temporary Workaround

If you can't fix immediately, the app will use cached rates automatically. Users can still use the app with slightly outdated exchange rates.

## Manual Restart Command

Run this on your server:
```bash
cd ~/networth-app-Testing && docker-compose restart backend && docker-compose logs -f backend
```

Watch for this log message:
```
[ExchangeRateService] Fetching rates from Alpha Vantage for AED to USD,EUR,GBP,INR,SAR
```

If you see "Fetching rates from Gemini" instead, the old code is still running.
