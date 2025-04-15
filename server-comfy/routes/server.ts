import { Router, Request, Response } from 'express';
import { Like, Repository } from 'typeorm';
import { Server } from '../entity/server';
import Logs from '../../src/logs';
import { IResponseData, IServer } from '../interface/iserver';

export class ServerRoutes {
    private router: Router;
    private serverRepository: Repository<Server>;
    private log: Logs;

    constructor(serverRepository: Repository<Server>, log: Logs) {
        this.router = Router();
        this.serverRepository = serverRepository;
        this.log = log;
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get('/', this.middlewareLogger.bind(this), this.getListServer.bind(this));
        this.router.post('/', this.middlewareLogger.bind(this), this.createServerOwn.bind(this));
        this.router.get('/:id', this.middlewareLogger.bind(this), this.serverByID.bind(this));
        this.router.put('/:id', this.middlewareLogger.bind(this), this.editServer.bind(this));
        this.router.delete('/:id', this.middlewareLogger.bind(this), this.deleteServer.bind(this));
    }

    private async middlewareLogger(req: Request, res: Response, next: () => void): Promise<void> {
        this.log.info(`Request URL: ${req.url}`);
        this.log.info(`Request Method: ${req.method}`);
        this.log.info(`Request Body: ${JSON.stringify(req.body)}`);
        next();
    }

   private async createServerOwn(req: Request, res: Response): Promise<void> {
       try {
   
         let server = new Server();
         server = Object.assign(server, req.body);
         const result = await this.serverRepository.save(server);
         res.json({
           message: "Server created successfully",
           data: {
             id: result.id,
           }
         });
       } catch (error: any | Error) {
         this.log.error("Error creating server:" + error);
         res.status(500).json({ error: error.message ? error.message : 'An unknown error occurred' });
       }
     }
   
     private async serverByID(req: Request, res: Response): Promise<void> {
       try {
         const { id } = req.params;
         const result = await this.serverRepository.findOne({
           where: {
             id: parseInt(id),
           }
         });
         if (!result) {
           res.status(404).json({ message: "Server not found" });
           return;
         }
   
         const response: IResponseData<IServer> = {
           message: "successfully",
           data: {
             ...result
           }
         };
         res.json(response);
       } catch (error: any | Error) {
         this.log.error("Error creating server:" + error);
         res.status(500).json({
           error: true,
           message: error.message ? error.message : 'An unknown error occurred'
         });
       }
     }
   
     // edist server
     private async editServer(req: Request, res: Response): Promise<void> {
       try {
         const { id } = req.params;
         const result = await this.serverRepository.findOne({
           where: {
             id: parseInt(id),
           }
         });
         if (!result) {
           res.status(404).json({ message: "Server not found" });
           return;
         }
         const updatedResult = Object.assign(result, req.body);
         const updatedServer = await this.serverRepository.save(updatedResult);
         res.json({
           message: "Server updated successfully", data: {
             id: updatedServer.id,
           }
         });
       } catch (error: any | Error) {
         this.log.error("Error creating server:" + error);
         res.status(500).json({
           error: true,
           message: error.message ? error.message : 'An unknown error occurred'
         });
       }
   
     }
   
     // soft delete server
     private async deleteServer(req: Request, res: Response): Promise<void> {
       try {
         const { id } = req.params;
         const result = await this.serverRepository.findOne({
           where: {
             id: parseInt(id),
           }
         });
         if (!result) {
           res.status(404).json({ message: "Server not found" });
           return;
         }
         await this.serverRepository.softRemove(result);
         res.json({ message: "Server deleted successfully" });
       } catch (error: any | Error) {
         this.log.error("Error creating server:" + error);
         res.status(500).json({
           error: true,
           message: error.message ? error.message : 'An unknown error occurred'
         });
       }
     }

    private async getListServer(req: Request, res: Response): Promise<void> {
        try {
          const { search } = req.query;
    
          let whereConditions = {};
          if (search) {
            whereConditions = [
              { gpu_id: Like(`%${search}%`) },
              { machine_id: Like(`%${search}%`) },
              { server_ip: Like(`%${search}%`) }
            ];
          }
    
          const servers = await this.serverRepository.find({
            where: whereConditions,
            order: { created_at: "DESC" }
          });
          if (!servers) {
            res.status(404).json({ error: "Server not found" });
            return;
          }
          res.json({ message: "success", data: servers });
        } catch (error) {
          console.log("error", error);
          
          this.log.error("Error getting server list:", error);
          res.status(500).json({ error: "Error fetching server list" });
        }
      }

    public getRouter(): Router {
        return this.router;
    }
}