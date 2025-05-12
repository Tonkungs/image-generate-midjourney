import { Router, Request, Response } from 'express';
import { Like, Repository } from 'typeorm';
import { Server } from '../entity/server';
import Logs from '../../src/logs';
import { IRepository, IResponseData, IServer, IServerConReload, ServerGPU, ServerGPU2Vast } from '../interface/iserver';
import { ISearchOffers, VastAIApiClient } from '../function/vastai';
import { IServerConfig } from '../interface/iconfig';

export class ServerRoutes {
  private router: Router;
  private repo: IRepository;
  private log: Logs;
  private vastAiClient: VastAIApiClient;
  private configServer !: IServerConReload
  constructor (serverRepository: IRepository, log: Logs, configServer: IServerConReload, vastAIClient: VastAIApiClient) {
    this.configServer = configServer
    this.router = Router();
    this.repo = serverRepository;
    this.log = log;
    this.initializeRoutes();
    this.vastAiClient = vastAIClient
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
      const result = await this.repo.serverRepository.save(server);
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
      const result = await this.repo.serverRepository.findOne({
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
          ...result,
          is_rentable: false,
          instant_id: undefined,
          ask_contract_id: undefined,
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
      const result = await this.repo.serverRepository.findOne({
        where: {
          id: parseInt(id),
        }
      });
      if (!result) {
        res.status(404).json({ message: "Server not found" });
        return;
      }
      const updatedResult = Object.assign(result, req.body);
      const updatedServer = await this.repo.serverRepository.save(updatedResult);
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
      const result = await this.repo.serverRepository.findOne({
        where: {
          id: parseInt(id),
        }
      });
      if (!result) {
        res.status(404).json({ message: "Server not found" });
        return;
      }
      await this.repo.serverRepository.softRemove(result);
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

      const servers = await this.repo.serverRepository.find({
        where: whereConditions,
        order: { created_at: "DESC" }
      });
      if (!servers) {
        res.status(404).json({ error: "Server not found" });
        return;
      }
      let newServer: IServer[] = [];
      // console.log("servers", servers);
      for (const server of servers) {
        let gpu = ""
        switch (server.gpu_type) {
          case ServerGPU.RTX_4090:
            gpu = ServerGPU2Vast.RTX_4090;
            break;
          case ServerGPU.RTX_3090:
            gpu = ServerGPU2Vast.RTX_3090;
            break;
        }

        if (server.machine_id === "" || gpu === null) {
          newServer.push({
            ...server,
            is_rentable: false,
            instant_id: undefined,
            ask_contract_id: undefined,
          })
          continue
        }

        const queryParams: ISearchOffers = {
          gpu_name: gpu,
          machine_id: server.machine_id
        }
        // console.log("this.vastAiClient", this.vastAiClient);
        const result = await this.vastAiClient.searchOffers(queryParams);
        // console.log("result",result);

        newServer.push({
          ...server,
          is_rentable: result.length > 0 ? true : false,
          ask_contract_id: result[0]?.ask_contract_id,
          instant_id: undefined,
        })
      }

      const results = await this.vastAiClient.getInstances();
      console.log("results", results);

      if (results) {
        for (const server of newServer) {
          const instance = results.instances.find((item) =>
            item.machine_id.toString() === server.machine_id &&
            item.host_id.toString() === server.gpu_id)
          if (instance) {
            server.instant_id = instance.id
            server.server_status = instance.actual_status;
          } else {
            server.server_status = "OFFLINE";
          }
        }
      }
      const response: IResponseData<IServer[]> = {
        message: "successfully",
        data: newServer
      };
      res.json(response);
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