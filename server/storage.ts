import fs from 'fs';
import path from 'path';

export interface StoredAsset {
  id: string;
  name: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  type: 'video' | 'clip' | 'audio' | 'transcript' | 'image';
  createdAt: string;
  url: string;
  duration?: number;
  width?: number;
  height?: number;
  aspect?: string;
  metadata?: Record<string, any>;
}

export class StorageService {
  private uploadsDir: string;
  private processedDir: string;
  private assetsDbFile: string;

  constructor(rootDir: string = process.cwd()) {
    this.uploadsDir = path.join(rootDir, 'uploads');
    this.processedDir = path.join(rootDir, 'processed');
    this.assetsDbFile = path.join(rootDir, 'uploads', 'assets_manifest.json');
    this.ensureDirs();
  }

  private ensureDirs() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.processedDir)) {
      fs.mkdirSync(this.processedDir, { recursive: true });
    }
    if (!fs.existsSync(this.assetsDbFile)) {
      fs.writeFileSync(this.assetsDbFile, JSON.stringify([]), 'utf-8');
    }
  }

  public getUploadsDir(): string {
    return this.uploadsDir;
  }

  public getProcessedDir(): string {
    return this.processedDir;
  }

  public getAllAssets(): StoredAsset[] {
    try {
      if (!fs.existsSync(this.assetsDbFile)) return [];
      const content = fs.readFileSync(this.assetsDbFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  public getAsset(id: string): StoredAsset | undefined {
    const assets = this.getAllAssets();
    return assets.find(a => a.id === id);
  }

  public getAssetByFilename(filename: string): StoredAsset | undefined {
    const assets = this.getAllAssets();
    return assets.find(a => a.filename === filename);
  }

  public saveAsset(asset: StoredAsset): StoredAsset {
    const assets = this.getAllAssets();
    const existingIndex = assets.findIndex(a => a.id === asset.id);
    if (existingIndex >= 0) {
      assets[existingIndex] = asset;
    } else {
      assets.unshift(asset);
    }
    fs.writeFileSync(this.assetsDbFile, JSON.stringify(assets, null, 2), 'utf-8');
    return asset;
  }

  public deleteAsset(id: string): boolean {
    const assets = this.getAllAssets();
    const target = assets.find(a => a.id === id);
    if (!target) return false;

    // Remove file if exists
    const filePath = path.join(this.uploadsDir, target.filename);
    const procPath = path.join(this.processedDir, target.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(procPath)) fs.unlinkSync(procPath);

    const filtered = assets.filter(a => a.id !== id);
    fs.writeFileSync(this.assetsDbFile, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }

  public getFilePath(filename: string): string | null {
    const uploadPath = path.join(this.uploadsDir, filename);
    if (fs.existsSync(uploadPath)) return uploadPath;
    const procPath = path.join(this.processedDir, filename);
    if (fs.existsSync(procPath)) return procPath;
    return null;
  }
}

export const storage = new StorageService();
