import * as FileSystem from 'expo-file-system';
import { zip, unzip } from 'react-native-zip-archive';
import { Platform } from 'react-native';

/**
 * Compression Service
 * Handles file compression and decompression for backups
 */
export class CompressionService {
  /**
   * Compress a file using ZIP format
   * @param sourceFile - Path to the source file to compress
   * @param outputFile - Path where the compressed file should be saved (optional)
   * @returns Path to the compressed file
   */
  static async compressFile(sourceFile: string, outputFile?: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        console.log('[Compression] Compression not supported on web, returning original file');
        return sourceFile;
      }

      // Generate output filename if not provided
      if (!outputFile) {
        outputFile = sourceFile.replace(/\.json$/, '.zip');
      }

      console.log('[Compression] Compressing file:', sourceFile);
      console.log('[Compression] Output file:', outputFile);

      // Get file info before compression
      const fileInfo = await FileSystem.getInfoAsync(sourceFile);
      if (!fileInfo.exists) {
        throw new Error('Source file does not exist');
      }

      const originalSize = fileInfo.size || 0;
      console.log(`[Compression] Original file size: ${originalSize} bytes`);

      // Create a temporary directory for the zip contents
      const tempDir = `${FileSystem.cacheDirectory}temp-backup/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });

      // Copy the file to temp directory with a clean name
      const tempFile = `${tempDir}backup.json`;
      await FileSystem.copyAsync({
        from: sourceFile,
        to: tempFile,
      });

      // Compress the temp directory
      await zip(tempDir, outputFile);

      // Clean up temp directory
      await FileSystem.deleteAsync(tempDir, { idempotent: true });

      // Get compressed file info
      const compressedInfo = await FileSystem.getInfoAsync(outputFile);
      const compressedSize = compressedInfo.size || 0;
      const compressionRatio = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

      console.log(`[Compression] Compressed file size: ${compressedSize} bytes`);
      console.log(`[Compression] Compression ratio: ${compressionRatio.toFixed(2)}%`);

      return outputFile;
    } catch (error) {
      console.error('[Compression] Compression failed:', error);
      throw new Error('Failed to compress backup file');
    }
  }

  /**
   * Decompress a ZIP file
   * @param zipFile - Path to the ZIP file to decompress
   * @param outputDir - Directory where the contents should be extracted (optional)
   * @returns Path to the extracted directory
   */
  static async decompressFile(zipFile: string, outputDir?: string): Promise<string> {
    try {
      if (Platform.OS === 'web') {
        console.log('[Compression] Decompression not supported on web');
        throw new Error('Compression not supported on web platform');
      }

      // Generate output directory if not provided
      if (!outputDir) {
        outputDir = `${FileSystem.cacheDirectory}extracted-backup-${Date.now()}/`;
      }

      console.log('[Compression] Decompressing file:', zipFile);
      console.log('[Compression] Output directory:', outputDir);

      // Ensure output directory exists
      await FileSystem.makeDirectoryAsync(outputDir, { intermediates: true });

      // Decompress the file
      await unzip(zipFile, outputDir);

      console.log('[Compression] Decompression complete');

      return outputDir;
    } catch (error) {
      console.error('[Compression] Decompression failed:', error);
      throw new Error('Failed to decompress backup file');
    }
  }

  /**
   * Check if a file is compressed (based on extension)
   * @param filePath - Path to the file
   * @returns True if the file appears to be compressed
   */
  static isCompressed(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.zip');
  }

  /**
   * Get human-readable file size
   * @param bytes - File size in bytes
   * @returns Formatted file size string
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Calculate compression ratio
   * @param originalSize - Original file size in bytes
   * @param compressedSize - Compressed file size in bytes
   * @returns Compression ratio as a percentage (0-100)
   */
  static calculateCompressionRatio(originalSize: number, compressedSize: number): number {
    if (originalSize === 0) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }
}
