require("dotenv").config();
import DataDBHandler, { ContentImage } from "../src/util/db";
import Logs from '../src/logs';
import { IContentImageByIdResponse, IContentImageResponse } from "./interface";
import axios from "axios";
import Ut, { Utils } from "../src/util/util";


interface IScrapImageConfig {
    log: Logs;
    DB: DataDBHandler;
}
class ScrapImage {
    private log: Logs;
    private DB: DataDBHandler;
    private URL_ADOBE = "https://stock.adobe.com"
    private MAX_PAGE = 100
    private MAX_PER_PAGE = 100
    private HEADER = {
        'Cookie': 'Variant_flex=1; "datadome=jOS~b8OnZNVvVzSUb~Bes6nFmrMXnW~yiLFbk1GvaW3EZGfWOtdyOjNH104mrAK_d31wel0LKMJi69M2d_dSSKqPQ84PDwkO~NO_eWi2J4Iu4VW2~cCtHVgfeUHjlTsR; Max-Age=31536000; Domain=.adobe.com; Path=/; Secure; SameSite=Lax"',
    }
    constructor (config: IScrapImageConfig) {
        this.log = config.log;
        this.DB = config.DB;
    }

    /**
     * start
     */
    public async start() {

        for (let index = 1; index <= this.MAX_PAGE; index++) {

            this.HEADER['Cookie'] = `'Variant_flex=1; ${await this.getCookie()}; Max-Age=31536000; Domain=.adobe.com; Path=/; Secure; SameSite=Lax"`
            const res = await this.retiveData('people',index)
            const images: ContentImage[] = []

            this.log.info(`Start Page: ${index}`);
            const keyLength = Object.keys(res.items).length
            let round = 1
            for (const key in res.items) {
                this.HEADER['Cookie'] = `'Variant_flex=1; ${await this.getCookie()}; Max-Age=31536000; Domain=.adobe.com; Path=/; Secure; SameSite=Lax"`

                const imageContent = await this.getByID(String(res.items[key].content_id))
                const keywords = this.perpareDataImageById(imageContent)
                this.log.info(`Round: ${round}/ ${keyLength}`);

                images.push({
                    content_id: res.items[key].content_id,
                    title: res.items[key].title,
                    thumbnail_url: res.items[key].thumbnail_url,
                    keywords: keywords,
                    // keywords: [s],
                    content_url: res.items[key].content_url,
                    category: res.items[key].category.name,
                    category_id: res.items[key].category.id,
                    author: res.items[key].author,
                    author_id: res.items[key].creator_id,
                    media_type_label: res.items[key].media_type_label,
                })

                await Ut.Delay(500)
                round++
            }
            // await Ut.Delay(3000)
            try {
                await this.DB.bulkInsertContent(images)
                console.log("images =>", images.length);
            } catch (error) {
                console.log("error");
                console.log(error);
            }

        }
    }

    private async retiveData(keyword: string, page: number = 1): Promise<IContentImageResponse> {
        try {
            const response = await axios.get(this.URL_ADOBE + '/Ajax/Search', {
                headers: {
                    ...this.HEADER
                },
                params: {
                    'filters[content_type:photo]': 1,
                    'filters[content_type:illustration]': 0,
                    'filters[content_type:zip_vector]': 0,
                    'filters[content_type:video]': 0,
                    'filters[content_type:template]': 0,
                    'filters[content_type:3d]': 0,
                    'filters[content_type:audio]': 0,
                    'filters[include_stock_enterprise]': 0,
                    'filters[is_editorial]': 0,
                    'filters[free_collection]': 0,
                    'filters[content_type:image]': 1,
                    k: keyword,
                    order: 'nb_downloads',
                    limit: this.MAX_PER_PAGE,
                    search_page: page,
                    'get_facets': 0
                }
            });
            const data = response.data as IContentImageResponse;
            return data;
        } catch (error) {
            this.log.error(`Error getting data: ${error}`, error);
            throw error
        }
    }

    private async getByID(id: string): Promise<IContentImageByIdResponse> {
        try {

            const response = await axios.get(this.URL_ADOBE + `/Ajax/MediaData/${id}?full=1`, {
                headers: {
                    ...this.HEADER,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
                    , 'accept-language': 'en-US,en;q=0.9'
                }
            });
            const data = response.data as IContentImageByIdResponse;
            return data;
        } catch (error) {
            this.log.error(`Error getting data getByID: ${error}`, error);
            throw error
        }
    }

    private perpareDataImageById(data: IContentImageByIdResponse): string[] {
        return data.keywords
    }

    private async getCookie(): Promise<string> {
        try {
            var qs = require('qs');
            var data = qs.stringify({
                'ddk': '444CF1A5D883126219A5CD03952C24'
            });
            var config = {
                method: 'post',
                url: 'https://dd.astockcdn.net/js/',
                headers: {
                    'referer': 'https://stock.adobe.com/',
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                data: data
            };
            const result = await axios(config);
            return result.data.cookie
        } catch (error) {
            this.log.error(`Error get cookie: ${error}`, error);
            throw new Error("Error get cookie");

        }
    }

}


const newScrapImage = new ScrapImage({
    log: new Logs(),
    DB: new DataDBHandler()
});
(async () => {
    try {
        await newScrapImage.start();
    } catch (error) {
        throw error
    }
})()