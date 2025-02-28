import { GoogleGenerativeAI, ResponseSchema, SchemaType } from "@google/generative-ai";
import { IAiAdaterConfig } from "../interface/promt";

export default class PromtGenerater {
  private client: GoogleGenerativeAI
  private config: IAiAdaterConfig
  private GEMINI_SCHEME: ResponseSchema = {
    description: "Generate Promt for midjourney image ",
    type: SchemaType.OBJECT,
    properties: {
      response: {
        type: SchemaType.ARRAY,
        description: "Array of Promt for midjourney image",
        nullable: false,
        items: {
          type: SchemaType.STRING,
          description: "Promt for midjourney image",
          nullable: false,
        },
      },
    }
  };

  private system_promt = ``;
  constructor (config: IAiAdaterConfig) {
    this.config = config
    this.client = new GoogleGenerativeAI(config.api_key);
    this.system_promt = `
    You are an expert prompt generator for high-quality image creation using the FLUX.1 model. When generating prompts, ensure your instructions are clear, detailed, and logically structured. 

    1. Avoid using the phrase "white background" if using the [dev] variant; instead, use alternatives like "clean design" or specify a different color (e.g., gray, blue, or black).
    2. Incorporate quality-boosting keywords such as "4K", "8K", "ultra HD", "high resolution", "sharp and detailed" to enhance image clarity.
    3. Describe the image composition in layers: clearly define the foreground, middle ground, and background with specific details.
    4. For photorealistic images, include descriptive details such as tone, style, color palette, and perspective. If applicable, add technical details like camera type, aperture, and lens.
    5. When integrating text into images, specify font, style, size, color, and placement.
    6. For elements like glass or transparent materials, clearly state the layering order (e.g., "object A in front, object B behind") to achieve realistic see-through effects.
    7. Overall, structure your prompt as if you were instructing a human artist – logical, precise, and comprehensive – to ensure the best possible output from the provided keywords.
    8. ห้ามมีสัตว์หรือคนที่เห็นอย่างเด่นชัดในภาพ
    You need to take keywords from users, research additional information, and provide detailed descriptions. 
    The prompt should be written following the example below, but without using bracket symbols in the sentences. 
    Each prompt must be at "least 300 characters long" per promt. 
    The output must be in English only and must not contain any NSFW content, watermarks, or trademarks in the sentences. 
    Photo realistic,
    The resuslts should be displayed in a code block for easy copying, and there should be no empty lines between lines of text.
    ไม่ต้องมีตัวเลขนำหน้าและ"ไม่ต้องมีบรรทัดว่าง",อยู่ใน code block เดียวกัน,ไม่มีคนในภาพ และแต่ละ promt ต้องมีความแตกต่างกันอย่างน้อย 30 % ของข้อความ
    Please help think of a style that will definitely sell well. Images that bloggers can use or that major publications must buy to use in their presentations. They must have beautiful and complete elements.
     I want more ${this.config.promtPerRound || 3} Promt for this keyword
    Output pattern : [WHO WHAT WHERE] [This is the section where we will add details of the Subject that we previously included in the Archetypal Scene. In this section, we will discuss the characteristics of the Subject in more detail. There will be a template as follows] [The section where we will add details about the background of the image we want to create] [Describing the Mood & Tone and presentation style of the image] 8K, high resolution, sharp and detailed
  `
  }

  /**
   * Generates a list of prompts based on the given keyword.
   *
   * @param {string} keyword - The keyword used to generate prompts.
   * @return {Promise<string[]>} A promise that resolves with an array of generated prompts.
   */

  public async Generate(keyword: string): Promise<string[]> {
    const modelText = this.client.getGenerativeModel({
      model: this.config?.model,
      systemInstruction: this.system_promt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: this.GEMINI_SCHEME,
      },
    });
    const Mkeyword: string = `Keyword : "${keyword}"`;


    try {
      const result = await modelText.generateContent([Mkeyword]);
      const dataResult = result.response.text()

      const res = JSON.parse(dataResult).response as string[]

      return res.map(item => item.replace(/\[|\]/g, '').trim());

    } catch (error) {
      throw error
    }
  }
}