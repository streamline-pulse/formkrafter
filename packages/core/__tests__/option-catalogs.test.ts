import { describe, expect, test } from 'bun:test';
import { FetchOptionSourceService } from '../lib/services/option_source_service';

describe('FetchOptionSourceService.listCatalogs', () => {
  test('lists the catalogs from baseUrl ({ data: [...] } or an array), once', async () => {
    const calls: string[] = [];
    const service = new FetchOptionSourceService({
      baseUrl: '/api/options',
      fetch: (async (url: string) => {
        calls.push(url);
        return new Response(
          JSON.stringify({ data: [{ ref: 'towns', name: 'Villes', filters: ['country', 'region'] }, { value: 'nationalities', label: 'Nationalités' }, { name: 'sans ref' }] })
        );
      }) as typeof fetch,
    });
    expect(await service.listCatalogs()).toEqual([
      { ref: 'towns', label: 'Villes', filters: ['country', 'region'] },
      { ref: 'nationalities', label: 'Nationalités' },
    ]);
    await service.listCatalogs();
    expect(calls).toEqual(['/api/options']);
  });

  test('without baseUrl nor catalogsUrl: no catalog', async () => {
    expect(await new FetchOptionSourceService().listCatalogs()).toEqual([]);
  });
});
