import type { TargetIn } from '@/lib/api/audits';

export type AuditType = 'tabular-known' | 'tabular-unknown' | 'llm-api';
export type Sector = 'credit' | 'hr' | 'insurance' | 'other';
export type WizardLang = 'fr' | 'en';

export interface UnifiedValues {
  // Step 1
  title: string;
  audit_type: AuditType | '';
  sector: Sector | '';
  // Step 2 — M1/M2: filled by upload handler; M3: filled by inputs
  // dataset_id is held in component state (not the form) since it comes from upload
  // M3 only:
  url: string;
  method: string;
  auth_header: string;
  // Step 3
  decision_column: string;
  favorable_value: string;
  protected_attribute: string;            // M1 only
  privileged_value: string;               // M1 optional
  ground_truth_column: string;            // M1 optional (EO/EOdds)
  secondary_protected_attribute: string;  // M1 optional (intersectionnel)
  preset: string;                          // M3 (openai | custom)
  body_template: string;                   // M3
  response_path: string;                   // M3
  // Step 4
  k: string;                               // M2 (clusters)
  deviation_pp: string;                    // M2
  chi2_alpha: string;                      // M2
  lang: WizardLang;                        // M3
}

export const DEFAULT_VALUES: UnifiedValues = {
  title: '',
  audit_type: '',
  sector: '',
  url: '',
  method: 'POST',
  auth_header: '',
  decision_column: '',
  favorable_value: '',
  protected_attribute: '',
  privileged_value: '',
  ground_truth_column: '',
  secondary_protected_attribute: '',
  preset: 'openai',
  body_template:
    '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"{prompt}"}]}',
  response_path: 'choices.0.message.content',
  k: '',
  deviation_pp: '',
  chi2_alpha: '',
  lang: 'fr',
};

/** Map the user-facing audit_type to the backend module code. */
export function backendModuleFor(t: AuditType): 'M1' | 'M2' | 'M3' {
  if (t === 'tabular-known') return 'M1';
  if (t === 'tabular-unknown') return 'M2';
  return 'M3';
}

export function buildTarget(v: UnifiedValues): TargetIn {
  return {
    url: v.url,
    method: v.method,
    headers: v.auth_header.trim() ? { Authorization: v.auth_header.trim() } : {},
    body_template: v.body_template,
    response_path: v.response_path,
  };
}
