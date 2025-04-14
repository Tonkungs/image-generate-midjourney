import { DataSource, UpdateResult } from 'typeorm';
import { IDataPromt, ImageEntity } from './entities/image';
import { Category } from '../../find-keyword/interface';
import { Server } from '../../server-comfy/entity/server';
import { ServerStage } from '../../server-comfy/interface/iserver';
import { ServerHistory } from '../../server-comfy/entity/server-history';

export class Database {
  private dataSource: DataSource;

  constructor () {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'tonkung',
      password: 'yourpassword',
      database: 'images',
      entities: [ImageEntity, Server,ServerHistory],
      synchronize: true,
    });
  }
  async initialize(): Promise<void> {
    await this.dataSource.initialize();
  }

  async insert(data: Partial<ImageEntity>): Promise<IDataPromt> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    const image = imageRepo.create(data);
    return await imageRepo.save(image) as unknown as IDataPromt;
  }

  async bulkInsert(records: Partial<ImageEntity>[]): Promise<IDataPromt[]> {
    if (records.length === 0) {
      return [];
    }

    const imageRepo = this.dataSource.getRepository(ImageEntity);
    const images = imageRepo.create(records);
    return await imageRepo.save(images) as unknown as IDataPromt[];
  }

  // find by stage
  async findFirstWait(): Promise<ImageEntity | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    return await imageRepo.findOne({
      where: { stage: 'WAITING_DOWNLOAD' },
      order: { created_at: 'ASC' },
      select: ['id', 'image_url', 'title', 'stage', 'seed_id', 'round', 'category', 'created_at', 'updated_at', 'image_start', 'image_end', 'promt_id'],
    });
  }

  // find by stage top 10
  async findTopWait(stage: string = 'WAITING_DOWNLOAD', top = 10): Promise<ImageEntity[] | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    return await imageRepo.find({
      where: { stage: stage },
      order: { created_at: 'ASC' },
      take: top,
      select: ['id', 'image_url', 'title', 'stage', 'seed_id', 'round', 'category', 'created_at', 'updated_at', 'image_start', 'image_end', 'promt_id'],
    });
  }

  async findFirstStart(Category: string = ''): Promise<ImageEntity | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    return await imageRepo.findOne({
      where: {
        stage: 'START',
        // category: Csategory,
      },
      order: { created_at: 'ASC' },
      select: ['id', 'image_url', 'title', 'stage', 'seed_id', 'round', 'category', 'created_at', 'updated_at', 'image_start', 'image_end', 'promt_id'],
    }) as ImageEntity;
  }


  async getAll(page: number = 1, limit: number = 10): Promise<IDataPromt[]> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    return await imageRepo.find({
      select: ['id', 'image_url', 'title', 'stage', 'seed_id', 'round', 'category', 'created_at', 'updated_at', 'image_start', 'image_end', 'promt_id'],
      skip: (page - 1) * limit,
      take: limit,
    }) as unknown as IDataPromt[];
  }

  async getById(id: number): Promise<IDataPromt | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    return await imageRepo.findOne({
      where: { id },
      select: ['id', 'image_url', 'title', 'stage', 'seed_id', 'round', 'category', 'created_at', 'updated_at', 'image_start', 'image_end', 'promt_id'],
    }) as unknown as IDataPromt;
  }

  // find by promt_id
  async findByPromtId(promt_id: string): Promise<ImageEntity | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    return await imageRepo.findOne({
      where: { promt_id },
      select: ['id', 'image_url', 'title', 'stage', 'seed_id', 'round', 'category', 'created_at', 'updated_at', 'image_start', 'image_end'],
    }) as unknown as ImageEntity;
  }

  // async updateStageByID(id: number, stage: string): Promise<UpdateResult | null> {
  //   const imageRepo = this.dataSource.getRepository(ImageEntity);
  //   return await imageRepo.update(id, {
  //     stage,
  //     updated_at: new Date(),
  //   });
  // }

  async update(id: number, data: Partial<ImageEntity>): Promise<IDataPromt | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    await imageRepo.update(id, {
      ...data,
      updated_at: new Date(),
    });
    return this.getById(id) as unknown as IDataPromt;
  }


  async delete(id: number): Promise<IDataPromt | null> {
    const imageRepo = this.dataSource.getRepository(ImageEntity);
    const image = await this.getById(id) as unknown as IDataPromt;
    if (image) {
      await imageRepo.delete(id) as unknown as IDataPromt;
    }
    return image;
  }

  async getAllServers(stage: string = ServerStage.ACTIVATE): Promise<ServerHistory[]> {
    const serverRepo = this.dataSource.getRepository(ServerHistory);
    return await serverRepo.find({
      where: { stage: stage },
      select: ['id', 'server_ip', 'server_url', 'stage', 'restart_round', 'created_at', 'updated_at'],
    }) as ServerHistory[];
  }

  async updateServer(data: Partial<ServerHistory>): Promise<UpdateResult | null> {
    const serverRepo = this.dataSource.getRepository(ServerHistory);
    return await serverRepo.update(data.id as number, {
      ...data,
      updated_at: new Date(),
    });
  }

}

export default new Database();


// (async function name() {
//     const database = new Database();
//     console.log('Initializing database...');
//    await database.initialize();
//     console.log('Database initialized');
// const image = await database.insert({
//   image_url: 'https://example.com/image.jpg',
//   title: 'Sample Image',
//   stage: 'initial',
//   seed_id: "12345",
//   image_start: new Date(),
//   round: 1,
//   category: 'example',
//   created_at: new Date(),
//   updated_at: new Date(),
// });

// console.log('Inserted image:', image);
// const allImages = await database.getAll();
// console.log('All images:', allImages);
// const singleImage = await database.getById(image.id);
// console.log('Single image:', singleImage);
// const updatedImage = await database.update(image.id, { title: 'Updated Image' });
// console.log('Updated image:', updatedImage);
// const deletedImage = await database.delete(image.id);
// console.log('Deleted image:', deletedImage);
// const allImagesAfterDelete = await database.getAll();
// console.log('All images after delete:', allImagesAfterDelete);
// const bulkInsertImages = await database.bulkInsert([
//   {
//     image_url: 'https://example.com/image1.jpg',
//     title: 'Bulk Image 1',
//     stage: 'initial',
//     seed_id: "12345",
//     image_start: new Date(),
//     round: 1,
//     category: 'example',
//     created_at: new Date(),
//     updated_at: new Date(),
//   },
//   {
//     image_url: 'https://example.com/image2.jpg',
//     title: 'Bulk Image 2',
//     stage: 'initial',
//     seed_id: "12345",
//     image_start: new Date(),
//     round: 1,
//     category: 'example',
//     created_at: new Date(),
//     updated_at: new Date(),
//   },
// ]);
// console.log('Bulk inserted images:', bulkInsertImages);


// })()