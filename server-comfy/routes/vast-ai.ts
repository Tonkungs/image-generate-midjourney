import { Router, Request, Response } from 'express';
import { Like, Repository } from 'typeorm';
import { Server } from '../entity/server';
import Logs from '../../src/logs';
import { IRepository, IResponseData, IServer, IServerConReload, ServerGPU, ServerGPU2Vast } from '../interface/iserver';
import { ISearchOffers, VastAIApiClient } from '../function/vastai';
import { IServerConfig } from '../interface/iconfig';

export class VastAIRoutes {
  private router: Router;
  private repo: IRepository;
  private log: Logs;
  private vastAiClient!: VastAIApiClient;
  serverConfigRepository: any;
  private configTemplate: any
  private configServer !: IServerConReload
  constructor (serverRepository: IRepository, log: Logs, configServer: IServerConReload, vastAiClient: VastAIApiClient) {
    this.configServer = configServer
    this.router = Router();
    this.repo = serverRepository;
    this.log = log;
    this.initializeRoutes();
    this.vastAiClient = vastAiClient
    this.configTemplate = {
      "template_id": 231909,
      // "template_hash_id": "d15bc035f6940c3c5f0ec5417e324339", // comfyui custom by tons
      // "image": "tonkung/comfy-tonkung", //ComfyUI + FLUX.1 Ton2 Custom
      "disk": 50,
      "env": {
        "OPEN_BUTTON_PORT": "1111",
        "OPEN_BUTTON_TOKEN": "055924cd931577f8ab440a3a713d68c2",
        "JUPYTER_DIR": "/",
        "DATA_DIRECTORY": "/workspace/",
        "PORTAL_CONFIG": "localhost:1111:11111:/:Instance Portal|localhost:8188:18188:/:ComfyUI|localhost:8080:18080:/:Jupyter|localhost:8080:18080:/terminals/1:Jupyter Terminal|localhost:8384:18384:/:Syncthing",
        "PROVISIONING_SCRIPT": "https://raw.githubusercontent.com/vast-ai/base-image/refs/heads/main/derivatives/pytorch/derivatives/comfyui/provisioning_scripts/flux.sh",
        "COMFYUI_ARGS": "--disable-auto-launch --port 18188 --enable-cors-header",
        "HF_TOKEN": "",
        "MAIN_SERVER": "",
        "JSON_URL": "https://raw.githubusercontent.com/Tonkungs/docker-comfy/refs/heads/main/flux_dev_promt.json"
      },
      "runtype": "jupyter",
      "onstart": "entrypoint.sh",
      "label": "generate-image",
      "target_state": "running",
      "cancel_unavail": true,
      "client_id": "me"
    }
  }



  private initializeRoutes() {
    this.router.post('/', this.createVastAIServer.bind(this));
    this.router.delete('/:instant_id', this.deleteVastAIServer.bind(this));
  }

