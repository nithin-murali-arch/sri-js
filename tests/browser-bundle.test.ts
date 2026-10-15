import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const bundle = readFileSync(join(__dirname, '..', 'public', 'sri-js.js'), 'utf8');

describe('public/sri-js.js loaded after window.SRI is defined', () => {
  beforeAll(() => {
    (window as any).SRI = {
      config: {
        'app.js': 'sha384-app',
        'legacy.js?v=1': 'sha384-legacy-exact',
      },
    };
    (0, eval)(bundle);
  });

  it('adds integrity and crossorigin to a script created with document.createElement', () => {
    const script = document.createElement('script');
    script.src = '/static/app.js';
    expect(script.getAttribute('integrity')).toBe('sha384-app');
    expect(script.getAttribute('crossorigin')).toBe('anonymous');
  });

  it('matches a src that has a query string', () => {
    const script = document.createElement('script');
    script.src = '/static/app.js?v=2';
    expect(script.getAttribute('integrity')).toBe('sha384-app');
    expect(script.getAttribute('crossorigin')).toBe('anonymous');
  });

  it('matches a src that has a hash', () => {
    const script = document.createElement('script');
    script.src = '/static/app.js#main';
    expect(script.getAttribute('integrity')).toBe('sha384-app');
  });

  it('matches a src whose query string contains a slash', () => {
    const script = document.createElement('script');
    script.src = '/static/app.js?next=/a/b';
    expect(script.getAttribute('integrity')).toBe('sha384-app');
  });

  it('prefers a config key that includes the query string', () => {
    const script = document.createElement('script');
    script.src = '/static/legacy.js?v=1';
    expect(script.getAttribute('integrity')).toBe('sha384-legacy-exact');
  });

  it('leaves a script with no matching key untouched', () => {
    const script = document.createElement('script');
    script.src = '/static/other.js?v=2';
    expect(script.hasAttribute('integrity')).toBe(false);
    expect(script.hasAttribute('crossorigin')).toBe(false);
  });
});
