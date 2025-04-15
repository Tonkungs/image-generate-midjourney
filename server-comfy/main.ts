import express, { Application } from 'express';
import { DataSource, Repository } from 'typeorm';
import { Server } from './entity/server';
import { ServerHistory } from "./entity/server-history";
import Logs from '../src/logs';
import { ServerRoutes } from './routes/server';
import { ServerHistoryRoutes } from './routes/server-history';
var cors = require('cors')

export class ServerApp {
    private app: Application;
    private dataSource: DataSource;
    private serverRepository!: Repository<Server>;
    private serverHistoryRepository!: Repository<ServerHistory>;
    private log!: Logs;

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
            entities: [Server, ServerHistory],
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
            process.exit(1);
        }
    }

    private startServer(): void {
        const PORT = 3000;
        this.app.listen(PORT, () => {
          this.log.info(`Server is running on http://localhost:${PORT}`);
        });
      }

    private setupRoutes(): void {
        const serverRoutes = new ServerRoutes(this.serverRepository, this.log);
        const serverHistoryRoutes = new ServerHistoryRoutes(this.serverHistoryRepository, this.log);
        
        this.app.use('/servers', serverRoutes.getRouter());
        this.app.use('/server-history', serverHistoryRoutes.getRouter());
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