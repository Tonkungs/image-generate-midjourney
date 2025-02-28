import puppeteer, { Browser, Page } from 'puppeteer';

import FetchPuppeteer from "../src/util/fetch_image";
import { promises as fs } from 'fs';
class PuppeteerTabs {
    private browser: Browser | null = null;
    private pages: Page[] = [];

    async launchBrowser(): Promise<void> {
        this.browser = await puppeteer.launch({ headless: false });

        for (let i = 0; i < 4; i++){
            const page = await this.browser!.newPage();
            page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
            this.pages.push(page);
        }
    }

    // async openTabs(urls: string[]): Promise<void> {
    //     if (!this.browser) {
    //         throw new Error('Browser is not launched. Call launchBrowser() first.');
    //     }

    //     // Open up to 4 tabs without waiting for each to load
    //     const openPagePromises = urls.slice(0, 4).map(async (url) => {
    //         const page = await this.browser!.newPage();
    //         this.pages.push(page);
    //         await page.goto(url); // Navigate to the URL
    //     });

    //     await Promise.all(openPagePromises); // Wait for all pages to be opened
    // }
    async openTabs(imageUrls: string[]): Promise<Buffer[]> {
        if (!this.browser) {
            throw new Error('Browser is not launched. Call launchBrowser() first.');
        }

        // Open up to 4 tabs and download images as buffers
        const buffers: Buffer[] = [];

        const openPagePromises = imageUrls.slice(0, 4).map(async (imageUrl,index) => {
            // const page = await this.browser!.newPage();
            // page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
            // this.pages.push(page);
            const page = this.pages[index]//.bringToFront();

            // Navigate to the image URL and wait for the network to be idle
            const response = await page.goto(imageUrl, { waitUntil: 'networkidle0' });
            if (response === null) {
                throw new Error(`Failed to get response for ${imageUrl}`);
            }
            // const response: puppeteer.HTTPResponse | null = await page.goto(imageUrl, { waitUntil: 'networkidle0' });

            // Get the image buffer
            const buffer = await response.buffer();
            buffers.push(buffer); // Store the buffer

            // await page.close(); // Close the page after downloading
        });

        await Promise.all(openPagePromises); // Wait for all pages to finish
        return buffers; // Return the array of image buffers
    }

    async openTab(imageUrl: string): Promise<Buffer> {
        try {
            const page = await this.browser!.newPage();
            const response = await page.goto(imageUrl, { waitUntil: 'networkidle0' });
            if (response === null) {
                throw new Error('Failed to get response');
            }

            return await response.buffer()
        } catch (error: unknown) {
            throw new Error("Error downloading the image:" + (error as any).message);
        }
    }

    async switchToTab(index: number): Promise<void> {
        if (index < 0 || index >= this.pages.length) {
            throw new Error('Invalid tab index');
        }

        await this.pages[index].bringToFront();
    }

    async closeBrowser(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    getPages(): Page[] {
        return this.pages;
    }
}

// Usage example
(async () => {
    const urls = [
        'https://cdn.midjourney.com/873eb11f-fa51-45b2-9528-c9cb087cfa3e/0_0.png',
        'https://cdn.midjourney.com/873eb11f-fa51-45b2-9528-c9cb087cfa3e/0_1.png',
        'https://cdn.midjourney.com/873eb11f-fa51-45b2-9528-c9cb087cfa3e/0_2.png',
        'https://cdn.midjourney.com/873eb11f-fa51-45b2-9528-c9cb087cfa3e/0_3.png'
    ];

    const puppeteerTabs = new PuppeteerTabs();

    await puppeteerTabs.launchBrowser();
    const buffers = await puppeteerTabs.openTabs(urls);
    console.log('buffers =>', buffers.length);
     fs.writeFile('./test-code/test.png', buffers[0])
    // const buffer = await puppeteerTabs.openTab(urls[0]);  
    // fs.writeFile('./test-code/test.png', buffer)
    // Switch to the second tab (index 1)
    // await puppeteerTabs.switchToTab(0);

    // You can perform actions in the switched tab here

    // // Switch back to the first tab (index 0)
    // await puppeteerTabs.switchToTab(0);

    // // Close the browser when done
    await puppeteerTabs.closeBrowser();
    // ---------------------------------
    // const puppeteerTabs = new FetchPuppeteer();
    // await puppeteerTabs.start()
    // const buffers = await puppeteerTabs.lunchPuppeteerv2(urls);
    // console.log("buffers", buffers[0]);
    // fs.writeFile('./test.png', buffers[0])

})();
