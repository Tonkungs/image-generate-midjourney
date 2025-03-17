
export interface RootVast {
    offers: Offer[]
}

export interface Offer {
    id: number
    ask_contract_id: number
    bundle_id: number
    bundled_results: any
    bw_nvlink: number
    compute_cap: number
    cpu_arch: string
    cpu_cores: number
    cpu_cores_effective: number
    cpu_ghz: number
    cpu_name: string
    cpu_ram: number
    credit_discount_max: number
    cuda_max_good: number
    direct_port_count: number
    disk_bw: number
    disk_name: string
    disk_space: number
    dlperf: number
    dlperf_per_dphtotal: number
    dph_base: number
    dph_total: number
    driver_version: string
    driver_vers: number
    duration: number
    end_date: number
    external: any
    flops_per_dphtotal: number
    geolocation: string
    geolocode: number
    gpu_arch: string
    gpu_display_active: boolean
    gpu_frac: number
    gpu_ids: number[]
    gpu_lanes: number
    gpu_mem_bw: number
    gpu_name: string
    gpu_ram: number
    gpu_total_ram: number
    gpu_max_power: number
    gpu_max_temp: number
    has_avx: number
    host_id: number
    hosting_type: number
    hostname: any
    inet_down: number
    inet_down_cost: number
    inet_up: number
    inet_up_cost: number
    is_bid: boolean
    logo: string
    machine_id: number
    min_bid: number
    mobo_name: string
    num_gpus: number
    os_version: string
    pci_gen: number
    pcie_bw: number
    public_ipaddr: string
    reliability: number
    reliability_mult: number
    rentable: boolean
    rented: boolean
    score: number
    start_date?: number
    static_ip: boolean
    storage_cost: number
    storage_total_cost: number
    total_flops: number
    verification: string
    vericode: number
    vram_costperhour: number
    webpage: any
    vms_enabled: boolean
    expected_reliability: number
    rn: number
    dph_total_adj: number
    reliability2: number
    discount_rate: any
    discounted_hourly: number
    discounted_dph_total: number
    search: Search
    instance: Instance
    time_remaining: string
    time_remaining_isbid: string
    internet_up_cost_per_tb: number
    internet_down_cost_per_tb: number
}

export interface Search {
    gpuCostPerHour: number
    diskHour: number
    totalHour: number
    discountTotalHour: number
    discountedTotalPerHour: number
}

export interface Instance {
    gpuCostPerHour: number
    diskHour: number
    totalHour: number
    discountTotalHour: number
    discountedTotalPerHour: number
}

export interface IGpuServer {
    id: number,
    cpu_name: string,
    cpu_cores: number,
    cpu_ghz: number,
    cpu_ram: number,
    gpu_name: string,
    gpu_ram: number,
    total_flops: number,
    totalHour: number,
    diskHour: number,
    gpuCostPerHour: number,
    inet_down: number,
    inet_up: number,
    min_bid: number,
    internet_down_cost_per_tb: number,
    internet_up_cost_per_tb: number,
    duration: string,
}