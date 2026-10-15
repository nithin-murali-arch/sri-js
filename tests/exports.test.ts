/**
 * @jest-environment node
 */
import * as sri from '../src/index';

describe('package entry point in a Node environment with no document', () => {
  it('exports the documented functions and classes', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof sri.updateHTML).toBe('function');
    expect(typeof sri.updateHtmlScripts).toBe('function');
    expect(typeof sri.generateSRI).toBe('function');
    expect(typeof sri.SRIGenerator).toBe('function');
    expect(typeof sri.enforceScriptIntegrity).toBe('function');
  });
});
