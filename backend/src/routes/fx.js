import { Router } from 'express';
import { fetchUsdNgnWithFallback, getProviderHealth } from '../services/marketData.js';

export const fxRouter = Router();

fxRouter.get('/usd-ngn', async (_req, res, next) => {
  try {
    const { rate, metadata } = await fetchUsdNgnWithFallback();
    res.json({
      pair: 'USD/NGN',
      rate,
      asOf: new Date().toISOString(),
      provenance: {
        source: metadata.provider,
        fallbackUsed: metadata.fallbackUsed,
        providers: getProviderHealth(),
      },
    });
  } catch (error) {
    next(error);
  }
});
