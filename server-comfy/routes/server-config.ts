import { Router, Request, Response } from 'express';
import { Repository } from 'typeorm';
import { ConfigServer } from '../entity/server-config';
import Logs from '../../src/logs';
import { IResponseData } from '../interface/iserver';
import { IServerConfig, IUpdateServerConfigPayload } from '../interface/iconfig';

export class ServerConfigRoutes {
  private router: Router;
  private configRepository: Repository<ConfigServer>;
  private log: Logs;

  constructor(configRepository: Repository<ConfigServer>, log: Logs) {
    this.router = Router();
    this.configRepository = configRepository;
    this.log = log;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get('/', this.getConfig.bind(this));
    this.router.put('/', this.updateFullConfig.bind(this));
    this.router.put('/cloudflared', this.updateCloudflaredUrlOnly.bind(this));
  }

  private async getConfig(req: Request, res: Response): Promise<void> {
    try {
      let config = await this.configRepository.findOneBy({}); 

      if (!config) {
        this.log.info("Server configuration not found, creating a new default one.");
        const newConfig = this.configRepository.create({
          id: "default", // Or any other default ID logic you prefer
          vast_ai_api: "",
          cloudflared_url: ""
        });
        config = await this.configRepository.save(newConfig);
        this.log.info("Default server configuration created successfully.");
      }

      const response: IResponseData<IServerConfig> = {
        message: "Successfully",
        data: {
          id: config.id,
          vast_ai_api: config.vast_ai_api,
          cloudflared_url: config.cloudflared_url,
        }
      };
      res.json(response);
    } catch (error: any) {
      this.log.error(`Error getting or creating server configuration: ${error.message || error}`);
      res.status(500).json({ 
        error: true, 
        message: error.message || 'An unknown error occurred while retrieving configuration.' 
      });
    }
  }

  private async updateFullConfig(req: Request, res: Response): Promise<void> {
    try {
      const { vast_ai_api, cloudflared_url } = req.body as IUpdateServerConfigPayload;

      if (typeof vast_ai_api !== 'string' || typeof cloudflared_url !== 'string') {
        res.status(400).json({ message: "Both vast_ai_api and cloudflared_url must be provided as strings for a full update." });
        return;
      }

      const config = await this.configRepository.findOneBy({});

      if (!config) {
        this.log.warn("Attempted to update a non-existent server configuration.");
        // If you want to create it if it doesn't exist, you would do:
        // config = this.configRepository.create();
        // For now, strictly update:
        res.status(404).json({ message: "Server configuration not found. Cannot update." });
        return;
      }
      
      config.vast_ai_api = vast_ai_api;
      config.cloudflared_url = cloudflared_url;

      const savedConfig = await this.configRepository.save(config);

      const response: IResponseData<IServerConfig> = {
        message: "Successfully",
        data: {
          id: savedConfig.id,
          vast_ai_api: savedConfig.vast_ai_api,
          cloudflared_url: savedConfig.cloudflared_url,
        }
      };
      res.json(response);
    } catch (error: any) {
      this.log.error(`Error updating server configuration: ${error.message || error}`);
      res.status(500).json({ 
        error: true, 
        message: error.message || 'An unknown error occurred while updating configuration.' 
      });
    }
  }

  private async updateCloudflaredUrlOnly(req: Request, res: Response): Promise<void> {
    try {
      const { cloudflared_url } = req.body as IUpdateServerConfigPayload;

      if (typeof cloudflared_url !== 'string') {
        res.status(400).json({ message: "cloudflared_url must be provided as a string." });
        return;
      }

      const config = await this.configRepository.findOneBy({});

      if (!config) {
        this.log.warn("Attempted to update cloudflared_url for a non-existent configuration.");
        res.status(404).json({ message: "Server configuration not found. Cannot update cloudflared_url." });
        return;
      }
      
      config.cloudflared_url = cloudflared_url;

      const savedConfig = await this.configRepository.save(config);

      const response: IResponseData<IServerConfig> = {
        message: "Successfully",
        data: {
          id: savedConfig.id,
          vast_ai_api: savedConfig.vast_ai_api, // Return the full current state
          cloudflared_url: savedConfig.cloudflared_url,
        }
      };
      res.json(response);
    } catch (error: any) {
      this.log.error(`Error updating cloudflared_url: ${error.message || error}`);
      res.status(500).json({ 
        error: true, 
        message: error.message || 'An unknown error occurred while updating cloudflared_url.' 
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
