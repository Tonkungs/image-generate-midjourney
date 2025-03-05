require("dotenv").config();
import DataDBHandler, { ContentImage } from "../src/util/db";
import Logs from '../src/logs';
import { IContentImageByIdResponse, IContentImageResponse } from "./interface";
import axios from "axios";



interface IScrapImageConfig {
    log: Logs;
    DB: DataDBHandler;
}
class ScrapImage {
    private log: Logs;
    private DB: DataDBHandler;
    private URL_ADOBE = "https://stock.adobe.com"
    private MAX_PAGE = 100
    private HEADER = {
        'Cookie': 'Variant_flex=1; datadome=OKsSBK8iRGMfFjai0JBrPmsBxpC~wG3f4JzO9027lnlqKEEIDSgollOwMhpku7eu1V~hTkSQOBgUEVBCsjpkr59wy08hbEKUy6189fTt1WsOLVv8eUpOz0zbEUgeMmSk; AdobeStock=4d40209d1066f102dc377e018dcbef45; _fs_ch_st_FSBmUei20MqUiJb9=AepKxvgnZn87Qk1rb5t8JGCzORjCBp8opsrm_J9D4rZQzfNorkQL5ix-zUbbAMWXA6Loxf5ogaAigeno8G455NIRsVcgmHcaF47TDa73DzA9Tv23FMlHDLUwoa_tsDL5Hj-Tfu4MrESZwI1DstCdgIPQcQktTVJGIgProVZnwKwWBX1F1i0F8uXg3TM5VMnv-g2VWzR1GZcXpAJ6JNSoWvG_WAS7dw==; asui=7745b7667a2a542dafa6d6055f797c8f; ffuuid=SVyhPDtbkmkA1eleHPEsVg%3D%3D; gabt=595155%3AFreeBB_Test%2C599653%3AAffinity_2%2C598798%3AUpgradePP_test2%2C595368%3AUnifiedCTA_Test%2C78873790900000%3A0%2C1680740330%3A0%2C8512479036%3A1%2Cchecksum; isVisitorScriptAloneHosted=1; isid=a155e36d3cb52a49c61df36bd54a67f128a4daae; mboxDisable=true; mf=stk; visp=searchPg%3A1740900600%3BlandingPg%3A1740414300000%3BcontributorPg%3A1740414300%3BplansPg%3A1738512300',
    }
    constructor (config: IScrapImageConfig) {
        this.log = config.log;
        this.DB = config.DB;
    }

    /**
     * start
     */
    public async start() {
        const res = await this.retiveData('people', 1)
        const images: ContentImage[] = []
        const imageByID = await this.getByID('259728248')
        console.log("imageByID",imageByID);
        
        // for (const key in res.items) {
        //     images.push({
        //         content_id: res.items[key].content_id,
        //         title: res.items[key].title,
        //         thumbnail_url: res.items[key].thumbnail_url,
        //         keywords: [], //res.items[key].keywords,
        //         content_url: res.items[key].content_url,
        //         category: res.items[key].category.name,
        //         category_id: res.items[key].category.id,
        //         author: res.items[key].author,
        //         author_id: res.items[key].creator_id,
        //         media_type_label: res.items[key].media_type_label,
        //     })
        // }
    }

    private async retiveData(keyword: string, page: number = 1): Promise<IContentImageResponse> {
        try {
            const response = await axios.get(this.URL_ADOBE+'/Ajax/Search', {
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
                    limit: 100,
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

    private async getByID(id: string):Promise<IContentImageByIdResponse> {
        try {
            
            const response = await axios.get(this.URL_ADOBE+`/Ajax/MediaData/${id}?full=1`, {
                headers: {
                    ...this.HEADER,
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36'
                   ,'accept-language': 'en-US,en;q=0.9'
                }
            });
            const data = response.data as IContentImageByIdResponse;
            return data;
        } catch (error) {
            this.log.error(`Error getting data getByID: ${error}`, error);
            throw error
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