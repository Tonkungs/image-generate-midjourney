import * as fs from 'fs';
import Units from "./image_downloader";
import { promisify } from 'util';
import path from 'path';
import Utils from './image_downloader';
// Promisified versions of fs functions
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

interface FileInfo {
  name: string;
  nameWithMime: string;
  path: string;
  content: string;
  size: number;
  extension: string;
  createdAt: Date;
  modifiedAt: Date;
  lineCount: number;         // เพิ่มจำนวนบรรทัด
  emptyLineCount: number;    // เพิ่มจำนวนบรรทัดว่าง
  codeLineCount: number;     // เพิ่มจำนวนบรรทัดที่มีโค้ด
}


interface DirectoryReaderOptions {
  recursive?: boolean;
  extensions?: string[];
  encoding?: BufferEncoding;
}

interface IConfigManager {
  file: string;
  line: number,
  previousfile: string[]
}

export class ConfigManager {
  private configPath: string;
  private config: IConfigManager;
  private files: FileInfo[] = [];
  private options: Required<DirectoryReaderOptions>;
  private promtPath: string;
  private imageFolder: string = ''
  private rootImageFolder: string ;
  constructor (configPath: string, promtPath: string, dir: string, options: DirectoryReaderOptions = {}) {
    this.configPath = configPath;
    this.promtPath = promtPath;
    this.rootImageFolder = path.join(dir, 'images')
    this.imageFolder = path.join(dir, 'images')

    this.config = { file: '', line: 0, previousfile: [] }; // Default values
    this.options = {
      recursive: options.recursive ?? false,
      extensions: options.extensions ?? ['.txt'],
      encoding: options.encoding ?? 'utf8'
    };

    this.loadConfig(); // Load the config when the class is instantiated


  }

  // Method to load the config from the file
  private loadConfig(): void {
    try {

      if (!Units.fileExists(this.configPath)) {
        throw new Error(`File not found at ${this.configPath}`);
      }

      const data = fs.readFileSync(this.configPath, 'utf-8');
      const lines = data.split(/\r?\n/);
      lines.forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
          if (key.trim() === 'file') {
            this.config.file = value.trim();
            this.imageFolder = path.join(this.imageFolder, value.trim().split('.')[0]);
            Utils.ensureDirectoryExists(path.join( this.imageFolder, 'mock.txt'));
          } else if (key.trim() === 'line') {
            this.config.line = parseInt(value.trim(), 10);
          } else if (key.trim() === 'previousfile') {
            this.config.previousfile = value.trim().split(',');
          }
        }
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error("Error reading config file: " + error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  // Method to save the config back to the file
  public saveConfig(): void {
    try {
      const data = `file=${this.config.file}\nline=${this.config.line}\npreviousfile=${this.config.previousfile.join(',')}`;
      fs.writeFileSync(this.configPath, data, 'utf-8');
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error("Error reading config file: " + error.message);
      } else {
        console.error('An unknown error occurred');
      }
    }
  }

  // Method to get the current configuration
  public getConfig(): IConfigManager {
    return this.config;
  }

  public getImagePath(): string {
    return this.imageFolder 
  }

  // Method to update the file and line values
  public nextLile(line: number): void {
    this.config.line = line;
  }

  public nextFile(): void {
    const listFiles = this.readDirectorySync(this.promtPath);
    const fileResult = listFiles.find(file => file.nameWithMime == this.config.file)
    
    if (!!fileResult && fileResult.codeLineCount != this.config.line) {
      throw new Error("File is not complete");
    }

    // Get All list files
    const files = listFiles.filter(file => !this.config.previousfile.includes(file.nameWithMime))
      .filter(file => file.nameWithMime != this.config.file)
      .filter(file => file.size != 0);
    if (files.length == 0) {
      throw new Error("No more files");
    }

    const fileFirst = files[0];
    const pathFileCurrent = path.join(this.rootImageFolder, fileFirst.name)
    // Create Folder
    Utils.ensureDirectoryExists(path.join( pathFileCurrent, 'mock.txt'));

    this.imageFolder = pathFileCurrent

    // Check push duplicate file
    const isNotExisting = this.config.previousfile.find(file => file != this.config.file);
    if (isNotExisting) {
      this.config.previousfile.push(this.config.file);
    }

    this.config.file =  fileFirst.nameWithMime
    this.config.line = 0;
  }
  // Read Directory

  /**
       * อ่านไฟล์ทั้งหมดในไดเรกทอรี่แบบ async
       * @param dirPath - พาธของไดเรกทอรี่
       * @returns Promise with array of FileInfo objects
       */
  public async readDirectory(dirPath: string): Promise<FileInfo[]> {
    this.files = [];
    await this.processDirectory(dirPath);
    return this.files;
  }

  /**
  * อ่านไฟล์ทั้งหมดในไดเรกทอรี่แบบ sync
  * @param dirPath - พาธของไดเรกทอรี่
  * @returns Array of FileInfo objects
  */
  public readDirectorySync(dirPath: string): FileInfo[] {
    this.files = [];
    this.processDirectorySync(dirPath);
    return this.files;
  }

  /**
  * ตั้งค่าตัวกรองนามสกุลไฟล์
  * @param extensions - อาร์เรย์ของนามสกุลไฟล์ (เช่น ['.txt', '.md'])
  */
  public setExtensions(extensions: string[]): void {
    this.options.extensions = extensions;
  }

  /**
  * ตั้งค่าการอ่านแบบ recursive
  * @param recursive - true เพื่ออ่านซับไดเรกทอรี่
  */
  public setRecursive(recursive: boolean): void {
    this.options.recursive = recursive;
  }

  /**
  * ตั้งค่าการเข้ารหัสไฟล์
  * @param encoding - การเข้ารหัสที่ต้องการใช้
  */
  public setEncoding(encoding: BufferEncoding): void {
    this.options.encoding = encoding;
  }

  /**
  * กรองไฟล์ตามขนาด
  * @param maxSize - ขนาดไฟล์สูงสุด (bytes)
  * @returns Array of FileInfo objects
  */
  public filterBySize(maxSize: number): FileInfo[] {
    return this.files.filter(file => file.size <= maxSize);
  }

  /**
    * กรองไฟล์ตามจำนวนบรรทัด
    * @param maxLines - จำนวนบรรทัดสูงสุด
    * @returns Array of FileInfo objects
    */
  public filterByLineCount(maxLines: number): FileInfo[] {
    return this.files.filter(file => file.lineCount <= maxLines);
  }

  /**
   * กรองไฟล์ตามจำนวนบรรทัดโค้ด
   * @param maxCodeLines - จำนวนบรรทัดโค้ดสูงสุด
   * @returns Array of FileInfo objects
   */
  public filterByCodeLineCount(maxCodeLines: number): FileInfo[] {
    return this.files.filter(file => file.codeLineCount <= maxCodeLines);
  }


  /**
  * กรองไฟล์ตามวันที่แก้ไข
  * @param date - วันที่ต้องการกรอง
  * @returns Array of FileInfo objects
  */
  public filterByModifiedDate(date: Date): FileInfo[] {
    return this.files.filter(file => file.modifiedAt >= date);
  }

  private async processDirectory(currentPath: string): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && this.options.recursive) {
        await this.processDirectory(fullPath);
        continue;
      }

