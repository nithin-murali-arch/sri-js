import { SRIMap } from './types';
/**
 * Finds the integrity hash for a script URL. The exact last path segment wins
 * (so a key like "app.js?v=1" still works); otherwise the segment is looked up
 * with its query string and hash removed.
 */
export declare function findIntegrity(config: SRIMap, src: string): string | undefined;
/**
 * Enforces Subresource Integrity (SRI) for script elements by adding integrity attributes
 * based on the provided configuration map.
 *
 * @param config - A map of script paths to their integrity hashes
 * @param prefix - Optional path prefix to match against script URLs
 */
export declare function enforceScriptIntegrity(config: SRIMap, prefix?: string): void;
export type SRIConfig = SRIMap;
