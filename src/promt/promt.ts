import { GoogleGenerativeAI, ResponseSchema, SchemaType } from "@google/generative-ai";
import { IAiAdaterConfig } from "../interface/promt";

export default class PromtGenerater {
  private client: GoogleGenerativeAI
  private config: IAiAdaterConfig
  private newSystemPromt: string;
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
    8. High resolution, sharp and detailed, high detail 8k not have low quality, not have  worst quality, not have bad anatomy,not have extra limbs,not blurry, not have watermark,not have  cropped.
    You need to take keywords from users, research additional information, and provide detailed descriptions. 
    The prompt should be written following the example below, but without using bracket symbols in the sentences. 
    Each prompt must be at "least 300 characters long" per promt. 
    The output must be in English only and must not contain any NSFW content, watermarks, or trademarks in the sentences. 
    Photo realistic,
    The resuslts should be displayed in a code block for easy copying, and there should be no empty lines between lines of text.
    ไม่ต้องมีตัวเลขนำหน้าและ"ไม่ต้องมีบรรทัดว่าง",อยู่ใน code block เดียวกัน,ไม่มีคนในภาพ และแต่ละ promt ต้องมีความแตกต่างกันอย่างน้อย 30 % ของข้อความ อธิบายโดยละเลียดทุกอย่าง
    Please help think of a style that will definitely sell well. Images that bloggers can use or that major publications must buy to use in their presentations. They must have beautiful and complete elements.
     I want more ${this.config.promtPerRound || 3} Promt for this keyword
    Output pattern : [WHO WHAT WHERE] [This is the section where we will add details of the Subject that we previously included in the Archetypal Scene. In this section, we will discuss the characteristics of the Subject in more detail. There will be a template as follows] [The section where we will add details about the background of the image we want to create] [Describing the Mood & Tone and presentation style of the image] 8K, high resolution, sharp and detailed
  `
    // Enhancing Image Quality
    // To guarantee ultra-realistic, sharp, and detailed results, the prompt should include:
    // 2.1 High-resolution indicators: Use terms like "8K, ultra HD, high resolution, sharp and detailed" to emphasize clarity.
    // 2.2 Negative quality filters: Prevent low-quality results by specifying "not blurry, not low quality, not worst quality, not cropped, not extra limbs, not bad anatomy, no watermarks."

    this.newSystemPromt = `
  As an expert in prompt generation for high-quality image creation using the FLUX.1 model, I focus on crafting precise, highly detailed, and logically structured instructions to ensure the best visual output. The goal is to generate clear and comprehensive prompts that guide the AI effectively, mimicking instructions given to a professional human artist.

    Guidelines for Optimal Prompt Structuring:

    Background and Composition Instructions
    1.1 If using the [dev] variant of FLUX.1, avoid the phrase "white background" to ensure a visually appealing composition. Instead, use alternative descriptions like "clean design," or specify a different background color such as gray, blue, or black to add depth and context.
    1.2 Ensure that the image is structured in layers:
    1.2.1 Foreground – Clearly define key subjects and objects, specifying details such as texture, materials, and lighting effects.
    1.2.2 Background – Define environmental aspects, whether it's a realistic cityscape, soft-focus bokeh, or atmospheric elements like fog or sunlight diffusion.

 ---
 
    Photorealistic Details and Camera Techniques
    For hyper-realistic images, include detailed specifications such as:
    3.1 Tone & Style – Define if the image should be warm, moody, cinematic, vibrant, or minimalistic.
    3.2 Color Palette – Mention dominant colors to maintain thematic consistency.
    3.3 Perspective & Depth – Specify if it should be shot from a close-up macro view, wide-angle perspective, or aerial shot.
    3.4 Technical Camera Settings (if applicable):
    3.5 Camera model (e.g., Canon EOS R5, Sony A7R IV)
    3.6 Aperture (e.g., f/1.4 for bokeh, f/11 for sharp landscapes)
    3.7 Lens type (e.g., 50mm prime for portraits, 16mm wide-angle for landscapes)

    Text and Typography Integration
    When integrating text overlays, be specific about:
    4.1 Font style (e.g., elegant serif, modern sans-serif, handwritten script)
    4.2 Size and placement (e.g., top-left corner, center-aligned, overlay on foreground object)
    4.3 Color and blending mode (e.g., golden metallic with subtle drop shadow)

    Special Considerations for Transparent and Reflective Materials
    For realistic rendering of glass, water, or reflective surfaces, provide:
    5.1 Layering details – Specify which objects appear in front or behind.
    5.2 Lighting effects – Mention soft refractions, specular highlights, or light diffusion through the material.

    Overall Objective:
    - Generate commercially valuable images that appeal to bloggers, brands, and major publications.
    - Each prompt should be at least 300 characters long and differ by at least 30% to ensure variety.
    - The prompt should be concise, structured, and free of empty lines for easy copying.
    - No NSFW content, watermarks, or trademarks should be included.

    Prompt Structure Template:

    [WHO / WHAT / WHERE] – Clearly define the subject and key elements.
    [Detailed Subject Description] – Describe the object's characteristics, materials, colors, textures, and unique features.
    [Background Details] – Specify environmental aspects, atmospheric effects, and spatial depth.
    [Mood & Tone] – Define the visual presentation, including lighting, color grading, and realism level.
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
      systemInstruction: this.newSystemPromt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: this.GEMINI_SCHEME,
      },
    });
    const Mkeyword: string = `Keyword : "${keyword}" and With anything keyword you think fits this word, but the words you come up with must not be the same.`;


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