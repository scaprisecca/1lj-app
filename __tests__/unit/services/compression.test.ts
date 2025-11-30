import { CompressionService } from '@/services/compression';
import * as FileSystem from 'expo-file-system';
import { zip, unzip } from 'react-native-zip-archive';
import { Platform } from 'react-native';

// Mock dependencies
jest.mock('expo-file-system');
jest.mock('react-native-zip-archive');

describe('CompressionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Platform.OS to default
    Object.defineProperty(Platform, 'OS', {
      writable: true,
      value: 'ios',
    });
  });

  describe('compressFile', () => {
    it('should compress a file successfully', async () => {
      const sourceFile = '/path/to/backup.json';
      const outputFile = '/path/to/backup.zip';

      // Mock file exists check
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 1024,
      });

      // Mock temp directory operations
      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      // Mock zip operation
      (zip as jest.Mock).mockResolvedValue(undefined);

      // Mock compressed file info
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
        exists: true,
        size: 512,
      });

      const result = await CompressionService.compressFile(sourceFile, outputFile);

      expect(result).toBe(outputFile);
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
      expect(FileSystem.copyAsync).toHaveBeenCalled();
      expect(zip).toHaveBeenCalled();
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
    });

    it('should generate output filename if not provided', async () => {
      const sourceFile = '/path/to/backup.json';
      const expectedOutput = '/path/to/backup.zip';

      (FileSystem.getInfoAsync as jest.Mock)
        .mockResolvedValueOnce({ exists: true, size: 1024 })
        .mockResolvedValueOnce({ exists: true, size: 512 });

      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      (zip as jest.Mock).mockResolvedValue(undefined);

      const result = await CompressionService.compressFile(sourceFile);

      expect(result).toBe(expectedOutput);
    });

    it('should return original file on web platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'web',
      });

      const sourceFile = '/path/to/backup.json';
      const result = await CompressionService.compressFile(sourceFile);

      expect(result).toBe(sourceFile);
      expect(zip).not.toHaveBeenCalled();
    });

    it('should throw error if source file does not exist', async () => {
      const sourceFile = '/path/to/nonexistent.json';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false,
      });

      await expect(CompressionService.compressFile(sourceFile)).rejects.toThrow(
        'Failed to compress backup file'
      );
    });

    it('should handle compression errors', async () => {
      const sourceFile = '/path/to/backup.json';

      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024,
      });
      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.copyAsync as jest.Mock).mockResolvedValue(undefined);
      (zip as jest.Mock).mockRejectedValue(new Error('Zip failed'));

      await expect(CompressionService.compressFile(sourceFile)).rejects.toThrow(
        'Failed to compress backup file'
      );
    });
  });

  describe('decompressFile', () => {
    it('should decompress a file successfully', async () => {
      const zipFile = '/path/to/backup.zip';
      const outputDir = '/path/to/extracted/';

      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (unzip as jest.Mock).mockResolvedValue(undefined);

      const result = await CompressionService.decompressFile(zipFile, outputDir);

      expect(result).toBe(outputDir);
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalledWith(outputDir, { intermediates: true });
      expect(unzip).toHaveBeenCalledWith(zipFile, outputDir);
    });

    it('should generate output directory if not provided', async () => {
      const zipFile = '/path/to/backup.zip';

      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (unzip as jest.Mock).mockResolvedValue(undefined);

      const result = await CompressionService.decompressFile(zipFile);

      expect(result).toContain('extracted-backup-');
      expect(FileSystem.makeDirectoryAsync).toHaveBeenCalled();
      expect(unzip).toHaveBeenCalled();
    });

    it('should throw error on web platform', async () => {
      Object.defineProperty(Platform, 'OS', {
        writable: true,
        value: 'web',
      });

      const zipFile = '/path/to/backup.zip';

      await expect(CompressionService.decompressFile(zipFile)).rejects.toThrow(
        'Failed to decompress backup file'
      );
    });

    it('should handle decompression errors', async () => {
      const zipFile = '/path/to/backup.zip';

      (FileSystem.makeDirectoryAsync as jest.Mock).mockResolvedValue(undefined);
      (unzip as jest.Mock).mockRejectedValue(new Error('Unzip failed'));

      await expect(CompressionService.decompressFile(zipFile)).rejects.toThrow(
        'Failed to decompress backup file'
      );
    });
  });

  describe('isCompressed', () => {
    it('should return true for .zip files', () => {
      expect(CompressionService.isCompressed('backup.zip')).toBe(true);
      expect(CompressionService.isCompressed('backup.ZIP')).toBe(true);
      expect(CompressionService.isCompressed('/path/to/backup.zip')).toBe(true);
    });

    it('should return false for non-zip files', () => {
      expect(CompressionService.isCompressed('backup.json')).toBe(false);
      expect(CompressionService.isCompressed('backup.txt')).toBe(false);
      expect(CompressionService.isCompressed('backup')).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(CompressionService.formatFileSize(0)).toBe('0 Bytes');
      expect(CompressionService.formatFileSize(100)).toBe('100.00 Bytes');
      expect(CompressionService.formatFileSize(1024)).toBe('1.00 KB');
      expect(CompressionService.formatFileSize(1048576)).toBe('1.00 MB');
      expect(CompressionService.formatFileSize(1073741824)).toBe('1.00 GB');
    });

    it('should format partial values correctly', () => {
      expect(CompressionService.formatFileSize(1536)).toBe('1.50 KB');
      expect(CompressionService.formatFileSize(2097152)).toBe('2.00 MB');
    });
  });

  describe('calculateCompressionRatio', () => {
    it('should calculate compression ratio correctly', () => {
      expect(CompressionService.calculateCompressionRatio(1000, 500)).toBe(50);
      expect(CompressionService.calculateCompressionRatio(1024, 256)).toBe(75);
      expect(CompressionService.calculateCompressionRatio(2048, 1024)).toBe(50);
    });

    it('should return 0 for original size of 0', () => {
      expect(CompressionService.calculateCompressionRatio(0, 0)).toBe(0);
      expect(CompressionService.calculateCompressionRatio(0, 100)).toBe(0);
    });

    it('should handle negative compression (file grew)', () => {
      expect(CompressionService.calculateCompressionRatio(100, 200)).toBe(-100);
    });

    it('should handle no compression (same size)', () => {
      expect(CompressionService.calculateCompressionRatio(100, 100)).toBe(0);
    });
  });
});
