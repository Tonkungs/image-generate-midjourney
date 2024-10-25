import { HttpStatusCode } from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';

export default class FetchPuppeteer {
  private page: Page | undefined;
  private browser: Browser | undefined;
  public userAgent: string = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3';
  private MaxAgain:number = 5
  private again:number = 0
  constructor (again : number = 5) {
    this.again = again
  }

  /**
   * Launches a new Puppeteer browser instance and initializes a new page.
   * Sets the user agent for the page to the specified value.
   * If an error occurs during the browser launch, it throws an error with a descriptive message.
   */
  async start(): Promise<void> {
    try {
      if (this.browser) {
        throw new Error("Browser is already initialized");
      }

      this.browser = await puppeteer.launch({
        headless: true,
      }) as Browser
      this.page = await this.browser.newPage() as Page

      await this.page.setUserAgent(this.userAgent);
    } catch (error) {
      throw new Error("Error launching browser: " + error);
    }
  }



  /**
   * Downloads an image from a given URL using Puppeteer, and returns the image data as a Buffer.
   * @param imageUrl The URL of the image to download.
   * @returns A promise that resolves with the image data as a Buffer.
   * @throws If there is an error during the image download, it throws an error with a descriptive message.
   */
  async lunchPuppeteer(imageUrl: string) : Promise<Buffer>{
    try {

      if (!this.page) {
        throw new Error("page is not initialized");
      }

      const response = await this.page.goto(imageUrl, { waitUntil: 'networkidle0' });
      if (response === null) {
        throw new Error('Failed to get response');
      }

      if (!response.ok()) {
        console.log("response.status() =>",response.status());
        if (this.again <= this.MaxAgain) {
          console.log("imageUrl =>",imageUrl);
          console.log(`Cannot Download I retive download again in 10 seconds `+ new Date().toISOString());
          await new Promise((resolve) => setTimeout(resolve, 10000));
          this.again++
          return this.lunchPuppeteer(imageUrl);
        }

        throw new Error(`HTTP error! Status: ${response.status()}`);
      }

      this.again = 0
      return await response.buffer()
    } catch (error: unknown) {
      throw new Error("Error downloading the image:" + (error as any).message);
    }
  }

  /**
   * Closes the Puppeteer browser instance.
   * If the browser is not initialized, it throws an error with a descriptive message.
   * @throws {Error} If the browser is not initialized
   */

  async close(): Promise<void> {
    if (!this.browser) {
      throw new Error("Browser is not initialized");
    }
    
    await this.browser.close();

  }
}

