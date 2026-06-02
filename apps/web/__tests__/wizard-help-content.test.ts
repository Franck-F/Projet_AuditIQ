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

describe('Unified wizard help entries', () => {
  const UNIFIED_KEYS = [
    'wizard.step1', 'wizard.step1.title', 'wizard.step1.audit_type', 'wizard.step1.sector',
    'wizard.step2', 'wizard.step2.upload', 'wizard.step2.url', 'wizard.step2.auth_header',
    'wizard.step3', 'wizard.step3.decision_column', 'wizard.step3.favorable_value',
    'wizard.step3.protected_attribute', 'wizard.step3.body_template', 'wizard.step3.response_path',
    'wizard.step4', 'wizard.step4.metrics', 'wizard.step4.advanced', 'wizard.step4.test_connection',
    'wizard.step5',
  ];

  it('all unified wizard help keys have entries', () => {
    for (const key of UNIFIED_KEYS) {
      const entry = getHelp(key);
      expect(entry, `missing entry for ${key}`).toBeDefined();
      expect(entry?.title.length).toBeGreaterThan(0);
      expect(entry?.body.length).toBeGreaterThan(0);
    }
  });
});
