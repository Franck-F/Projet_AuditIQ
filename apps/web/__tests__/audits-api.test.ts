import { describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ api: { post, get } }));

import { api } from '@/lib/api/client';
import { analyzeDataset, createAudit, fetchAudit, uploadDataset } from '@/lib/api/audits';

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

  it('downloadReport GETs the report as a blob and triggers a save', async () => {
    get.mockClear();
    const blob = new Blob(['x'], { type: 'application/pdf' });
    get.mockResolvedValue({
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="AUD-1.pdf"' },
    });
    const createURL = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:fake');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockReturnValue();
    const { downloadReport } = await import('@/lib/api/audits');

    await downloadReport('aud-1', 'pdf');

    expect(get.mock.calls[0]![0]).toBe('/audits/aud-1/report.pdf');
    expect(get.mock.calls[0]![1]).toMatchObject({ responseType: 'blob' });
    expect(createURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith('blob:fake');
    createURL.mockRestore();
    revoke.mockRestore();
    click.mockRestore();
  });

  it('downloadReport rejects when the request fails', async () => {
    get.mockRejectedValue(new Error('502'));
    const { downloadReport } = await import('@/lib/api/audits');
    await expect(downloadReport('aud-1', 'pdf')).rejects.toThrow();
  });

  it('createAudit sends an M3 body (module M3, target, lang, no dataset)', async () => {
    post.mockClear();
    const out = { id: 'a-m3', module: 'M3', status: 'done' };
    post.mockResolvedValueOnce({ data: out });
    const { createAudit: createAuditM3 } = await import('@/lib/api/audits');
    const res = await createAuditM3({
      title: 'Chatbot RH',
      module: 'M3',
      target: {
        url: 'https://api.example.com/v1',
        method: 'POST',
        headers: { Authorization: 'Bearer X' },
        body_template: '{"messages":[{"role":"user","content":"{prompt}"}]}',
        response_path: 'choices.0.message.content',
      },
      lang: 'fr',
    });
    expect(res).toEqual(out);
    const [url, body] = post.mock.calls.at(-1)!;
    expect(url).toBe('/audits');
    expect(body.module).toBe('M3');
    expect(body.target.url).toBe('https://api.example.com/v1');
    expect(body.lang).toBe('fr');
    expect('dataset_id' in body).toBe(false);
  });

  it('createAudit M1 can include ground_truth_column', async () => {
    const out = { id: 'm1-gt', module: 'M1', status: 'done' };
    post.mockResolvedValueOnce({ data: out });
    await createAudit({
      dataset_id: 'd1', title: 't', protected_attribute: 'genre',
      decision_column: 'embauche', favorable_value: 'oui',
      privileged_value: null, ground_truth_column: 'reel',
    } as Parameters<typeof createAudit>[0]);
    const body = post.mock.calls.at(-1)![1];
    expect(body.ground_truth_column).toBe('reel');
  });

  it('createAudit M1 can include a secondary protected attribute', async () => {
    post.mockResolvedValueOnce({ data: { id: 'm1-x', module: 'M1' } });
    await createAudit({
      dataset_id: 'd1', title: 't', protected_attribute: 'genre',
      decision_column: 'embauche', favorable_value: 'oui',
      privileged_value: null, secondary_protected_attribute: 'origine',
    } as Parameters<typeof createAudit>[0]);
    const body = post.mock.calls.at(-1)![1];
    expect(body.secondary_protected_attribute).toBe('origine');
  });

  it('fetchAudit surfaces a failed audit error', async () => {
    get.mockResolvedValueOnce({ data: {
      id: 'a1', code: null, title: 't', status: 'failed', module: 'M1',
      error: 'compute exploded', metrics: null, interpretation: null,
      pre_check: [], created_at: '2026-05-22T00:00:00Z', completed_at: null,
    } });
    const a = await fetchAudit('a1');
    expect(a.status).toBe('failed');
    expect(a.error).toBe('compute exploded');
  });
});

describe('analyzeDataset', () => {
  it('POSTs to /datasets/:id/analyze and returns the payload', async () => {
    const mock = vi.spyOn(api, 'post').mockResolvedValue({
      data: {
        columns: [
          { name: 'sex', dtype: 'categorical', unique_count: 2, null_ratio: 0, top_values: [['F', 100], ['M', 100]], role_hint: 'protected' },
        ],
        suggested_decision: null,
        suggested_protected: { column: 'sex', confidence: 0.95, reason: 'Nom évocateur', favorable_value: null },
      },
    });
    const out = await analyzeDataset('abc-123');
    expect(mock).toHaveBeenCalledWith('/datasets/abc-123/analyze');
    expect(out.suggested_protected?.column).toBe('sex');
    mock.mockRestore();
  });
});
