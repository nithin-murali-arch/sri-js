import { SRIGenerator } from "./generator";
import { SRIOptions } from "./types";
import { SRIConfig } from './enforceScriptIntegrity';
export { SRIGenerator };
export type { SRIOptions };
export declare function generateSRI(options: SRIOptions): SRIGenerator;
/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
export declare function updateHtmlScripts(html: string, config: SRIConfig): string;
/**
 * Updates script tags in an HTML string with integrity attributes based on the provided configuration.
 *
 * @param html - The HTML string to update.
 * @param config - A map of filenames to their SRI hashes.
 * @returns The updated HTML string.
 */
export declare function updateHTML(html: string, config: SRIConfig): string;
