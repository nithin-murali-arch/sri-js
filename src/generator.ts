import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative, extname, join, basename } from "node:path";
import { SRIOptions, SRIResult, SRIMap } from "./types";

export class SRIGenerator {
  private options: SRIOptions;

  constructor(options: SRIOptions) {
    this.options = {
      algorithm: options.algorithm || "sha384",
      basePath: options.basePath || process.cwd(),
    };
  }

  public generateHash(content: Buffer): string {
    const hash = createHash(this.options.algorithm);
    hash.update(content);
    return `${this.options.algorithm}-${hash.digest("base64")}`;
  }

  public async generateForFile(filePath: string): Promise<SRIResult> {
    const absolutePath = resolve(this.options.basePath, filePath);
    const content = await readFile(absolutePath);
    const integrity = this.generateHash(content);

    return {
      integrity,
      path: basename(filePath),
    };
  }

  public async generateForFiles(filePaths: string[]): Promise<SRIMap> {
    const results = await Promise.all(
      filePaths.map((filePath) => this.generateForFile(filePath)),
    );

    return results.reduce((map, result) => {
      map[result.path] = result.integrity;
      return map;
    }, {} as SRIMap);
  }

  public async generateForDirectory(
    extensions: string[] = [".js"],
  ): Promise<SRIMap> {
    const files = await this.findFiles(this.options.basePath, extensions);
    return this.generateForFiles(files);
  }

  private async findFiles(
    dirPath: string,
    extensions: string[],
  ): Promise<string[]> {
    const files: string[] = [];
    const basePath = this.options.basePath;
    async function scan(directory: string) {
      const entries = await readdir(directory, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && extensions.includes(extname(entry.name))) {
          files.push(relative(basePath, fullPath));
        }
      }
    }
    await scan(dirPath);
    return files;
  }
}
