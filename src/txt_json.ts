import * as fs from 'fs';
import * as path from 'path';
import {ImageType} from './adobe_stock';
import { IDataPromt } from './util/data_handler';

export default class TxtJSON {
  filePath: string;

  constructor (filePath: string) {
    this.filePath = filePath;
  }

  // ฟังก์ชันในการอ่านไฟล์ .txt และแปลงข้อมูลเป็น JSON
  readFileAndConvertToJson(): ImageType[] | undefined {
    try {
      // อ่านไฟล์ .txt
      const fileContent = fs.readFileSync(this.filePath, 'utf-8');

      // แยกข้อความในไฟล์ตามบรรทัด
      const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log(lines.length);
     
  
      const jsonResults = lines.map((line, index) => ({
        Round: index + 1,
        ImageUrl: "",
        Title: line,  // ใช้บรรทัดแรกเป็น Title
        Stage: "START",         // ค่าเริ่มต้นของ Stage
        SeedID: "", // ใช้บรรทัดที่สองเป็น SeedID
      }))

      let newfilter: ImageType[] = []
      jsonResults.map((item,index) => {
  
        const findFound = newfilter.findIndex(itemIN=>itemIN.Title === item.Title)
        if (findFound == -1) {
          newfilter.push({
            ...item,
            Round: index+1
          })
        }
      })

      return newfilter as ImageType[]
    } catch (error) {
      console.error('Error reading or parsing file:', error);
    }
  }

  // ฟังก์ชันในการบันทึก JSON ไปยังไฟล์
  saveJsonToFile(jsonData: any, outputPath: string): void {
    try {
      // บันทึกข้อมูล JSON ไปยังไฟล์
      fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2), 'utf-8');
      console.log(`Data has been saved to ${outputPath}`);
    } catch (error) {
      console.error('Error writing to file:', error);
    }
  }
}

// สร้างอินสแตนซ์ของ FileReader และกำหนดพาธไฟล์
const filePath = path.join(__dirname, './../promt/17.txt');  // เปลี่ยนให้ตรงกับตำแหน่งไฟล์จริง
const fileReader = new TxtJSON(filePath);
const outputJsonPath = path.join(__dirname, './../17.json'); // กำหนดพาธไฟล์ JSON ที่จะบันทึก


// เรียกใช้ฟังก์ชันเพื่ออ่านไฟล์และแปลงเป็น JSON
const jsonData = fileReader.readFileAndConvertToJson();

// แสดงผลลัพธ์และบันทึกไปยังไฟล์ JSON
if (jsonData) {
  // console.log(JSON.stringify(jsonData, null, 2)); // แสดงผลลัพธ์บนคอนโซล
  fileReader.saveJsonToFile(jsonData, outputJsonPath); // บันทึกไฟล์ JSON
}