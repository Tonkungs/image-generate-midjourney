import * as fs from 'fs';

export interface IDataPromt {
  Title: string;
  Stage: 'START' | 'WAITING' | 'DONE' | 'FAIL'
  SeedID: string
  Round:number,
  ImageUrl: string
}

export default class DataHandler {
  private data: IDataPromt[];
  private dataFileName: string = 'data.txt'
  constructor (filePath: string) {
    this.data = this.readFromFile(filePath);
    this.dataFileName = filePath
  }

  // ฟังก์ชันในการอ่านข้อมูลจากไฟล์
  private readFromFile(filePath: string): IDataPromt[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent)
  }

  // ฟังก์ชันในการค้นหา title
  public findByTitle(title: string): IDataPromt | undefined {
    return this.data.find(item => item.Title === title);
  }

  public findFirstStart(): IDataPromt | undefined {
    return this.data.find(item => item.Stage === 'START');
  }

  // ฟังก์ชันในการอัพเดท stage โดยค้นหาจาก title
  public async updateStageByTitle(title: string, newStage: 'START' | 'WAITING' | 'DONE' | 'FAIL' = "DONE",seedID: string = ""): Promise<boolean> {
    const item = this.findByTitle(title);
    if (item) {
      console.log("item =",item);
      
      item.Stage = newStage;
      item.SeedID = seedID
      await this.saveToFile(); // บันทึกข้อมูลหลังจากการอัพเดท
      return true;
    }
    return false;
  }

  // ฟังก์ชันในการบันทึกข้อมูลกลับไปที่ไฟล์
  private async saveToFile(): Promise<void> {
    const content = JSON.stringify(this.data)
    await fs.writeFileSync(this.dataFileName, content);
    this.data = this.readFromFile(this.dataFileName)
  }
}

// // ตัวอย่างการใช้งาน
// (async function start() {
//   const dataHandler = new DataHandler('208410632-transparent.txt');

//   // // ค้นหาข้อมูลจาก title
//   // const result = dataHandler.findByTitle('Floating red chili peppers on white background. PNG transparent.');
//   // console.log(result);

//   // // อัพเดท stage ของ title ที่ต้องการ
//   // const isUpdated = await dataHandler.updateStageByTitle('Floating red chili peppers on white background. PNG transparent.', 'DONE');
//   // if (isUpdated) {
//   //   console.log('Stage updated successfully!');
//   // } else {
//   //   console.log('Title not found.');
//   // }

//   const result = await dataHandler.findFirstStart()
//   console.log(result)
//   if (result) {
//     const isUpdated = await dataHandler.updateStageByTitle(result.Title, 'WAITING','123456');
//     if (isUpdated) {
//       console.log('Stage updated successfully!');
//     } else {
//       console.log('Title not found.');
//     }
//   }
// })()
