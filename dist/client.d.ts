import { SRIMap } from './types';
declare global {
    interface Window {
        SRI: {
            config: {
                [key: string]: string;
            };
        };
        __SRI_MAP__: SRIMap;
    }
}
export declare function enforceSRI(sriMap: SRIMap): void;
export declare class SRIEnforcer {
    private observer;
    private config;
    constructor(config: {
        [key: string]: string;
    });
    private initialize;
    private processExistingScripts;
    private handleMutations;
    private processScript;
}
