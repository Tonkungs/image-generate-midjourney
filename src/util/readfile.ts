import * as fs from 'fs';
import * as path from 'path';
import * as csvWriter from 'csv-writer';
import { parse } from 'csv-parse';

export interface IFileData {
  filename: string;
  filepath: string;
}
export default class ReadFile {
  private folderPath: string;

  constructor (folderPath: string) {
    this.folderPath = folderPath;
  }

  // 1. Function to read all files from a folder
  // public readFilesFromFolder(): { filename: string, filepath: string }[] {
  //   const files = fs.readdirSync(this.folderPath);
  //   const fileData = files.map(file => {
  //     const filePath = path.join(this.folderPath, file);
  //     return { filename: file, filepath: filePath };
  //   });

  //   return fileData;
  // }
  public readFilesFromFolder(allowedExtensions: string[] = ['.jpg', '.png', '.gif']): IFileData[] {
    const files = fs.readdirSync(this.folderPath);
    const fileData = files
      .filter(file => {
        const ext = path.extname(file);
        return allowedExtensions.length === 0 || allowedExtensions.includes(ext);
      })
      .map(file => {
        const filePath = path.join(this.folderPath, file);
        return { filename: file, filepath: filePath };
      });

    return fileData;
  }

  // 2. Function to save data to a CSV file
  public async saveToCsv(filePath: string, data: {
    filename: string,
    title: string,
    keyword: string,
    category: string,
    release: string
  }):Promise<void> {
    
    const fileExists = fs.existsSync(filePath);

    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'filename', title: 'Filename' },
        { id: 'title', title: 'Title' },
        { id: 'title', title: 'Description' },
        { id: 'keyword', title: 'Keywords' },
        { id: 'category', title: 'Category' },
        { id: 'release', title: 'Release(s)' },
      ],
      append: fileExists, // Append to file if it exists
    });

    await writer.writeRecords([data]);

  }

  public async readCSV(filePath: string): Promise<string[][]> {
    const data: string[][] = [];

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parser = parse(fileContent, {
        columns: false,        // ไม่ต้องระบุชื่อคอลัมน์
        skip_empty_lines: true, // ข้ามบรรทัดว่าง
        quote: '"',            // รองรับเครื่องหมายคำพูด
      });

      for await (const row of parser) {
        data.push(row);
      }

      return data;
    } catch (error) {
      console.error(`Error reading CSV file: ${error}`);
      // throw error;
      return []
    }
  }
}

// // Example usage:
// const folderPath = './your-folder-path';
// const outputCsvPath = './output.csv';
// const fileManager = new FileManager(folderPath);

// const files = fileManager.readFilesFromFolder();
// fileManager.saveToCsv(outputCsvPath, files);
