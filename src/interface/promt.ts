export interface IModels {
    gpt_4o: string,
    gpt_4o_mini: string,
    gemini_1_5_flash: string,
    gemini_1_5_flash_002: string,
    gemini_1_5_pro: string,
    gemini_1_5_pro_002: string
    gemini_2_0_flash: string
    gemini_2_5_flash_preview: string
}

export const Models: IModels = {
    gpt_4o: "gpt-4o",
    gpt_4o_mini: "gpt-4o-mini",
    gemini_1_5_flash: "gemini-1.5-flash",
    gemini_1_5_flash_002: "gemini-1.5-flash-002",
    gemini_1_5_pro: "gemini-1.5-pro",
    gemini_1_5_pro_002: "gemini-1.5-pro-002",
    gemini_2_0_flash: "gemini-2.0-flash",
    gemini_2_5_flash_preview: "gemini-2.5-flash-preview-04-17"
}

export interface IGPTDetail {
    gpt_4o: string,
    gpt_4o_mini: string,
}

// วิธีคำนวน token จะไม่เท่ากัน
export const GPTDetail = {
    low: "low",
    high: "high",
    auto: "auto"
}

export interface IAiAdater {
    api_key: string
    model: string
}

export interface IAiAdaterConfig extends IAiAdater {
    detail?: string
    promtPerRound?: number
}

export interface IOutputKeyWord {
    title: string
    category: string
    keywords: Array<string>
}
