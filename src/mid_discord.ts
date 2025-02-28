import { Midjourney } from './midjourney';
import { IMessage } from "./interface/message"
import Utils from './util/util';
import axios from 'axios';
export default class MidjourneyDiscord extends Midjourney {

  private Authorization: string;
  private MidjourneyChannelID = '1291762963174129696'//'1291762963174129696';
  private DisCordApi = "https://discord.com/api/v9"
  constructor (auth: string, mid: string = '1291762963174129696') {
    super()
    this.Authorization = auth
    this.MidjourneyChannelID = mid
  }

  async SendPromt(promt: string): Promise<any> {
    try {
      const nonce = Utils.nextNonce() //await this.getNonce()
      const bor = this.generateBoundary()
      // console.log("promt",promt);
      // console.log("nonce =>",nonce);
      // console.log("bor =>",bor);

      const data = await fetch(this.DisCordApi + `/interactions`, {
        "headers": {
          "authorization": this.Authorization,
          "content-type": "multipart/form-data; boundary=" + bor,
        },
        "body": "--" + bor + "\r\nContent-Disposition: form-data; name=\"payload_json\"\r\n\r\n{\"type\":2,\"application_id\":\"936929561302675456\",\"channel_id\":\"" + this.MidjourneyChannelID + "\",\"session_id\":\"bfa3890e0fa3276023e9a87e811ff667\",\"data\":{\"version\":\"1237876415471554623\",\"id\":\"938956540159881230\",\"name\":\"imagine\",\"type\":1,\"options\":[{\"type\":3,\"name\":\"prompt\",\"value\":\"" + promt + "\"}],\"application_command\":{\"id\":\"938956540159881230\",\"type\":1,\"application_id\":\"936929561302675456\",\"version\":\"1237876415471554623\",\"name\":\"imagine\",\"description\":\"Create images with Midjourney\",\"options\":[{\"type\":3,\"name\":\"prompt\",\"description\":\"The prompt to imagine\",\"required\":true,\"description_localized\":\"The prompt to imagine\",\"name_localized\":\"prompt\"}],\"dm_permission\":true,\"contexts\":[0,1,2],\"integration_types\":[0,1],\"global_popularity_rank\":1,\"description_localized\":\"Create images with Midjourney\",\"name_localized\":\"imagine\"},\"attachments\":[]},\"nonce\":\"" + nonce + "\",\"analytics_location\":\"slash_ui\"}\r\n--" + bor + "--\r\n",
        "method": "POST"
      });
      // const dd =  await data.json()
      // console.log("dd",dd);

    } catch (error) {
      console.log("error inside", error);
      // console.log("Wait 5 Second");
      // await Utils.Delay(5000)

      // await this.SendPromt(promt)
      throw error
    }
  }

  generateRandomHash() {
    const characters = '0123456789abcdef'; // อักษรที่ใช้ใน hash
    const length = 32; // ความยาวที่ต้องการ
    let result = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
  
    return result;
  }

  async SendPromtv2(promt: string): Promise<void> {
    try {
      const nonce = Utils.nextNonce();
      const bor = this.generateBoundary();

      // สร้าง FormData
      const formData = new FormData();

      // สร้าง payload JSON
      const payloadJson = {
        type: 2,
        application_id: "936929561302675456",
        channel_id: this.MidjourneyChannelID,
        session_id: this.generateRandomHash(),
        data: {
          version: "1237876415471554623",
          id: "938956540159881230",
          name: "imagine",
          type: 1,
          options: [
            {
              type: 3,
              name: "prompt",
              value: promt,
            },
          ],
          application_command: {
            id: "938956540159881230",
            type: 1,
            application_id: "936929561302675456",
            version: "1237876415471554623",
            name: "imagine",
            description: "Create images with Midjourney",
            options: [
              {
                type: 3,
                name: "prompt",
                description: "The prompt to imagine",
                required: true,
                description_localized: "The prompt to imagine",
                name_localized: "prompt",
              },
            ],
            dm_permission: true,
            contexts: [0, 1, 2],
            integration_types: [0, 1],
            global_popularity_rank: 1,
            description_localized: "Create images with Midjourney",
            name_localized: "imagine",
          },
          attachments: [],
        },
        nonce: nonce,
        analytics_location: "slash_ui",
      };

      // เพิ่มข้อมูลลงใน FormData
      formData.append("payload_json", JSON.stringify(payloadJson));

      const response = await axios.post(
        `${this.DisCordApi}/interactions`,
        formData,
        {
          headers: {
            "authorization": this.Authorization,
            // "content-type": `multipart/form-data; boundary=${bor}`, // Axios จะจัดการ boundary ให้
          },
        }
      );
      console.log("response", response.data);
      
      // return response.data; // ส่งกลับข้อมูล response
    } catch (error) {
      console.log("error inside", error);
      throw error; // โยน error สำหรับการจัดการเพิ่มเติม
    }
  }

  async GetPromts(limit: number = 10): Promise<IMessage[]> {
    try {
      const message = await fetch(this.DisCordApi + "/channels/" + this.MidjourneyChannelID + "/messages?limit=" + limit, {
        "headers": {
          "authorization": this.Authorization,
        },
        "body": null,
        "method": "GET"
      });
      const mes = await message.json()
      return mes
    } catch (error) {
      throw error

    }
  }

  /**
   * Sends a message to a specific Discord channel.
   * 
   * @param message - The content of the message to be sent.
   * @returns A promise that resolves with the response data from the Discord API or logs an error if the request fails.
   */
  async SendMessage(message: string): Promise<IMessage> {

    try {
      const result = await axios.post(this.DisCordApi +'/channels/'+this.MidjourneyChannelID+'/messages', {
        content: message,
        nonce: Utils.nextNonce(),
        tts: false,
        flags: 0
      }, {
        headers: {
          "authorization": this.Authorization,
        }
      })
      return result.data
    } catch (error) {
      throw new Error("Failed to send message: " + error);
    }
  }


  async DeletePromt(messageID: string): Promise<any> {
    try {
      await fetch(this.DisCordApi + "/channels/" + this.MidjourneyChannelID + "/messages/" + messageID + "/reactions/%E2%9D%8C/%40me", {
        "headers": {
          "authorization": this.Authorization,
        },
        "body": null,
        "method": "PUT"
      });

      // return await result.json()
    } catch (error) {
      throw error;
    }
  }

  private async getNonce(): Promise<string> {
    try {

      const myHeaders = new Headers();
      myHeaders.append("authorization", this.Authorization);
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        "content": "Send Promt for Nonce"
      });

      const requestOptions: RequestInit = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow' as RequestRedirect // Explicitly specify the type 
      };

      const result = await fetch(this.DisCordApi + `/channels/` + this.MidjourneyChannelID + `/messages`, requestOptions)
      let data = await result.json()

      return data.id
    } catch (error) {
      throw error
    }
  }

  private generateBoundary(): string {
    return "----WebKitFormBoundary" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  }

}