import puppeteer, { Browser, Page } from "puppeteer";
import fs from 'fs';
import path from 'path';

export interface ImageType {
  Round:number,
  ImageUrl: string
  Title: string
  Stage:String
  SeedID: string
}

export default class AdobeStock {

  private url: string = "https://stock.adobe.com/th/search?creator_id=";
  private browser: Browser | undefined;
  public userAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
  private pages: Page[] = [];
  private tab: number
  private maxOfPage: number = 1
  private maxPageB: boolean
  private UrlPerTab: number[][] = []
  private userIDAdobe = ""
  constructor (userID: string, tab: number, maxPageB: boolean) {
    this.userIDAdobe = userID
    this.url = this.url + userID
    this.tab = tab
    this.maxPageB = maxPageB
  }

  async start(): Promise<void> {
    try {
      if (this.browser) {
        throw new Error("Browser is already initialized");
      }

      this.browser = await puppeteer.launch({
        headless: true,
        devtools: false
      }) as Browser


      for (let i = 0; i < this.tab; i++) {
        const page = await this.browser!.newPage();
        page.setUserAgent(this.userAgent);
        this.pages.push(page);

      }
      if (this.maxPageB) {
        this.maxOfPage = await this.maxPage()
      }

      const maxLoop = Math.ceil(this.maxOfPage / this.tab)
      let page = []
      let totalPage = 0//this.maxOfPage
      for (let index = 0; index < maxLoop; index++) {
        page.push(Array.from({ length: this.tab }).map((_, j) => j + 1 + totalPage))
        totalPage = page.map((item) => item.length).reduce((a, b) => a + b, 0)
        if (totalPage > this.maxOfPage) {
          const popRound = totalPage - this.maxOfPage
          for (let subIndex = 0; subIndex < popRound; subIndex++) {
            page[index].pop()
          }
          break
        }
      }

      // console.log("page",page);

      // const maxPagePerTab = Math.ceil(this.maxOfPage / this.tab)
      // let page = []
      // let totalPage = 0//this.maxOfPage
      // for (let i = 0; i < this.tab; i++) {
      //   page.push(Array.from({ length: maxPagePerTab }).map((_, j) => j + 1 + totalPage))
      //   totalPage = page.map((item) => item.length).reduce((a, b) => a + b, 0)

      //   if (totalPage > this.maxOfPage) {
      //     const popRound = totalPage - this.maxOfPage
      //     for (let index = 0; index < popRound; index++) {
      //       page[i].pop()
      //     }
      //   }
      // }



      // console.log("page", page);
      this.UrlPerTab = page
    } catch (error) {
      throw new Error("Error launching browser: " + error);
    }
  }

  async lunchPuppeteer(pages: number[] = [1]): Promise<ImageType[]> {
    if (!this.browser) {
      throw new Error('Browser is not launched. Call launchBrowser() first.');
    }

    let results: ImageType[] = [];
    console.log("pages =>", pages);

    const promisePromt = pages.slice(0, pages.length).map(async (page, tab) => {
      const response = await this.pages[tab].goto(this.nextPage(page), { waitUntil: 'networkidle0' });
      if (response === null) {
        throw new Error(`Failed to get response for page ${page}`);
      }

      const data = await this.pages[tab].evaluate(() => {
        const images = Array.from(document.querySelectorAll("div.thumb-frame > a > picture > img"));

        return images.map((image) => {
          return {
            Round: 0,
            ImageUrl: (image.getAttribute('src') != '/v1/pics/placeholders/spacer.gif' ? image.getAttribute('src') : image.getAttribute('data-lazy')) || "",
            Title: image.getAttribute('alt')?.replace(/\s\s+/g, ' ') || '',
            Stage:"START",
            SeedID:"",
          } as ImageType
        })
      });

      results.push(...data)
    })

    await Promise.all(promisePromt)
    return results
  }

  private async maxPage(): Promise<number> {
    const response = await this.pages[0].goto(this.nextPage(1), { waitUntil: 'networkidle0' });
    if (response === null) {
      throw new Error(`Failed to get response for page ${1}`);
    }

    const maxPage = await this.pages[0].evaluate(() => {
      const maxPg = document.querySelector("#pagination-element > nav > span:nth-child(3) > span")
      const input = maxPg?.textContent as string;
      return Number(input.replace(/จาก\s+(\d+)\s+หน้า/, '$1'));
    })

    return maxPage as number
  }

  private nextPage(i: number): string {
    const url = this.url + `&filters[content_type:photo]=1&filters[content_type:illustration]=1&filters[content_type:zip_vector]=1&filters[content_type:video]=1&filters[content_type:template]=1&filters[content_type:3d]=1&filters[content_type:audio]=0&filters[include_stock_enterprise]=0&filters[is_editorial]=0&filters[fetch_excluded_assets]=1&filters[content_type:image]=1&order=relevance&limit=100&search_page=` + i + `&load_type=page&search_type=pagination&get_facets=0`
    return url
  }

  async close(): Promise<void> {
    if (!this.browser) {
      throw new Error("Browser is not initialized");
    }

    await this.browser.close();
    this.browser = undefined
    this.pages = []
  }

  async scrapeData(): Promise<void> {
    console.log("this.UrlPerTab", this.UrlPerTab);

    let imagess: ImageType[] = []
    for (let index = 0; index < this.UrlPerTab.length; index++) {
      const images = await this.lunchPuppeteer(this.UrlPerTab[index])

      imagess.push(...images)
      imagess = imagess.filter((item, index, self) =>
        index === self.findIndex((t) => t.Title === item.Title)
      );
    }

    imagess = imagess.map((item,index)=>{
      return {
        ...item,
        Round: index + 1,    }
    })
    // ฟังก์ชันในการกรอง title ซ้ำกันออก
    // const uniqueData = imagess.filter((item, index, self) =>
    //   index === self.findIndex((t) => t.Title === item.Title)
    // );
    let imageAll = imagess//await Promise.all(imagess);

    // console.log("images", imageAll);
    // Prepare CSV data
    // const csvData = imageAll.map((item, index) => `${index + 1},${item.ImageUrl},${item.Title}`).join('\n');
    // const csvPath = path.join(__dirname, '211030798.csv');
    // const csvData = imageAll.map((item, index) => `${item.Title},START`).join('\n');
    const csvPath = path.join(__dirname, this.userIDAdobe +'-transparent.txt');
    // // Write to CSV file
    await fs.writeFileSync(csvPath,JSON.stringify(imageAll));
    console.log(`Data saved to ${csvPath}`);

  }

}

(async function start() {
  try {
    const add = new AdobeStock("208410632", 4, true)
    await add.start()
    const images = await add.scrapeData()
    // console.log("images", ddd);

  } catch (error) {
    throw new Error("Error launching browser: " + error);
  }

})()