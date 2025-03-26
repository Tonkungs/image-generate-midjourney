import { GoogleGenerativeAI, ResponseSchema, SchemaType } from "@google/generative-ai";
import { FIleManager } from "../util/filemanager";
// import { IAiAdaterConfig, IOutputKeyWord } from "../interface/aiadater";
// import { AIAdapter } from "./aiadater";
// import { FIleManager } from "../util/filemanager";


export interface IAiAdaterConfig {
  api_key: string
  model: string
  detail?: string
}
export interface IOutputKeyWord {
  title: string
  category: string
  keywords: Array<string>
}


export default class GenName {

  private client: GoogleGenerativeAI
  private schema: ResponseSchema = {
    description: "Title and keywords for the image",
    type: SchemaType.OBJECT,
    required: [
      "title",
      "category",
      "keywords"
    ],
    properties: {
      title: {
        type: SchemaType.STRING,
        description: "Title of the image",
        nullable: false,
      },
      category: {
        type: SchemaType.STRING,
        description: "Category of the image from Adobe stock",
        nullable: false,
      },
      keywords: {
        type: SchemaType.ARRAY,
        description: "Keywords for the image",
        items: {
          type: SchemaType.STRING,
          description: "Keywords for the image",
          nullable: false,
        },
      },
    }
  };

  protected adobe_stock_category = `
    Adobe Stock categories by number:
    1. Animals: Content related to animals, insects, or pets — at home or in the wild. 
    2. Buildings and Architecture: Structures like homes, interiors, offices, temples, barns, factories, and shelters. 
    3. Business: People in business settings, offices, business concepts, finance, and money
    4. Drinks: Content related to beer, wine, spirits, and other drinks. 
    5. The Environment: Depictions of nature or the places we work and live. 
    6. States of Mind: Content related to people’s emotions and inner voices. 
    7. Food: Anything focused on food and eating. 
    8. Graphic Resources: Backgrounds, textures, and symbols. 
    9. Hobbies and Leisure: Pastime activities that bring joy and/or relaxation, such as knitting, building model airplanes, and sailing. 
    10. Industry: Depictions of work and manufacturing, like building cars, forging steel, producing clothing, or producing energy. 
    11. Landscape: Vistas, cities, nature, and other locations. 
    12. Lifestyle: The environments and activities of people at home, work, and play. 
    13. People: People of all ages, ethnicities, cultures, genders, and abilities. 
    14. Plants and Flowers: Close-ups of the natural world. 
    15. Culture and Religion: Depictions of the traditions, beliefs, and cultures of people around the world. 
    16. Science: Content with a focus on the applied, natural, medical, and theoretical sciences. 
    17. Social Issues: Poverty, inequality, politics, violence, and other depictions of social issues. 
    18. Sports: Content focused on sports and fitness, including football, basketball, hunting, yoga, and skiing. 
    19. Technology: Computers, smartphones, virtual reality, and other tools designed to increase productivity. 
    20. Transport: Different types of transportation, including cars, buses, trains, planes, and highway systems. 
    21 Travel: Local and worldwide travel, culture, and lifestyles. 
`

  protected system_promt = `You are a top-selling contributor on Micro Stock. 
    Analyze the attached image and create a highly descriptive English title, 
    between 140–180 characters, without any trademarked terms. 
    Provide 50 unique keywords that are sorted from the most relevant to the least relevant to the image content. 
    Each keyword should be unique, descriptive,
    and organized with very similar terms adjacent to each other to improve SEO relevance.
    ที่ title ไม่ต้องบอกจำนวนตัวอักษร

    And enter the category number that this image will most closely match according to Adobe Stock categories by number.
    ${this.adobe_stock_category}
    `
  private promt: string = `Explain Detail this image follow by system Instruction title must max 110 character,And
	and must be max 50 keyword.`
  private config: IAiAdaterConfig
  constructor (config: IAiAdaterConfig) {
    this.client = new GoogleGenerativeAI(config.api_key);
    this.config = config
  }

  public async process(imageUrl: string): Promise<IOutputKeyWord> {

    const imageBase64 = new FIleManager(imageUrl)

    const imageDta = {
      inlineData: {
        data: imageBase64.getFileBase64(),
        mimeType: imageBase64.getMimeType(),
      },
    }

    const modelText = this.client.getGenerativeModel({
      model: this.config.model,
      systemInstruction: this.system_promt,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: this.schema,
      },
    });


    try {
      const result = await modelText.generateContent([this.promt, imageDta]);
      const dataResult = result.response.text()
      return JSON.parse(dataResult) as IOutputKeyWord;

    } catch (error) {
      throw error
    }
  }
}

