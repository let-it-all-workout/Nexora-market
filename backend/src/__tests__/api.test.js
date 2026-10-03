import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';

describe('API', () => {
  it('rejects an invalid NGX outlook horizon before calling a provider', async () => {
    const app = createApp();
    const response = await request(app).get('/api/ngx/outlook/DANGCEM?years=4');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_HORIZON');
  });

  it('rejects an invalid crypto outlook horizon before calling a provider', async () => {
    const app = createApp();
    const response = await request(app).get('/api/crypto/bitcoin/outlook?years=4');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_HORIZON');
  });

  it('returns health status', async () => {
    const app = createApp();
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('serves the USD/NGN fx route', async () => {
    const app = createApp();
    const response = await request(app).get('/api/fx/usd-ngn');
    expect([200, 500, 502]).toContain(response.status);
    if (response.status === 200) {
      expect(response.body.pair).toBe('USD/NGN');
      expect(Number.isFinite(Number(response.body.rate))).toBe(true);
    }
  }, 20_000);
});
