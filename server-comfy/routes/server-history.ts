import { Router, Request, Response } from 'express';
import { In, Repository } from 'typeorm';
import { ServerHistory } from '../entity/server-history';
import Logs from '../../src/logs';
import { ServerStage, ServerHisResponse, listOnlineServer } from '../interface/iserver';

export class ServerHistoryRoutes {
    private router: Router;
    private serverHistoryRepository: Repository<ServerHistory>;
    private log: Logs;

    constructor(serverHistoryRepository: Repository<ServerHistory>, log: Logs) {
        this.router = Router();
        this.serverHistoryRepository = serverHistoryRepository;
        this.log = log;
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post('/', this.createServer.bind(this));
        this.router.get('/', this.middlewareLogger.bind(this), this.getServers.bind(this));
        this.router.post('/:server_ip/ready', this.middlewareLogger.bind(this), this.updateStageReady.bind(this));
        this.router.post('/:server_ip/activate', this.middlewareLogger.bind(this), this.updateStageActivate.bind(this));
        this.router.post('/:server_ip/stop', this.middlewareLogger.bind(this), this.updateStageStop.bind(this));
        this.router.post('/:server_ip/destroy', this.middlewareLogger.bind(this), this.updateStageDestroy.bind(this));
        this.router.post('/promt', this.middlewareLogger.bind(this), this.promtTest.bind(this));
    }

    private async middlewareLogger(req: Request, res: Response, next: () => void): Promise<void> {
        this.log.info(`Request URL: ${req.url}`);
        this.log.info(`Request Method: ${req.method}`);
        this.log.info(`Request Body: ${JSON.stringify(req.body)}`);
        next();
    }

    private async createServer(req: Request, res: Response): Promise<void> {
        try {
          const { server_url, server_ip } = req.body;
          let server = new ServerHistory();
          server.server_ip = server_ip;
          server.server_url = server_url;
          server.stage = ServerStage.START;
          server.restart_round = 0;
          console.log("server=> Start", server);
          const result = await this.serverHistoryRepository.save(server);
          res.json(result);
        } catch (error: any | Error) {
          this.log.error("Error creating server:" + error);
          res.status(500).json({ error: error.message ? error.message : 'An unknown error occurred' });
        }
      }
    
      
    
      private async updateStageReady(req: Request, res: Response): Promise<void> {
        try {
          // finc server and update stage to ready
          const { server_ip, server_url } = req.body;
    
          const server = await this.getServerByIp(server_ip, server_url);
          if (!server) {
            res.status(404).json({ error: "Server not found" });
            return;
          }
          server.stage = ServerStage.READY;
          console.log("server=> READY", server);
          await this.serverHistoryRepository.save(server);
          res.json({
            message: "Server stage updated to READY",
          });
        } catch (error) {
          this.log.error("Error updating server stage:", error);
          res.status(500).json({ error: "Error updating server stage" });
        }
      }
    
      private async updateStageActivate(req: Request, res: Response): Promise<void> {
        try {
          // finc server and update stage to ready
          const { server_ip, server_url } = req.body;
          console.log("server_ip=>", server_ip);
          console.log("server_url=>", server_url);
    
          const server = await this.getServerByIp(server_ip, server_url);
          if (!server) {
            res.status(404).json({ error: "Server not found" });
            return;
          }
          server.stage = ServerStage.ACTIVATE;
          console.log("server=> ACTIVATE", server);
          await this.serverHistoryRepository.save(server);
          res.json({
            message: "Server stage updated to Activate",
          });
        } catch (error) {
          this.log.error("Error updating server stage:", error);
          res.status(500).json({ error: "Error updating server stage" });
        }
      }
    
      private async updateStageStop(req: Request, res: Response): Promise<void> {
        try {
          // finc server and update stage to ready
          const { server_ip, server_url } = req.body;
          const server = await this.getServerByIp(server_ip, server_url);
          if (!server) {
            res.status(404).json({ error: "Server not found" });
            return;
          }
          server.stage = ServerStage.STOP;
          console.log("server=> STOP", server);
          await this.serverHistoryRepository.save(server);
          res.json({
            message: "Server stage updated to STOP",
          });
        } catch (error) {
          this.log.error("Error updating server stage:", error);
          res.status(500).json({ error: "Error updating server stage" });
        }
      }
    
      private async updateStageDestroy(req: Request, res: Response): Promise<void> {
        try {
          // finc server and update stage to ready
          const { server_ip, server_url } = req.body;
          const server = await this.getServerByIp(server_ip, server_url);
          if (!server) {
            res.status(404).json({ error: "Server not found" });
            return;
          }
          server.stage = ServerStage.DESTROY;
          console.log("server=> DESTROY", server);
          await this.serverHistoryRepository.save(server);
          res.json({
            message: "Server stage updated to Destroy",
          });
        } catch (error) {
          this.log.error("Error updating server stage:", error);
          res.status(500).json({ error: "Error updating server stage" });
    
        }
      }
    
      private async getServerByIp(ip: string, server_url: string): Promise<ServerHistory | null> {
        try {
          console.log("getServerByIp=>", ip);
          console.log("getServerByIp=>", server_url);
          const server = await this.serverHistoryRepository.findOne({
            where: {
              server_ip: ip,
              server_url: server_url,
            }
          });
    
          if (!server) {
            return null
          }
          return server
        } catch (error) {
          this.log.error("Error getting server by ip:", error);
          return null
        }
      }
    
      private async promtTest(req: Request, res: Response) {
        try {
          console.log("req=>", req.body);
          // set deleay 5000ms
          await new Promise(resolve => setTimeout(resolve, 30000));
          res.json({ "message": "test" });
        } catch (error) {
    
        }
      }
    
      private async getServers(req: Request, res: Response): Promise<void> {
        try {     
          const servers: ServerHisResponse[] = await this.serverHistoryRepository.find({
            where: { 
              stage: In(listOnlineServer) 
            },
            order: { created_at: "DESC" }
          });
          res.json({ message: "success", data: servers });
        } catch (error) {
          console.log("error=>", error);
          
          this.log.error("Error creating server:", error);
          res.status(500).json({ error: "Error fetching servers" });
        }
      }

    public getRouter(): Router {
        return this.router;
    }
}