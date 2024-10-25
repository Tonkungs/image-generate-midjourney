import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
class Units {

  // Function to check if the file already exists
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  // Function to check if a directory exists, and if not, create it
  ensureDirectoryExists(filePath: string): void {
    const dir = path.dirname(filePath);
   
    if (!this.fileExists(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Directory ${dir} created.`);
    }
  }



  // Function to download an image from a given URL
  async downloadImage(url: string, filepath: string, duplicateSkip: boolean = true): Promise<void> {
    // Ensure the directory exists
    this.ensureDirectoryExists(filepath);

    // Skip downloading if the file already exists
    if (this.fileExists(filepath) && duplicateSkip) {
      // console.log(`File already exists at ${filepath}, skipping download.`);
      return;
    }

    const writer = fs.createWriteStream(filepath);

    try {
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
      });

      // Pipe the response stream to the file system
      response.data.pipe(writer);

      // Return a promise to wait until the file has been written
      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading the image:', error);
      throw error

    }
  }

  // Function to delete an image
  deleteImage(filePath: string): void {
    if (this.fileExists(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`File deleted at ${filePath}`);
      } catch (error) {
        console.error('Error deleting the image:', error);
        throw error
      }
    } else {
      console.log(`File not found at ${filePath}, nothing to delete.`);
    }
  }

  readFileSync = (filePath: string): string[] => {
    if (!this.fileExists(filePath)) {
      throw new Error(`File not found at ${filePath}`);
    }
    try {
       // Read the file content synchronously
       const data = fs.readFileSync(filePath, 'utf-8');
       return data.split(/\r?\n/);
    } catch (error) {
      throw new Error(`Error reading file from disk: ${error}`);
    }
  };

  processString(input: string): string {
    // Step 1: Split ด้วย '_'
    const parts = input.split('_');
  
    // Step 2: เอาส่วนสุดท้าย (ซึ่งเป็นชื่อไฟล์)
    const lastPart = parts[parts.length - 1];
  
    // Step 3: Split ด้วย '.png' เพื่อแยกชื่อไฟล์และนามสกุล
    const [fileName] = lastPart.split('.png');
  
    return fileName; // คืนค่าเฉพาะส่วนของชื่อไฟล์ (ไม่มีนามสกุล)
  }

}

export default new Units()
// // Example usage
// const imageDownloader = new ImageDownloader();
// const imageUrl = 'https://example.com/image.jpg';  // Replace with actual image URL
// const outputFilePath = path.join(__dirname, 'downloaded_image.jpg');

// imageDownloader.downloadImage(imageUrl, outputFilePath)
//   .then(() => console.log('Image downloaded successfully!'))
//   .catch(error => console.error('Download failed:', error));
