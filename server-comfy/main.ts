import express, { Application, Request, Response } from 'express';
import { DataSource, Like, Not, Repository } from 'typeorm';
import { Server } from './entity/server';
import { ServerHistory } from "./entity/server-history";
import Logs from '../src/logs';
import { ServerHisResponse, CreateServerHisRequest, ServerStage, IResponseData, IServer } from "./interface/iserver";
var cors = require('cors')

export class ServerApp {
  private app: Application;
  private dataSource: DataSource;
  private serverRepository!: Repository<Server>;
  private serverHistoryRepository!: Repository<ServerHistory>;
  private log !: Logs
  constructor () {
    this.app = express();

    this.registerShutdownHandlers();
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());

    this.app.use(cors())
    this.log = new Logs();
    this.dataSource = new DataSource({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "tonkung",
      password: "yourpassword",
      database: "images",
      entities: [Server,ServerHistory],
      synchronize: true,
      logging: false
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.dataSource.initialize();
      this.log.info("Data Source has been initialized!");
      this.serverRepository = this.dataSource.getRepository(Server);
      this.serverHistoryRepository = this.dataSource.getRepository(ServerHistory);
      this.setupRoutes();
      this.log.info("Routes have been set up!");
      this.startServer();
    } catch (err) {
      console.log(err);
      this.log.error("Error during Data Source initialization:", err);
      process.exit(1)
    }
  }

  private setupRoutes(): void {
    this.app.get('/servers',this.middlewarelogger.bind(this), this.getListServer.bind(this));
    this.app.post('/servers',this.middlewarelogger.bind(this), this.createServerOwn.bind(this));
    this.app.get('/servers/:id',this.middlewarelogger.bind(this), this.serverByID.bind(this));
    this.app.put('/servers/:id',this.middlewarelogger.bind(this), this.editServer.bind(this));
    this.app.delete('/servers/:id',this.middlewarelogger.bind(this), this.deleteServer.bind(this));
    this.app.post('/server-history', this.createServer.bind(this));
    this.app.get('/server-history',this.middlewarelogger.bind(this), this.getServers.bind(this));
    this.app.post('/server-history/:server_ip/ready',this.middlewarelogger.bind(this), this.updateStageReady.bind(this));
    this.app.post('/server-history/:server_ip/activate',this.middlewarelogger.bind(this), this.updateStageActivate.bind(this));
    this.app.post('/server-history/:server_ip/stop',this.middlewarelogger.bind(this), this.updateStageStop.bind(this));
    this.app.post('/server-history/:server_ip/destroy',this.middlewarelogger.bind(this), this.updateStageDestroy.bind(this));
    this.app.post('/server-history/promt',this.middlewarelogger.bind(this), this.promtTest.bind(this));
  }

  private async middlewarelogger(req: Request, res: Response, next: () => void): Promise<void> {
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
          id:result.id,
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
      res.status(500).json({ error: true,
        message:error.message ? error.message : 'An unknown error occurred'
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
      res.json({ message: "Server updated successfully", data: {
        id: updatedServer.id,
      } });
    } catch (error: any | Error) {
      this.log.error("Error creating server:" + error);
      res.status(500).json({ error: true,
        message:error.message ? error.message : 'An unknown error occurred'
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
      res.status(500).json({ error: true,
        message:error.message ? error.message : 'An unknown error occurred'
       });
    }
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

  private async getListServer(req: Request, res: Response): Promise<void> {
    try {
      const {  search } = req.query;
      
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
      res.json({ server_list: servers });
    } catch (error) {
      this.log.error("Error getting server list:", error);
      res.status(500).json({ error: "Error fetching server list" });
    }
  }

  private async updateStageReady(req: Request, res: Response): Promise<void> {
    try {
      // finc server and update stage to ready
      const { server_ip,server_url } = req.body;

      const server = await this.getServerByIp(server_ip,server_url);
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
      const { server_ip,server_url } = req.body;
      console.log("server_ip=>", server_ip);
      console.log("server_url=>", server_url);
      
      const server = await this.getServerByIp(server_ip,server_url);
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
      const { server_ip ,server_url} = req.body;
      const server = await this.getServerByIp(server_ip,server_url);
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
      const { server_ip ,server_url} = req.body;
      const server = await this.getServerByIp(server_ip,server_url);
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

  private async getServerByIp(ip: string,server_url: string): Promise<ServerHistory | null> {
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
      const servers: ServerHisResponse[] = await this.serverHistoryRepository.find(
        {
          where: { stage: ServerStage.READY },
          order: { created_at: "DESC" }
        }
      );
      res.json({ server_list: servers });
    } catch (error) {
      this.log.error("Error creating server:", error);
      res.status(500).json({ error: "Error fetching servers" });
    }
  }

  private startServer(): void {
    const PORT = 3000;
    this.app.listen(PORT, () => {
      this.log.info(`Server is running on http://localhost:${PORT}`);
    });
  }

  private registerShutdownHandlers(): void {
    const safeShutdown = async (signal?: string, error?: Error) => {
      this.log.info(`Shutting down gracefully... Signal: ${signal}`);
      if (error) {
        this.log.error(`Shutdown triggered by error: ${error.message}`);
        this.log.error(error.stack || 'No stack trace available');
      }

      try {
        if (this.dataSource?.isInitialized) {
          await this.dataSource.destroy();
          this.log.info("Database connection closed.");
        }
      } catch (error) {
        this.log.error("Error during shutdown:", error);
      } finally {
        this.log.info("Safe shutdown completed.");
        process.exit(error ? 1 : 0);
      }
    };

    process.on("SIGINT", () => safeShutdown("SIGINT"));
    process.on("SIGTERM", () => safeShutdown("SIGTERM"));
    process.on("exit", () => safeShutdown("exit"));
    process.on("uncaughtException", (error) => safeShutdown("uncaughtException", error));
  }
}

// Usage
const serverApp = new ServerApp();
serverApp.initialize();
