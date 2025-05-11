import { SRIOptions, SRIResult, SRIMap } from './types';
export declare class SRIGenerator {
    private options;
    constructor(options: SRIOptions);
    generateHash(content: Buffer): string;
    generateForFile(filePath: string): Promise<SRIResult>;
    generateForFiles(filePaths: string[]): Promise<SRIMap>;
    generateForDirectory(dirPath: string, extensions?: string[]): Promise<SRIMap>;
    private findFiles;
}
