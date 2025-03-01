import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabaseUrl = 'https://pemswohgxrbawcfbwmhe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbXN3b2hneHJiYXdjZmJ3bWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyMDA4NTcsImV4cCI6MjA0Nzc3Njg1N30.L64EovTXadW_XRc4oy7vZ3VRMNPHnm8Bgn3VlIlGWbw';

export type StageType = 'START' | 'WAITING' | 'WAITING_DOWNLOAD' | 'DONE' | 'FAIL';

export interface IDataPromt {
  ID?: string;
  Title: string;
  Stage: StageType;
  SeedID: string;
  Round: number;
  ImageUrl: string;
  PromtId?: string
}
interface IPromt {
  id?: string;
  title: string;
  image_url: string;
  stage: string;
  seed_id?: string;
  round?: number;
  created_at?: string;
  updated_at?: string
  promt_id?: string
}
export default class DataDBHandler {
  private supabase;
  private tableName = 'images';
  private category = "00"
  private URL = "https://pemswohgxrbawcfbwmhe.supabase.co";
  private KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbXN3b2hneHJiYXdjZmJ3bWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyMDA4NTcsImV4cCI6MjA0Nzc3Njg1N30.L64EovTXadW_XRc4oy7vZ3VRMNPHnm8Bgn3VlIlGWbw";
  private CODE_EMPTY = 'PGRST116'
  // constructor (supabaseUrl: string = this.URL, supabaseKey: string = this.KEY) {
  //   this.supabase = createClient(supabaseUrl, supabaseKey);
  // }
  constructor () {
    this.supabase = createClient(this.URL, this.KEY);
  }

  // ฟังก์ชันในการค้นหา title
  public async findByTitle(title: string): Promise<IDataPromt | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id,image_url,title,stage,seed_id,round,created_at,updated_at,promt_id')
      .eq('title', title)
      .single();

