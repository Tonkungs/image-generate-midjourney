import { Router, Request, Response } from 'express';
import { In, Repository } from 'typeorm';
import { ServerAvailable } from '../entity/server-available';
import Logs from '../../src/logs';
import { ServerStage, ServerHisResponse, listOnlineServer, IQueComfy, IRepository, IServerConReload, listACtiveServer } from '../interface/iserver';
import { VastAIApiClient } from '../function/vastai';
import Ut from "../../src/util/util";
import { IServerConfig } from '../interface/iconfig';
export class ServerAvailableRoutes {
  private router: Router;
  private repo: IRepository;
  private log: Logs;
  private vastAiClient: VastAIApiClient;
  private configServer!: IServerConReload;
  constructor (serverAvailableRepository: IRepository, log: Logs, configServer: IServerConReload, vastAIClient: VastAIApiClient) {
    this.configServer = configServer
    this.router = Router();
    this.repo = serverAvailableRepository;
    this.log = log;
    this.initializeRoutes();
    this.vastAiClient = vastAIClient
    this.checkServerStatus();
  }

  private initializeRoutes() {
    this.router.post('/', this.createServer.bind(this));
    this.router.get('/', this.middlewareLogger.bind(this), this.getServers.bind(this));
    this.router.post('/ready', this.middlewareLogger.bind(this), this.updateStageReady.bind(this));
    this.router.post('/activate', this.middlewareLogger.bind(this), this.updateStageActivate.bind(this));
    this.router.post('/stop', this.middlewareLogger.bind(this), this.updateStageStop.bind(this));
    this.router.post('/destroy', this.middlewareLogger.bind(this), this.updateStageDestroy.bind(this));
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
      let server = new ServerAvailable();
      server.server_ip = server_ip;
      server.server_url = server_url;
      server.stage = ServerStage.START;
      server.restart_round = 0;
      const result = await this.repo.serverAvailableRepository.save(server);
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
      await this.repo.serverAvailableRepository.save(server);
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

      const server = await this.getServerByIp(server_ip, server_url);
      if (!server) {
        res.status(404).json({ error: "Server not found" });
        return;
      }
      server.stage = ServerStage.ACTIVATE;
      server.client_id = this.generateClientId();

      await this.repo.serverAvailableRepository.save(server);
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
      await this.repo.serverAvailableRepository.save(server);
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
      await this.repo.serverAvailableRepository.save(server);
      res.json({
        message: "Server stage updated to Destroy",
      });
    } catch (error) {
      this.log.error("Error updating server stage:", error);
      res.status(500).json({ error: "Error updating server stage" });

    }
  }

  private async getServerByIp(ip: string, server_url: string): Promise<ServerAvailable | null> {
    try {
      const server = await this.repo.serverAvailableRepository.findOne({
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
      const servers: ServerHisResponse[] = await this.repo.serverAvailableRepository.find({
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

  // ดึงรายการ instant จาก vastai มาทั้งหมด แล้วก็หา server ที่มี gpu_util < 1 ให้สั่งลบไปเลย
  // 1.ดึงรายการ instant จาก vastai มาทั้งหมด   await vastAiClient.getInstances();
  // 2.หาก server ที่มี gpu_util < 1 ให้สั่งลบไปเลย  await vastAiClient.deleteInstance("19739955");
  private async checkServerStatus() {
    this.log.info("Checking server status...");
    // loop every 5 minutes
    const loopMain = 5 * 60 * 1000; // 5 minutes
    // const loopMain = 10000
    const loopSubQueMain = 5000;  // 5 seconds
    const roundCheck = 10; // 10 times
    const timeTODeleteInstant = 20 // mins

    setInterval(async () => {
      try {

        const servers: ServerHisResponse[] = await this.repo.serverAvailableRepository.find({
          where: {
            stage: In(listACtiveServer)
          },
          order: { created_at: "DESC" }
        });

        if (servers.length === 0) {
          this.log.info("No servers available for deletion.");
          // return;
        }
        // const queSub = await this.getQueComfy(isHaveServer.server_url);
        //                 console.log("queSub", queSub);

        //                 if (!queSub) {
        //                   this.log.error("Error getting queue from Comfy:", queSub);
        //                   isDelete = true;
        //                   break;
        //                 }
        //                 // console.log("queSub?.queue_running.length", queSub?.queue_running.length);

        //                 if (queSub?.queue_running.length === 0) {
        //                   isDelete = true;
        //                 } else {
        //                   isDelete = false;
        //                   break;
        //                 }

        // เช็คจากการทำงาน
        const serverInstants = await this.vastAiClient.getInstances();
        this.log.info("Instant available for detection: " + serverInstants.instances.length + ' Server available: ' + servers.length);
        if (serverInstants) {
          for (const server of serverInstants.instances) {
            if (server.intended_status === 'stopped') {
              this.log.error("Delete Instant :" + server.id.toString());
              await this.vastAiClient.deleteInstance(server.id.toString());
              const serverFind = servers.find((serverIN) => serverIN.instant_id === server.id);

              if (serverFind) {
                const server = await this.repo.serverAvailableRepository.findOne({
                  where: {
                    id: serverFind.id,
                  }
                });

                if (!server) {
                  this.log.error("Server not found for deletion:", serverFind.id);
                  continue;
                }

                server.stage = ServerStage.DESTROY;
                await this.repo.serverAvailableRepository.save(server);
              }

              continue;
            }

            if (!server.start_date) {
              continue;
            }

            if (server.gpu_util > 2) {
              continue;
            }

            const times = Ut.ConvertTimeSince(server.start_date);

            if (times.mins < timeTODeleteInstant) {
              continue;
            }

            let isDelete = false;
            try {
              if (server.intended_status === 'running' && server.gpu_util < 2) {
                for (const _ of new Array(roundCheck)) {
                  await Ut.Delay(loopSubQueMain);
                  const queSub = await this.vastAiClient.getInstance(server.id.toString());
                  if (queSub.intended_status === 'stopped') {
                    isDelete = true;
                    break;
                  }

                  if (queSub.gpu_util < 2) {
                    this.log.error("Error getting cpu runtime from : ", queSub);
                    isDelete = true;
                  } else {
                    isDelete = false
                    break;
                  }
                }
              }
            } catch (error) {
              isDelete = true;
            }

            if (isDelete) {
              await this.vastAiClient.deleteInstance(server.id.toString());
              this.log.error("Delete :" + server.id.toString());
            }
          }
        }
      } catch (error) {
        this.log.error("Error checking server status:" + error);
      }
    }, loopMain);
  }


  private async getQueComfy(serverUrl: string): Promise<IQueComfy | null> {
    try {
      const url = `${serverUrl}/api/queue`;
      const response = await fetch(url, {
        method: 'GET',
      });
      return await response.json();
    } catch (error) {
      this.log.error('Error getting queue from Comfy:', error);
      return null;
    }
  }

  private generateClientId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  public getRouter(): Router {
    return this.router;
  }
}


// บ้าง server ดู ip ไม่ได้
// m:34337
// host:148689