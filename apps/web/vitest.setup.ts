import '@testing-library/jest-dom/vitest';

// JSDOM does not implement URL.createObjectURL / revokeObjectURL.
// Stub them so vi.spyOn can intercept them in tests.
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => '';
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => undefined;
}