    return await this.outputResut(data as IPromt || null, error);
  }

  public async findByID(id: string): Promise<IDataPromt | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id,image_url,title,stage,seed_id,round,created_at,updated_at,promt_id')
      .eq('id', id)
      .single();

    return await this.outputResut(data as IPromt || null, error);
  }

  // ฟังก์ชันในการค้นหา item แรกที่ stage เป็น 'START'
  public async findFirstStart(): Promise<IDataPromt | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id,image_url,title,stage,seed_id,round,created_at,updated_at,promt_id')
      .eq('stage', 'START')
      .order('created_at')
      .limit(1)
      .single()

    return await this.outputResut(data as IPromt || null, error);
  }

  // ฟังก์ชันในการค้นหา item แรกที่ stage เป็น 'START'
  public async findAllWait(): Promise<IDataPromt | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id,image_url,title,stage,seed_id,round,created_at,updated_at,promt_id')
      .eq('stage', 'WAITING_DOWNLOAD')
      .order('created_at')
      .limit(1)
      .single()

    return await this.outputResut(data as IPromt || null, error);
  }

  // ฟังก์ชันในการค้นหา item แรกที่ stage เป็น 'START'
  public async findByPromtID(promtID: String): Promise<IDataPromt | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('id,image_url,title,stage,seed_id,round,created_at,updated_at,promt_id')
      .eq('promt_id', promtID)
      .order('created_at')
      .limit(1)
      .single()

    return await this.outputResut(data as IPromt || null, error);
  }

  private async outputResut(data: IPromt, error: any): Promise<IDataPromt | null | any> {
    if (error !== null && error?.code === this.CODE_EMPTY) {
      return null;
    }

    if (error !== null) {
      throw error
    }

    let promtTitle: IDataPromt = {
      ID: data?.id,
      Title: data?.title,
      Stage: data?.stage as StageType,
      SeedID: data?.seed_id as string,
      Round: data?.round as number,
      ImageUrl: data?.image_url,
      PromtId: data?.promt_id as string,
    }

    return promtTitle;
  }

  public async retryWithDelayStart(
    retries: number,
    delayMs: number
  ): Promise<IDataPromt | null> {
    try {
      return await this.findFirstStart();
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying... Attempts left: ${retries}`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.retryWithDelayStart(retries - 1, delayMs);
      } else {
        console.error('All retries failed');
        throw error; // Reject after all retries fail
      }
    }
  }

  // ฟังก์ชันในการอัพเดท stage โดยค้นหาจาก title
  public async updateStageByTitle(
    title: string,
    newStage: 'START' | 'WAITING' | 'WAITING_DOWNLOAD' | 'DONE' | 'FAIL' = 'DONE',
    seedID: string = '',
    imageStart: string = '',
    imageEnd: string = ''
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ stage: newStage, seed_id: seedID })
      .eq('title', title);


    if (error) {
      console.error('Error updating stage by title:', error);
      return false;
    }
    if (data === null) {
      return false
    }
    return (data as any[]).length > 0;
  }

  public async updateStageByTitleStart(
    title: string,
    newStage: 'START' | 'WAITING' | 'WAITING_DOWNLOAD' | 'DONE' | 'FAIL' = 'DONE',
    seedID: string = '',
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        stage: newStage, seed_id: seedID,
        image_start: new Date().toISOString(),
      })
      .eq('title', title);

    if (error) {
      console.error('Error updating stage by title:', error);
      return false;
    }
    if (data === null) {
      return false
    }
    return (data as any[]).length > 0;
  }

  public async updateStageByTitleEnd(
    title: string,
    newStage: 'START' | 'WAITING' | 'WAITING_DOWNLOAD' | 'DONE' | 'FAIL' = 'DONE',
    seedID: string = '',
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        stage: newStage,
        seed_id: seedID,
        image_end: new Date().toISOString(),
      })
      .eq('title', title);

    if (error) {
      console.error('Error updating stage by title:', error);
      return false;
    }
    if (data === null) {
      return false
    }
    return (data as any[]).length > 0;
  }

  public async updateStageByID(
    id: string,
    newStage: 'START' | 'WAITING' | 'WAITING_DOWNLOAD' | 'DONE' | 'FAIL' = 'DONE',
    seedID: string = '',
    promptId: string = ''
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        stage: newStage,
        seed_id: seedID,
        promt_id: promptId,
        image_end: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating stage by title:', error);
      return false;
    }
    if (data === null) {
      return false
    }
    return (data as any[]).length > 0;
  }


  // ฟังก์ชันในการบันทึกข้อมูลใหม่
  public async insertData(data: IDataPromt): Promise<boolean> {
    const { error } = await this.supabase.from(this.tableName).insert([
      {
        title: data.Title,
        stage: data.Stage,
        seed_id: data.SeedID,
        round: data.Round,
        image_url: data.ImageUrl,
      },
    ]);

    if (error) {
      console.error('Error inserting data:', error);
      return false;
    }
    return true;
  }

  // อ่านไฟล์ 16.txt และคืนค่าข้อความแยกเป็น Array
  private readFile(filePath: string): string[] {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return fileContent.split('\n').filter(line => line.trim() !== ''); // ตัดบรรทัดว่าง
    } catch (error) {
      console.error('Error reading file:', error);
      return [];
    }
  }

  // Bulk Insert ข้อมูลลงในตาราง
  public async bulkInsertFromFile(filePath: string): Promise<boolean> {
    const lines = this.readFile(filePath);

    if (lines.length === 0) {
      console.error('No data to insert.');
      return false;
    }

    // แปลงข้อมูลให้ตรงกับโครงสร้างตาราง

    const dataToInsert: IDataPromt[] = lines.map((line, index) => ({
      Title: line,
      Stage: 'START', // ค่าเริ่มต้น
      SeedID: '', // ค่าเริ่มต้น
      Round: index + 1, // ค่าเริ่มต้น
      ImageUrl: '', // ค่าเริ่มต้น
    }));

    const errRec = await this.bulkInsertWithConflictHandling(dataToInsert);
    console.log("errRec", errRec.length);

    return true;
  }

  public async bulkInsertWithConflictHandling(data: IDataPromt[]): Promise<IDataPromt[]> {
    let errorCon: IDataPromt[] = []
    for (const record of data) {
      const { error } = await this.supabase
        .from(this.tableName)
        .insert({
          title: record.Title,
          stage: record.Stage,
          seed_id: record.SeedID,
          round: record.Round,
          image_url: record.ImageUrl,
          category: this.category,
        });

      if (error) {
        console.error(`Error inserting record with title "${record.Title}":`, error);
        // errorCon.push(record)
        throw new Error("Error inserting record with title");

      } else {
        // console.log(`Inserted record with title "${record.Title}" successfully.`);
      }
    }

    return errorCon
  }
}


// const supabaseUrl = 'https://pemswohgxrbawcfbwmhe.supabase.co';
// const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlbXN3b2hneHJiYXdjZmJ3bWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIyMDA4NTcsImV4cCI6MjA0Nzc3Njg1N30.L64EovTXadW_XRc4oy7vZ3VRMNPHnm8Bgn3VlIlGWbw';
// const bulkHandler = new DataDBHandler(supabaseUrl, supabaseKey);

// (async () => {
//   const filePath = './test.txt'; // Path ของไฟล์
//   const result = await bulkHandler.bulkInsertFromFile(filePath);

//   if (result) {
//     console.log('Data inserted successfully.');
//   } else {
//     console.error('Failed to insert data.');
//   }
// })();