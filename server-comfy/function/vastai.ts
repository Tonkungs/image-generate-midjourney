import axios, { AxiosInstance, AxiosResponse } from 'axios';
const fs = require('fs');

// Define interfaces for the request body structure
interface SearchQueryParams {
  verified?: object;
  rentable?: object;
  external?: object;
  rented?: object;
  reliability2?: object;
  num_gpus?: object;
  gpu_name?: object;
  cuda_max_good?: object;
  gpu_ram?: object;
  dlperf_per_dphtotal?: object;
  inet_down?: object;
  inet_up?: object;
  direct_port_count?: object;
  geolocation?: object;
  bw_nvlink?: object;
  compute_cap?: object;
  cpu_arch?: object;
  cpu_cores?: object;
  cpu_ghz?: object;
  datacenter?: object;
  disk_bw?: object;
  dlperf?: object;
  dlperf_usd?: object;
  driver_version?: object;
  duration?: object;
  flops_usd?: object;
  gpu_arch?: object;
  gpu_max_power?: object;
  gpu_max_temp?: object;
  gpu_mem_bw?: object;
  gpu_total_ram?: object;
  gpu_frac?: object;
  gpu_display_active?: object;
  has_avx?: object;
  pci_gen?: object;
  storage_cost?: object;
  static_ip?: object;
  total_flops?: object;
  ubuntu_version?: object;
  vms_enabled?: object;
  machine_id?: object;
}

interface SearchRequestBody {
  body: {
    select_cols: string[];
    q: SearchQueryParams;
  };
}
interface CloudConnection {
  id: number;
  cloud_type: string;
  name: string;
}

interface RcloneCommandResponse {
  success: boolean;
  msg: string;
  result_url: string; // s3
}

interface ContractResponse {
  success: boolean;
  new_contract: number;
}

interface VastAIApiResponse {
  // Define the expected response structure here
  // For now using any as placeholder, ideally replace with actual response structure
  [key: string]: any;
}

// start get instant
export interface InstancesResponse {
  instances_found: number
  instances: Instance[]
}

export interface Instance {
  actual_status: string // loading , running
  bundle_id: number
  bw_nvlink: number
  client_run_time: number
  compute_cap: number
  cpu_arch: string
  cpu_cores: number
  cpu_cores_effective: number
  cpu_name: string
  cpu_ram: number
  cpu_util: number
  credit_balance: any
  credit_discount: any
  credit_discount_max: number
  cuda_max_good: number
  cur_state: string
  direct_port_count: number
  direct_port_end: number
  direct_port_start: number
  disk_bw: number
  disk_name: string
  disk_space: number
  disk_usage: number
  disk_util: number
  dlperf: number
  dlperf_per_dphtotal: number
  dph_base: number
  dph_total: number
  driver_version: string
  duration: number
  end_date: number
  external: boolean
  extra_env: string[][]
  flops_per_dphtotal: number
  geolocation: string
  gpu_arch: string
  gpu_display_active: boolean
  gpu_frac: number
  gpu_lanes: number
  gpu_mem_bw: number
  gpu_name: string
  gpu_ram: number
  gpu_temp: any
  gpu_totalram: number
  gpu_util: any
  has_avx: number
  host_id: number
  host_run_time: number
  hosting_type: any
  id: number
  image_args: any[]
  image_runtype: string
  image_uuid: string
  inet_down: number
  inet_down_billed: any
  inet_down_cost: number
  inet_up: number
  inet_up_billed: any
  inet_up_cost: number
  instance: Instance2
  intended_status: string
  internet_down_cost_per_tb: number
  internet_up_cost_per_tb: number
  is_bid: boolean
  jupyter_token: string
  label: string
  local_ipaddrs: string
  logo: string
  machine_dir_ssh_port: number
  machine_id: number
  mem_limit: any
  mem_usage: any
  min_bid: number
  mobo_name: string
  next_state: string
  num_gpus: number
  onstart: string
  os_version: string
  pci_gen: number
  pcie_bw: number
  public_ipaddr: string
  reliability2: number
  rentable: boolean
  score: number
  search: Search
  ssh_host: string
  ssh_idx: string
  ssh_port: number
  start_date: number
  static_ip: boolean
  status_msg: string
  storage_cost: number
  storage_total_cost: number
  template_hash_id: string
  template_id: number
  time_remaining: string
  time_remaining_isbid: string
  total_flops: number
  uptime_mins: any
  verification: string
  vmem_usage: any
  vram_costperhour: number
  webpage: any
  country_code: any
  template_name: string
}

export interface Instance2 {
  gpuCostPerHour: number
  diskHour: number
  totalHour: number
  discountTotalHour: number
  discountedTotalPerHour: number
}

export interface Search {
  gpuCostPerHour: number
  diskHour: number
  totalHour: number
  discountTotalHour: number
  discountedTotalPerHour: number
}
// end get instant

export interface ISearchOffers {
  gpu_name:string
  machine_id:string
}