      if (entry.isFile()) {
        await this.processFile(entry, fullPath);
      }
    }
  }

  private processDirectorySync(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory() && this.options.recursive) {
        this.processDirectorySync(fullPath);
        continue;
      }

      if (entry.isFile()) {
        this.processFileSync(entry, fullPath);
      }
    }
  }

  /**
    * นับจำนวนบรรทัดในเนื้อหาไฟล์
    * @param content - เนื้อหาไฟล์
    * @returns object containing line counts
    */
  private countLines(content: string): {
    total: number;
    empty: number;
    code: number;
  } {
    const lines = content.split('\n');
    const empty = lines.filter(line => line.trim() === '').length;
    const code = lines.filter(line => {
      const trimmed = line.trim();
      // ไม่นับบรรทัดว่างและบรรทัดที่เป็น comment
      return trimmed !== '' &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !trimmed.startsWith('*') &&
        !trimmed.startsWith('#');
    }).length;

    return {
      total: lines.length,
      empty,
      code
    };
  }

  private async processFile(entry: fs.Dirent, fullPath: string): Promise<void> {
    const extension = path.extname(entry.name).toLowerCase();

    if (this.shouldProcessFile(extension)) {
      const stats = await stat(fullPath);
      const content = await readFile(fullPath, this.options.encoding);
      const lineCounts = this.countLines(content);

      this.files.push(this.createFileInfo(entry, fullPath, stats, content, lineCounts));
    }
  }

  private processFileSync(entry: fs.Dirent, fullPath: string): void {
    const extension = path.extname(entry.name).toLowerCase();

    if (this.shouldProcessFile(extension)) {
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, this.options.encoding);
      const lineCounts = this.countLines(content);
      this.files.push(this.createFileInfo(entry, fullPath, stats, content, lineCounts));
    }
  }

  private shouldProcessFile(extension: string): boolean {
    return this.options.extensions.length === 0 ||
      this.options.extensions.includes(extension);
  }

  private createFileInfo(
    entry: fs.Dirent,
    fullPath: string,
    stats: fs.Stats,
    content: string,
    lineCounts: { total: number; empty: number; code: number; }
  ): FileInfo {
    return {
      name: entry.name.split('.')[0],
      nameWithMime: entry.name,
      path: fullPath,
      content,
      size: stats.size,
      extension: path.extname(entry.name).toLowerCase(),
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      lineCount: lineCounts.total,
      emptyLineCount: lineCounts.empty,
      codeLineCount: lineCounts.code
    };
  }

}
