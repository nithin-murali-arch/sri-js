import * as cheerio from 'cheerio';
import { updateHTML } from '../src/index';

describe('updateHTML', () => {
  it('should update scripts with integrity attributes', () => {
    const html = '<script src="test.js"></script>';
    const config = { 'test.js': 'sha384-test-hash' };
    const updatedHtml = updateHTML(html, config);
    const $ = cheerio.load(updatedHtml);
    const script = $('script[src="test.js"]');
    expect(script.attr('integrity')).toBe('sha384-test-hash');
    expect(script.attr('crossorigin')).toBe('anonymous');
  });

  it('should not update scripts without a matching hash', () => {
    const html = '<script src="unknown.js"></script>';
    const config = { 'test.js': 'sha384-test-hash' };
    const updatedHtml = updateHTML(html, config);
    const $ = cheerio.load(updatedHtml);
    const script = $('script[src="unknown.js"]');
    expect(script.attr('integrity')).toBeUndefined();
  });

  it('should not update scripts without src attribute', () => {
    const html = '<script></script>';
    const config = { 'test.js': 'sha384-test-hash' };
    const updatedHtml = updateHTML(html, config);
    const $ = cheerio.load(updatedHtml);
    const script = $('script');
    expect(script.attr('integrity')).toBeUndefined();
  });

  it('should not overwrite existing integrity attribute', () => {
    const html = '<script src="test.js" integrity="existing"></script>';
    const config = { 'test.js': 'sha384-test-hash' };
    const updatedHtml = updateHTML(html, config);
    const $ = cheerio.load(updatedHtml);
    const script = $('script[src="test.js"]');
    expect(script.attr('integrity')).toBe('existing');
  });

  it('should update only scripts with matching config', () => {
    const html = `
      <script src="test.js"></script>
      <script src="other.js"></script>
      <script src="test2.js"></script>
    `;
    const config = {
      'test.js': 'sha384-hash1',
      'test2.js': 'sha384-hash2',
    };
    const updatedHtml = updateHTML(html, config);
    const $ = cheerio.load(updatedHtml);
    expect($('script[src="test.js"]').attr('integrity')).toBe('sha384-hash1');
    expect($('script[src="test2.js"]').attr('integrity')).toBe('sha384-hash2');
    expect($('script[src="other.js"]').attr('integrity')).toBeUndefined();
  });

  it('should handle script src with query string', () => {
    const html = '<script src="test.js?v=1"></script>';
    const config = { 'test.js?v=1': 'sha384-test-hash' };
    const updatedHtml = updateHTML(html, config);
    const $ = cheerio.load(updatedHtml);
    const script = $('script[src="test.js?v=1"]');
    expect(script.attr('integrity')).toBe('sha384-test-hash');
  });
}); 