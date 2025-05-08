import express, { Application } from 'express';
import { DataSource, Repository } from 'typeorm';
import { Server } from './entity/server';
import { ServerAvailable } from "./entity/server-available";
import Logs from '../src/logs';
import { ServerRoutes } from './routes/server';
import { ServerAvailableRoutes } from './routes/server-available';
import { VastAIApiClient } from './function/vastai';
import { ConfigServer } from './entity/server-config';
import { IServerConfig } from './interface/iconfig';
import { config } from 'dotenv';
import { ServerConfigRoutes } from './routes/server-config';
var cors = require('cors')

export class ServerApp {
    private app: Application;
    private dataSource: DataSource;
    private serverRepository!: Repository<Server>;
    private serverAvailableRepository!: Repository<ServerAvailable>;
    private serverConfigRepository!: Repository<ConfigServer>;
    private log!: Logs;
  private vastAiClient!: VastAIApiClient;
  
    constructor() {
        this.app = express();
        this.registerShutdownHandlers();
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.json());
        this.app.use(cors());
        this.log = new Logs();
        this.dataSource = new DataSource({
            type: "postgres",
            host: "localhost",
            port: 5432,
            username: "tonkung",
            password: "yourpassword",
            database: "images",
            entities: [Server, ServerAvailable,ConfigServer],
            synchronize: true,
            logging: false
        });
    }

    async initialize(): Promise<void> {
        try {
            await this.dataSource.initialize();
            this.log.info("Data Source has been initialized!");
            this.serverRepository = this.dataSource.getRepository(Server);
            this.serverAvailableRepository = this.dataSource.getRepository(ServerAvailable);
            this.serverConfigRepository = this.dataSource.getRepository(ConfigServer);
            this.setupRoutes();
            this.log.info("Routes have been set up!");
            this.startServer();
            const config = await this.getConfigServer();
            this.log.info("Server configuration retrieved successfully:")
            this.vastAiClient = new VastAIApiClient(config.vast_ai_api);

        } catch (err) {
            console.log(err);
            this.log.error("Error during Data Source initialization:", err);
            process.exit(1);
        }
    }

    private startServer(): void {
        const PORT = 3000;
        this.app.listen(PORT, () => {
          this.log.info(`Server is running on http://localhost:${PORT}`);
        });
    }

    private async getConfigServer(): Promise<IServerConfig> {
       try {
         const config = await this.serverConfigRepository.findOneBy({});
         return config || this.serverConfigRepository.create({
           id: "default",
           vast_ai_api: "",
           cloudflared_url: ""
         });
       } catch (error: any) {
          this.log.error(`Error getting server configuration: ${error.message || error}`);
          throw new Error("Failed to retrieve server configuration.");
       }
    } 

    private setupRoutes(): void {
      
        const serverRoutes = new ServerRoutes(this.serverRepository, this.log,this.vastAiClient);
        const serverAvailableRoutes = new ServerAvailableRoutes(this.serverAvailableRepository, this.log,this.vastAiClient);
        const serverConfigRoutes = new ServerConfigRoutes(this.serverConfigRepository, this.log);
       
        this.app.use('/servers', serverRoutes.getRouter());
        this.app.use('/server-available', serverAvailableRoutes.getRouter());
        this.app.use('/config', serverConfigRoutes.getRouter());
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


// mem_usage  ใช้แรม