  private async createVastAIServer(req: Request, res: Response): Promise<void> {
    try {
      const { ask_contract_id, server_id } = req.body;
      // throw new Error("123");
      
      // Update server instant_id
      const server = await this.repo.serverRepository.findOne({
        where: {
          id: server_id
        }
      });
      if (server === undefined || server === null) {
        this.log.error("Server not found");
        res.status(404).json({
          error: true,
          message: "Server not found"
        });
        return
      }
      // console.log("this.configServer", this.configServer);

      this.configTemplate["env"]["MAIN_SERVER"] = this.configServer.configServer.cloudflared_url
      this.configTemplate["env"]["HF_TOKEN"] = this.configServer.configServer.hf_token

      console.log("this.configTemplate", this.configTemplate);

      const resultCont = await this.vastAiClient.createInstance(ask_contract_id, this.configTemplate);
      this.log.info("Create instance result:", resultCont);

      server.instant_id = ask_contract_id
      await this.repo.serverRepository.save(server);

      const response: IResponseData<any> = {
        message: "successfully",
        data: ""
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

  private async deleteVastAIServer(req: Request, res: Response): Promise<void> {
    try {
      const { instant_id } = req.params
      if (instant_id === undefined || instant_id === null) {
        this.log.error("instant_id is required");
        res.status(400).json({
          error: true,
          message: "instant_id is required"
        });
        return

      }
      console.log("instant_id", instant_id);
      const result = await this.vastAiClient.deleteInstance(instant_id);
      this.log.info("Delete instance result:", result);


      // Update server instant_id
      // const server = await this.repo.serverRepository.findOne({
      //   where: {
      //     id: server_id
      //   }
      // });
      // if (server === undefined || server === null) {
      //   this.log.error("Server not found");
      //   res.status(404).json({
      //     error: true,
      //     message: "Server not found"
      //   });
      //   return
      // }

      // server.instant_id = undefined
      // await this.repo.serverRepository.save(server);

      const response: IResponseData<any> = {
        message: "successfully",
        data: ""
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

  public getRouter(): Router {
    return this.router;
  }
}


// Example usage:
// async function searchVastAI() {
//   try {
//     const vastAiClient = new VastAIApiClient("");
//     const templateInstante = {
//       // "template_id": 231909,
//       "template_hash_id": "f344aca178902dab19fa99eb249fe0bf", // comfyui custom by tons
//       // "image": "vastai/comfy",
//       "disk": 52,
//       "extra_env": {
//         "OPEN_BUTTON_PORT": "1111",
//         "OPEN_BUTTON_TOKEN": "055924cd931577f8ab440a3a713d68c2",
//         "JUPYTER_DIR": "/",
//         "DATA_DIRECTORY": "/workspace/",
//         "PORTAL_CONFIG": "localhost:1111:11111:/:Instance Portal|localhost:8188:18188:/:ComfyUI|localhost:8080:18080:/:Jupyter|localhost:8080:18080:/terminals/1:Jupyter Terminal|localhost:8384:18384:/:Syncthing",
//         "PROVISIONING_SCRIPT": "https://raw.githubusercontent.com/vast-ai/base-image/refs/heads/main/derivatives/pytorch/derivatives/comfyui/provisioning_scripts/flux.sh",
//         "COMFYUI_ARGS": "--disable-auto-launch --port 18188 --enable-cors-header",
//         "HF_TOKEN": ""
//       },
//       "runtype": "jupyter",
//       "onstart": "entrypoint.sh",
//       "label": "generate-image",
//       "target_state": "running",
//       "cancel_unavail": true,
//       "client_id": "me"
// use_jupyter_lab
//     }

//     const queryParams :ISearchOffers = {
//       gpu_name: "RTX 3090",
//       machine_id: "20409"
//     }
//     // Initialize an empty query params object
//     // หรือใช้เมธอดทั่วไปโดยกำหนด query parameters เอง

//     // Call the search method using await
//     // const result = await vastAiClient.searchAsks(queryParams);
//     // fs.writeFileSync('vastai-results.json', JSON.stringify(result, null, 2));

//     // const result = await vastAiClient.searchOffers(queryParams);
//     // fs.writeFileSync('vastai-results.json', JSON.stringify(result, null, 2));
//     // console.log('Results written to vastai-results.json');
//     // const resultCont = await vastAiClient.createInstance("19734946",templateInstante);
//     // console.log('Create instance result:', resultCont);

//     // const result = await vastAiClient.getInstances();
//     // fs.writeFileSync('vastai-instances.json', JSON.stringify(result, null, 2));
//     // console.log('Instances written to vastai-instances.json');

//     const result = await vastAiClient.getInstance("19777337");
//     // "actual_status": "loading", running
//     // "status_msg": "61d075891a42: Verifying Checksum\n61d075891a42: Download complete\n",
//     fs.writeFileSync('vastai-instance-only-2.json', JSON.stringify(result, null, 2));

//     // requestLogs
//     // const result = await vastAiClient.requestLogs("19739955");
//     // fs.writeFileSync('vastai-instance-logs.json', JSON.stringify(result, null, 2));
//     // deleteInstance
//     // const result = await vastAiClient.deleteInstance("19739955");
//     // fs.writeFileSync('vastai-instance-delete.json', JSON.stringify(result, null, 2));
//     // console.log('Delete instance result:', result);
//   } catch (error) {
//     // Axios specific error handling
//     if (axios.isAxiosError(error)) {
//       console.error('Axios error:', error.response?.data || error.message);
//     } else {
//       console.error('Unexpected error:', error);
//     }
//   }
// }

// Call the async function
// searchVastAI();
