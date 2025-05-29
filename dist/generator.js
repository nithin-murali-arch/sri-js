var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { resolve, relative, extname, join, basename } from "node:path";
export class SRIGenerator {
    constructor(options) {
        this.options = {
            algorithm: options.algorithm || "sha384",
            basePath: options.basePath || process.cwd(),
        };
    }
    generateHash(content) {
        const hash = createHash(this.options.algorithm);
        hash.update(content);
        return `${this.options.algorithm}-${hash.digest("base64")}`;
    }
    generateForFile(filePath) {
        return __awaiter(this, void 0, void 0, function* () {
            const absolutePath = resolve(this.options.basePath, filePath);
            const content = yield readFile(absolutePath);
            const integrity = this.generateHash(content);
            return {
                integrity,
                path: basename(filePath),
            };
        });
    }
    generateForFiles(filePaths) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = yield Promise.all(filePaths.map((filePath) => this.generateForFile(filePath)));
            return results.reduce((map, result) => {
                map[result.path] = result.integrity;
                return map;
            }, {});
        });
    }
    generateForDirectory() {
        return __awaiter(this, arguments, void 0, function* (extensions = [".js"]) {
            const files = yield this.findFiles(this.options.basePath, extensions);
            return this.generateForFiles(files);
        });
    }
    findFiles(dirPath, extensions) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = [];
            const basePath = this.options.basePath;
            function scan(directory) {
                return __awaiter(this, void 0, void 0, function* () {
                    const entries = yield readdir(directory, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = join(directory, entry.name);
                        if (entry.isDirectory()) {
                            yield scan(fullPath);
                        }
                        else if (entry.isFile() && extensions.includes(extname(entry.name))) {
                            files.push(relative(basePath, fullPath));
                        }
                    }
                });
            }
            yield scan(dirPath);
            return files;
        });
    }
}