export class VastAIApiClient {
  private readonly baseUrl: string = "https://console.vast.ai/api/v0";
  private readonly apiClient: AxiosInstance;

  constructor (apiKey: string) {
    // Create axios instance with default configuration
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }

  async searchAsks(queryParams: SearchQueryParams): Promise<any> {
    const requestBody: SearchRequestBody = {
      body: {
        select_cols: ["id", 'cpu_arch', 'dlperf', 'geolocation', 'gpu_arch', 'gpu_name', 'host_id', 'machine_id'],
        q: queryParams
      }
    };

    try {
      const response: AxiosResponse<any> = await this.apiClient.put(
        '/search/asks/',
        requestBody
      );

      return response.data.offers || [];
    } catch (error) {
      console.error('Error searching VastAI offers:', error);
      throw error;
    }
  }

  async searchOffers(query :ISearchOffers): Promise<any> {
    let data = JSON.stringify({
      "select_cols": [
        "id", 'cpu_arch', 'dlperf', 'geolocation', 'gpu_arch', 'gpu_name', 'host_id', 'machine_id'
      ],
      "q": {
        "verified": {
          "eq": true
        },
        "rentable": {
          "eq": true
        },
        "limit": 100,
        "order": [
          [
            "dlperf_per_dphtotal",
            "desc"
          ]
        ],
        "type": "on-demand",
        "reliability2": {
          "gte": 0.89
        },
        "num_gpus": {
          "eq": 1
        },
        "gpu_name": {
          "eq": query.gpu_name
          //  "eq": "RTX 4090"
        },
        "inet_down": {
          "gte": 294.0667788792408
        },
        "inet_up": {
          "gte": 3.031433133020799
        },
        "allocated_storage": 52,
        "duration": { "gte": 215185.29991666047 },
        "disk_space": {
          "gte": 52
        },
        "machine_id": {
          "eq": query.machine_id
          // "eq": "20409"
          // "eq": "12816"
        },
      }
    });

    try {
      const response: AxiosResponse<any> = await this.apiClient.put('https://console.vast.ai/api/v0/search/asks/', data); // axios.request(config)

      return response.data.offers || [];
    } catch (error) {
      console.error('Error searching VastAI offers:', error);
      throw error;
    }

  }

  async getInstances(): Promise<InstancesResponse> {
    try {
      const response: AxiosResponse<InstancesResponse> = await this.apiClient.get('/instances/');
      return response.data;
    } catch (error) {
      console.error('Error getting VastAI instances:', error);
      throw error;
    }
  }

  async getInstance(instanceId: string): Promise<Instance> {
    try {
      const response: AxiosResponse<Instance> = await this.apiClient.get(`/instances/${instanceId}/`);
      return response.data;
    } catch (error) {
      console.error('Error getting VastAI instance:', error);
      throw error;
    }
  }

  async createInstance(instanceDataID: string, template: any): Promise<ContractResponse> {
    try {
      // { success: true, new_contract: 19595862 }
      const response: AxiosResponse<ContractResponse> = await this.apiClient.put(
        `/asks/${instanceDataID}/`,
        template
      );
      return response.data;
    } catch (error) {
      console.error('Error creating VastAI instance:', error);
      throw error;
    }

  }

  async deleteInstance(instanceId: string): Promise<any> {
    try {
      const response: AxiosResponse<any> = await this.apiClient.delete(`/instances/${instanceId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting VastAI instance:', error);
      throw error;
    }
  }

  async getConnectionClouds(): Promise<CloudConnection[]> {
    try {
      const response: AxiosResponse<any> = await this.apiClient.get('/users/cloud_integrations/');
      return response.data;
    } catch (error) {
      console.error('Error getting cloud connections:', error);
      throw error;
    }
  }

  async rcloneCommand(instanceId: string, src: string, dst: string, selected: string, transferDirection: string): Promise<RcloneCommandResponse> {
    try {
      const response: AxiosResponse<any> = await this.apiClient.post('/commands/rclone/', {
        body: {
          instance_id: instanceId,
          src: src,
          dst: dst,
          selected: selected,
          transfer: transferDirection
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error executing rclone command:', error);
      throw error;
    }
  }

  async requestLogs(instanceId: string, tail: number = 1000, daemonLogs: boolean = true): Promise<RcloneCommandResponse> {
    try {
      const response: AxiosResponse<any> = await this.apiClient.put(
        `/instances/request_logs/${instanceId}`,
        {
          body: {
            tail: tail.toString(),
            daemon_logs: daemonLogs.toString()
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error requesting instance logs:', error);
      throw error;
    }
  }

  async changeBid(instanceId: string, price: number): Promise<any> {
    try {
      const response: AxiosResponse<any> = await this.apiClient.put(
        `/instances/${instanceId}/`,
        {
          client_id:'me',
          price: price
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error changing bid:', error);
      throw error;
    }
  }
}
