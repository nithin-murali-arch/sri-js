import { SRIGenerator } from '../src/generator';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('SRIGenerator', () => {
  let tempDir: string;
  let generator: SRIGenerator;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = join(tmpdir(), `sri-js-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
    generator = new SRIGenerator({
      algorithm: 'sha384',
      basePath: tempDir
    });
  });

  afterEach(async () => {
    // Clean up test files
    // Note: In a real implementation, you'd want to properly clean up the temp directory
  });

  describe('generateHash', () => {
    it('should generate correct hash for given content', () => {
      const content = Buffer.from('test content');
      const hash = generator.generateHash(content);
      
      expect(hash).toMatch(/^sha384-/);
      expect(hash.length).toBeGreaterThan(10); // Basic length check
    });

    it('should generate different hashes for different content', () => {
      const hash1 = generator.generateHash(Buffer.from('content 1'));
      const hash2 = generator.generateHash(Buffer.from('content 2'));
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateForFile', () => {
    it('should generate hash for a file', async () => {
      const filePath = join(tempDir, 'test.js');
      const content = 'console.log("test");';
      await writeFile(filePath, content);

      const result = await generator.generateForFile(filePath);
      
      expect(result).toHaveProperty('integrity');
      expect(result).toHaveProperty('path', 'test.js');
      expect(result.integrity).toMatch(/^sha384-/);
    });

    it('should throw error for non-existent file', async () => {
      await expect(
        generator.generateForFile('non-existent.js')
      ).rejects.toThrow();
    });
  });

  describe('generateForDirectory', () => {
    it('should generate hashes for all matching files', async () => {
      // Create test files
      const files = [
        { name: 'test1.js', content: 'console.log("test1");' },
        { name: 'test2.js', content: 'console.log("test2");' },
        { name: 'test.css', content: 'body { color: red; }' },
        { name: 'test.txt', content: 'plain text' }
      ];

      for (const file of files) {
        await writeFile(join(tempDir, file.name), file.content);
      }

      const sriMap = await generator.generateForDirectory(tempDir, ['.js', '.css']);
      
      expect(Object.keys(sriMap)).toHaveLength(3); // Should include .js and .css files
      expect(Object.keys(sriMap)).toContain('test1.js');
      expect(Object.keys(sriMap)).toContain('test2.js');
      expect(Object.keys(sriMap)).toContain('test.css');
      expect(Object.keys(sriMap)).not.toContain('test.txt');
    });

    it('should handle empty directory', async () => {
      const sriMap = await generator.generateForDirectory(tempDir, ['.js']);
      expect(sriMap).toEqual({});
    });

    it('should handle non-existent directory', async () => {
      await expect(
        generator.generateForDirectory('non-existent', ['.js'])
      ).rejects.toThrow();
    });
  });
}); 