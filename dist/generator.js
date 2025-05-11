"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SRIGenerator = void 0;
const node_crypto_1 = require("node:crypto");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
class SRIGenerator {
    constructor(options) {
        this.options = {
            algorithm: options.algorithm || 'sha384',
            basePath: options.basePath || process.cwd(),
        };
    }
    generateHash(content) {
        const hash = (0, node_crypto_1.createHash)(this.options.algorithm);
        hash.update(content);
        return `${this.options.algorithm}-${hash.digest('base64')}`;
    }
    async generateForFile(filePath) {
        const absolutePath = (0, node_path_1.resolve)(this.options.basePath || '', filePath);
        const content = await (0, promises_1.readFile)(absolutePath);
        const integrity = this.generateHash(content);
        return {
            integrity,
            path: (0, node_path_1.basename)(filePath),
        };
    }
    async generateForFiles(filePaths) {
        const results = await Promise.all(filePaths.map(filePath => this.generateForFile(filePath)));
        return results.reduce((map, result) => {
            map[result.path] = result.integrity;
            return map;
        }, {});
    }
    async generateForDirectory(dirPath, extensions = ['.js']) {
        const absolutePath = (0, node_path_1.resolve)(this.options.basePath || '', dirPath);
        const files = await this.findFiles(absolutePath, extensions);
        return this.generateForFiles(files);
    }
    async findFiles(dirPath, extensions) {
        const files = [];
        async function scan(directory) {
            const entries = await (0, promises_1.readdir)(directory, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = (0, node_path_1.join)(directory, entry.name);
                if (entry.isDirectory()) {
                    await scan(fullPath);
                }
                else if (entry.isFile() && extensions.includes((0, node_path_1.extname)(entry.name))) {
                    files.push((0, node_path_1.relative)(process.cwd(), fullPath));
                }
            }
        }
        await scan(dirPath);
        return files;
    }
}
exports.SRIGenerator = SRIGenerator;
