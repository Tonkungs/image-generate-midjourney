import express, { Application, Request, Response } from 'express';
import { DataSource, Not, Repository } from 'typeorm';
import { Server } from './entity/server';
import Logs from '../src/logs';
import { ServerResponse, CreateServerRequest, ServerStage } from "./interface/iserver";
export class ServerApp {
  private app: Application;
  private dataSource: DataSource;
  private serverRepository!: Repository<Server>;
  private log !: Logs
  constructor () {
    this.app = express();

    this.registerShutdownHandlers();
    // this.app.use(bodyParser.json());
    // this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
    this.log = new Logs();
    this.dataSource = new DataSource({
      type: "postgres",
      host: "localhost",
      port: 5432,
      username: "tonkung",
      password: "yourpassword",
      database: "images",
      entities: [Server],
      synchronize: true,
      logging: false
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.dataSource.initialize();
      this.log.info("Data Source has been initialized!");
      this.serverRepository = this.dataSource.getRepository(Server);
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
    this.app.post('/server', this.createServer.bind(this));
    this.app.get('/server', this.getServers.bind(this));
    this.app.post('/server/:server_ip/ready', this.updateStageReady.bind(this));
    this.app.post('/server/:server_ip/activate', this.updateStageActivate.bind(this));
    this.app.post('/server/:server_ip/stop', this.updateStageStop.bind(this));
    this.app.post('/server/:server_ip/destroy', this.updateStageDestroy.bind(this));
    this.app.post('/server/promt', this.promtTest.bind(this));
  }

  // create middleware ให ้สร้างlog เวลา  error
  private async createServerMiddleware(req: Request, res: Response, next: Function) {
    try {
      const { server_url, server_ip }: CreateServerRequest = req.body;
      if (!server_url || !server_ip) {
        this.log.error("Missing required fields");
        return res.status(400).json({ error: "Missing required fields" });
      }
      next();
    } catch (error) {
      this.log.error("Error in middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async createServer(req: Request, res: Response): Promise<void> {
    try {
      const { server_url, server_ip } = req.body;
      let server = new Server();
      server.server_ip = server_ip;
      server.server_url = server_url;
      server.stage = ServerStage.START;
      server.restart_round = 0;
      const result = await this.serverRepository.save(server);
      res.json(result);
    } catch (error: any | Error) {
      this.log.error("Error creating server:" + error);
      res.status(500).json({ error: error.message ? error.message : 'An unknown error occurred' });
    }
  }

  private async updateStageReady(req: Request, res: Response): Promise<void> {
    try {
      // finc server and update stage to ready
      const { server_ip } = req.params;

      const server = await this.getServerByIp(server_ip);
      if (!server) {
        res.status(404).json({ error: "Server not found" });
        return;
      }
      server.stage = ServerStage.READY;
      await this.serverRepository.save(server);
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
      const { server_ip } = req.params;
      const server = await this.getServerByIp(server_ip);
      if (!server) {
        res.status(404).json({ error: "Server not found" });
        return;
      }
      server.stage = ServerStage.ACTIVATE;
      await this.serverRepository.save(server);
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
      const { server_ip } = req.params;
      const server = await this.getServerByIp(server_ip);
      if (!server) {
        res.status(404).json({ error: "Server not found" });
        return;
      }
      server.stage = ServerStage.STOP;
      await this.serverRepository.save(server);
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
      const { server_ip } = req.params;
      const server = await this.getServerByIp(server_ip);
      if (!server) {
        res.status(404).json({ error: "Server not found" });
        return;
      }
      server.stage = ServerStage.DESTROY;
      await this.serverRepository.save(server);
      res.json({
        message: "Server stage updated to Destroy",
      });
    } catch (error) {
      this.log.error("Error updating server stage:", error);
      res.status(500).json({ error: "Error updating server stage" });

    }
  }

  private async getServerByIp(ip: string): Promise<Server | null> {
    try {      
      const server = await this.serverRepository.findOne({
        where: {
          server_ip: ip,
          // stage: Not(ServerStage.DESTROY)
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
      console.log("ok", 30000);
      
      res.json({ "message": "test" });
    } catch (error) {
      
    }
  }

  private async getServers(req: Request, res: Response): Promise<void> {
    try {
      const servers: ServerResponse[] = await this.serverRepository.find(
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
