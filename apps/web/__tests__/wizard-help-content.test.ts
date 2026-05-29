import { describe, it, expect } from 'vitest';

import {
  GLOSSARY,
  STEP_HELP,
  getHelp,
} from '@/lib/wizard/help-content';

describe('help-content', () => {
  it('exports STEP_HELP as a record', () => {
    expect(typeof STEP_HELP).toBe('object');
    expect(STEP_HELP).not.toBeNull();
  });

  it('exports GLOSSARY with at least one term', () => {
    expect(Object.keys(GLOSSARY).length).toBeGreaterThan(0);
  });

  it('getHelp returns the entry for a known key', () => {
    const entry = getHelp('canary.test');
    expect(entry).toBeDefined();
    expect(entry?.title).toBe('Canary');
  });

  it('getHelp returns undefined for an unknown key', () => {
    expect(getHelp('not.a.real.key')).toBeUndefined();
  });

  it('GLOSSARY entries are non-empty strings', () => {
    for (const [term, def] of Object.entries(GLOSSARY)) {
      expect(typeof term).toBe('string');
      expect(term.length).toBeGreaterThan(0);
      expect(typeof def).toBe('string');
      expect(def.length).toBeGreaterThan(0);
    }
  });
});
