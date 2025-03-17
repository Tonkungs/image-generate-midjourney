import axios, { AxiosInstance } from "axios";
import { Offer, IGpuServer } from "./interface";

class VastServerManager {
  private apiKey: string;
  private baseUrl: string = "https://console.vast.ai/api/v0";
  private instance: AxiosInstance;

  constructor (apiKey: string) {
    this.apiKey = apiKey;
    this.instance = axios.create({
      baseURL: this.baseUrl,
      timeout: 5000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
  }

  async findCheapestRTX4090(gpu: string = "RTX 4090"): Promise<IGpuServer[] | null> {
    try {
      const query = {
        disk_space: { gte: 100 },
        duration: { gte: 262144 },
        verified: { eq: true },
        rentable: { eq: true },
        num_gpus: { gte: 1, lte: 1 },
        gpu_name: { in: [gpu] },
        cuda_max_good: { gte: "12.1" },
        cpu_arch: { in: ["amd64"] },
        direct_port_count: { gte: 9 },
        sort_option: { "0": ["dph_total", "asc"], "1": ["total_flops", "asc"] },
        order: [["dph_total", "asc"], ["total_flops", "asc"]],
        limit: 10,
        extra_ids: [],
        type: "ask"
      };

      const response = await this.instance.get(`${this.baseUrl}/bundles/`, {
        params: { q: JSON.stringify(query) },
      });

      const instances = response.data.offers as Offer[];
      if (!instances || instances.length === 0) return null;

      return instances.map(this.convertOfferToIGpuServer.bind(this));

    } catch (error) {
      console.error("Error fetching instances:", error);
      return null;
    }
  }

  // New method to create an instance
  async createInstance(bundleId: string, image: string = "ubuntu", disk: number = 50): Promise<string | null> {
    try {
      // Request body
      const requestBody = {
        api_key: this.apiKey,
        bundle_id: bundleId,  // Bundle ID of the selected offer
        image: image,         // The OS image to install (default is 'ubuntu')
        disk: disk,           // Disk size (in GB)
      };

      // Send request to create the instance
      const response = await this.instance.post(`${this.baseUrl}/instances/create/`, requestBody);

      // Return the instance ID from the response
      const instanceId = response.data.instance.id;
      return instanceId;
    } catch (error) {
      console.error("Error creating instance:", error);
      return null;
    }
  }

  async setupEnvironment(instanceId: string): Promise<void> {
    try {
      const setupScript = `
        #!/bin/bash
        sudo apt update && sudo apt install -y python3-pip git
        git clone https://github.com/flux-ai/flux.git && cd flux
        pip install -r requirements.txt
        cd ..
        git clone https://github.com/comfyanonymous/ComfyUI.git && cd ComfyUI
        pip install -r requirements.txt
      `;

      await axios.post(
        `${this.baseUrl}/instances/command/`,
        {
          api_key: this.apiKey,
          instance_id: instanceId,
          command: setupScript,
        }
      );
      console.log("Flux.dev และ ComfyUI ติดตั้งเรียบร้อย");
    } catch (error) {
      console.error("Error setting up environment:", error);
    }
  }

  // New method to show all instances
  async showAllInstances(): Promise<IGpuServer[] | null> {
    try {
      const response = await this.instance.get(`${this.baseUrl}/instances/`, {
        params: { api_key: this.apiKey },
      });

      const instances = response.data.instances as Offer[];
      if (!instances || instances.length === 0) return null;

      return instances.map(this.convertOfferToIGpuServer.bind(this));
    } catch (error) {
      console.error("Error fetching instances:", error);
      return null;
    }
  }


  // Private function

  private convertOfferToIGpuServer(offer: Offer): IGpuServer {
    return {
      id: offer.id,
      cpu_name: offer.cpu_name,
      cpu_cores: offer.cpu_cores,
      cpu_ghz: offer.cpu_ghz,
      cpu_ram: offer.cpu_ram,
      gpu_name: offer.gpu_name,
      gpu_ram: offer.gpu_ram,
      total_flops: offer.total_flops,
      totalHour: offer.search.totalHour,
      diskHour: offer.search.diskHour,
      gpuCostPerHour: offer.search.gpuCostPerHour,
      inet_down: offer.inet_down,
      inet_up: offer.inet_up,
      min_bid: offer.min_bid,
      internet_down_cost_per_tb: offer.internet_down_cost_per_tb,
      internet_up_cost_per_tb: offer.internet_up_cost_per_tb,
      duration: this.convertDurationToDays(offer.duration),
    };
  }

  private convertDurationToDays(duration: number): string {
    const secondsInDay = 86400;
    return `${Math.round(duration / secondsInDay)} วัน`;
  }
}

export default VastServerManager;





const vastManager = new VastServerManager("6303c0ce2e325b7c10a1dfba1f49bcbdca20567dd082007765fe0cadb148d90a");

async function deployServer() {
  // const instance = await vastManager.findCheapestRTX4090();
  // if (!instance) {
  //   console.log("No suitable server found.");
  //   return;
  // }
  // console.log("instance:", instance[0]);
  const ddd = await vastManager.showAllInstances();
  console.log("ddd:", ddd);
  // const instanceId = await vastManager.createServer(instance);
  // if (instanceId) {
  //     await vastManager.setupEnvironment(instanceId);
  // }
}

deployServer();
