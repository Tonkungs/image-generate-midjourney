import * as fs from 'fs';

export interface IDataPromt {
  Title: string;
  Stage: 'START' | 'WAITING' | 'DONE' | 'FAIL';
  SeedID: string;
  Round: number;
  ImageUrl: string;
}

export default class DataJSONHandler {
  private data: IDataPromt[];
  private dataFileName: string;

  constructor (filePath: string) {
    this.dataFileName = filePath.endsWith('.json') ? filePath : `${filePath}.json`;
    this.data = this.readFromFile(this.dataFileName);
  }

  // ฟังก์ชันในการอ่านข้อมูลจากไฟล์
  private readFromFile(filePath: string): IDataPromt[] {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, '[]', 'utf-8'); // สร้างไฟล์เปล่าหากไม่มีไฟล์
    }
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  }

  // ฟังก์ชันในการค้นหา title
  public findByTitle(title: string): IDataPromt | undefined {
    return this.data.find(item => item.Title === title);
  }

  public findFirstStart(): IDataPromt | undefined {
    return this.data.find(item => item.Stage === 'START');
  }

  // ฟังก์ชันในการอัพเดท stage โดยค้นหาจาก title
  public async updateStageByTitle(
    title: string,
    newStage: 'START' | 'WAITING' | 'DONE' | 'FAIL' = 'DONE',
    seedID: string = ''
  ): Promise<boolean> {
    // await this.saveToFile();
    const index = this.data.findIndex(item => item.Title === title);
    console.log("index =>",index);
    console.log("newStage=>",newStage);
    
    if (index) {
      this.data[index].Stage = newStage;
      this.data[index].SeedID = seedID;
      console.log(" this.data[index] ", this.data[index]);
      
      await this.saveToFile(); // บันทึกข้อมูลหลังจากการอัพเดท
      return true;
    }

    return false;
  }

  // ฟังก์ชันในการบันทึกข้อมูลกลับไปที่ไฟล์
  private async saveToFile(): Promise<void> {
    // let newfilter: IDataPromt[] = []
    // this.data.map((item,index) => {

    //   const findFound = newfilter.findIndex(itemIN=>itemIN.Title === item.Title)
    //   if (findFound == -1) {
    //     newfilter.push({
    //       ...item,
    //       Round: index+1
    //     })
    //   }
    // })

    // console.log(" this.data", this.data.length);
    
    // console.log("newfilter",newfilter.length);
    
    const content = JSON.stringify(this.data, null, 2); // เพิ่มการจัด format JSON ให้อ่านง่าย
    fs.writeFileSync(this.dataFileName, content, 'utf-8');
  }
}
