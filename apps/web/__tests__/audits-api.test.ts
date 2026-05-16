import { describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { post, get } }));

import { createAudit, fetchAudit, uploadDataset } from '@/lib/api/audits';

describe('audits api', () => {
  it('uploads a dataset as multipart to /datasets', async () => {
    post.mockResolvedValue({ data: { id: 'd1', columns: ['genre'] } });
    const file = new File(['genre,decision\nH,oui\n'], 'd.csv', {
      type: 'text/csv',
    });
    const out = await uploadDataset(file);
    expect(out.id).toBe('d1');
    const [url, body] = post.mock.calls[0]!;
    expect(url).toBe('/datasets');
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get('file')).toBe(file);
  });

  it('creates an audit via POST /audits', async () => {
    post.mockResolvedValue({ data: { id: 'a1', status: 'done' } });
    const out = await createAudit({
      dataset_id: 'd1',
      title: 'R',
      protected_attribute: 'genre',
      decision_column: 'decision',
      favorable_value: 'oui',
      privileged_value: null,
    });
    expect(out.id).toBe('a1');
    expect(post).toHaveBeenLastCalledWith('/audits', {
      dataset_id: 'd1',
      title: 'R',
      protected_attribute: 'genre',
      decision_column: 'decision',
      favorable_value: 'oui',
      privileged_value: null,
    });
  });

  it('fetches an audit via GET /audits/{id}', async () => {
    get.mockResolvedValue({ data: { id: 'a1' } });
    const out = await fetchAudit('a1');
    expect(out.id).toBe('a1');
    expect(get).toHaveBeenCalledWith('/audits/a1');
  });

  it('posts an M2 audit body (module + config) to /audits', async () => {
    post.mockResolvedValue({ data: { id: 'aud-m2', module: 'M2' } });
    const { createAudit } = await import('@/lib/api/audits');
    await createAudit({
      dataset_id: 'd1',
      title: 'Détection',
      module: 'M2',
      decision_column: 'embauche',
      favorable_value: 'oui',
      config: { k: 3, deviation_pp: 25 },
    });
    expect(post.mock.calls[2]![0]).toBe('/audits');
    expect(post.mock.calls[2]![1]).toMatchObject({
      module: 'M2',
      decision_column: 'embauche',
      config: { k: 3, deviation_pp: 25 },
    });
  });
});
