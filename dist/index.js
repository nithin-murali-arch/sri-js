import { SRIGenerator } from "./generator";
import * as cheerio from 'cheerio';
export { SRIGenerator };
export function generateSRI(options) {
    return new SRIGenerator(options);
}
/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
export function updateHtmlScripts(html, config, prefix) {
    return updateHTML(html, config, '');
}
/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
export function updateHTML(html, config, prefix) {
    const $ = cheerio.load(html);
    $('script[src]').each((_, element) => {
        const src = $(element).attr('src');
        if (!src || (src && prefix && src.includes(prefix)))
            return;
        const filename = src.split('/').pop() || '';
        const integrity = config[filename];
        if (integrity && !$(element).attr('integrity')) {
            $(element).attr('integrity', integrity);
            $(element).attr('crossorigin', 'anonymous');
        }
    });
    return $.html();
}
