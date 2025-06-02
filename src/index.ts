import { SRIGenerator } from "./generator";
import { SRIOptions } from "./types";
import * as cheerio from 'cheerio';
import { SRIConfig } from './enforceScriptIntegrity';

export { SRIGenerator };
export type { SRIOptions };

export function generateSRI(options: SRIOptions): SRIGenerator {
  return new SRIGenerator(options);
}

/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
export function updateHtmlScripts(html: string, config: SRIConfig, prefix:string): string {
  return updateHTML(html, config, prefix);
}

/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
export function updateHTML(html: string, config: SRIConfig, prefix: string): string {
  const $ = cheerio.load(html);
  $('script[src]').each((_, element) => {
    const src = $(element).attr('src');
    if (!src || (src && prefix && src.includes(prefix))) return;

    const filename = src.split('/').pop() || '';
    const integrity = config[filename];
    if (integrity && !$(element).attr('integrity')) {
      $(element).attr('integrity', integrity);
      $(element).attr('crossorigin', 'anonymous');
    }
  });
  return $.html();
}
