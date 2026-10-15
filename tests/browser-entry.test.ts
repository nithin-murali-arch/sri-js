import { enforceScriptIntegrity } from '../src/browser';

describe('browser entry', () => {
  it('adds integrity through its only runtime export', () => {
    enforceScriptIntegrity({ 'consumer.js': 'sha384-consumer' });
    const script = document.createElement('script');
    script.src = '/consumer.js';
    expect(script.getAttribute('integrity')).toBe('sha384-consumer');
    expect(script.getAttribute('crossorigin')).toBe('anonymous');
  });
});
