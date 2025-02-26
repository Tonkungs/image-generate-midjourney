import WebSocket from 'ws';
import axios from 'axios';
import { Buffer } from 'buffer';
import DataDBHandler, { IDataPromt } from "./src/util/db";
import * as path from 'path';
import * as process from 'process';
const cliProgress = require('cli-progress');
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const serverAddress = 'tower-outcome-perception-liverpool.trycloudflare.com';
const clientId = generateClientId();
const WSS_URL = `ws://${serverAddress}/ws?clientId=${clientId}`
const STEP = 20
const db = new DataDBHandler();

// ฟังก์ชันสำหรับสร้าง clientId ใหม่
function generateClientId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ฟังก์ชันสำหรับส่ง prompt ไปยัง ComfyUI
async function queuePrompt(prompt: object): Promise<any> {
    try {
        const response = await axios.post(`http://${serverAddress}/prompt`, prompt);
        return response.data;
    } catch (error) {
        console.error('Error queuing prompt:', error);
        throw error;
    }
}



// ฟังก์ชันสำหรับดึงภาพที่สร้างขึ้น
async function getImages(ws: WebSocket, prompt: object): Promise<any> {


    const promptId = (await queuePrompt(prompt)).prompt_id;
    console.log("promptId", promptId);

    const outputImages: any = {};

    ws.on('message', (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());

        if (message.type === "progress") {
            console.log("กำลังทำงาน " + message.data.promt_id + " รอบที่ ", message.data.value, ' / ', message.data.max);
        }


        if (message.type === "status" && message.data.status.exec_info.queue_remaining === 0) {
            ws.close();
        }

        console.log("message =>", JSON.stringify(message));
        console.log("message =>", message);
    });

    // รอจนกว่า WebSocket จะปิด
    await new Promise<void>((resolve) => {
        ws.on('close', () => {
            resolve();
        });
    });



    return outputImages;
}


function getCurrentTime(): number {
    return new Date().getTime(); // Get the current time in milliseconds
}
function generateRandomNoise() {
    let result = '';
    for (let i = 0; i < 15; i++) {
        // สำหรับหลักแรกไม่ให้เป็น 0
        if (i === 0) {
            result += Math.floor(Math.random() * 9) + 1;
        } else {
            result += Math.floor(Math.random() * 10);
        }
    }
    return result;
}


function getPrompt(params: string): any {
    return {
        "prompt": {
            "1": {
                "inputs": {
                    "unet_name": "flux1-dev-Q4_K_S.gguf"
                },
                "class_type": "UnetLoaderGGUF",
                "_meta": {
                    "title": "Unet Loader (GGUF)"
                }
            },
            "2": {
                "inputs": {
                    "model": [
                        "1",
                        0
                    ],
                    "conditioning": [
                        "11",
                        0
                    ]
                },
                "class_type": "BasicGuider",
                "_meta": {
                    "title": "BasicGuider"
                }
            },
            "3": {
                "inputs": {
                    "noise": [
                        "4",
                        0
                    ],
                    "guider": [
                        "2",
                        0
                    ],
                    "sampler": [
                        "5",
                        0
                    ],
                    "sigmas": [
                        "6",
                        0
                    ],
                    "latent_image": [
                        "7",
                        0
                    ]
                },
                "class_type": "SamplerCustomAdvanced",
                "_meta": {
                    "title": "SamplerCustomAdvanced"
                }
            },
            "4": {
                "inputs": {
                    "noise_seed": generateRandomNoise()
                },
                "class_type": "RandomNoise",
                "_meta": {
                    "title": "RandomNoise"
                }
            },
            "5": {
                "inputs": {
                    "sampler_name": "euler"
                },
                "class_type": "KSamplerSelect",
                "_meta": {
                    "title": "KSamplerSelect"
                }
            },
            "6": {
                "inputs": {
                    "scheduler": "simple",
                    "steps": STEP,
                    "denoise": 1,
                    "model": [
                        "1",
                        0
                    ]
                },
                "class_type": "BasicScheduler",
                "_meta": {
                    "title": "BasicScheduler"
                }
            },
            "7": {
                "inputs": {
                    "width": 1280,
                    "height": 720,
                    "batch_size": 1
                },
                "class_type": "EmptyLatentImage",
                "_meta": {
                    "title": "Empty Latent Image"
                }
            },
            "8": {
                "inputs": {
                    "samples": [
                        "3",
                        0
                    ],
                    "vae": [
                        "9",
                        0
                    ]
                },
                "class_type": "VAEDecode",
                "_meta": {
                    "title": "VAE Decode"
                }
            },
            "9": {
                "inputs": {
                    "vae_name": "ae.safetensors"
                },
                "class_type": "VAELoader",
                "_meta": {
                    "title": "Load VAE"
                }
            },
            "10": {
                "inputs": {
                    "filename_prefix": "api_v2_",
                    "images": [
                        "8",
                        0
                    ]
                },
                "class_type": "SaveImage",
                "_meta": {
                    "title": "Save Image"
                }
            },
            "11": {
                "inputs": {
                    "guidance": 3.5,
                    "conditioning": [
                        "12",
                        0
                    ]
                },
                "class_type": "FluxGuidance",
                "_meta": {
                    "title": "FluxGuidance"
                }
            },
            "12": {
                "inputs": {
                    "text": params,
                    "clip": [
                        "13",
                        0
                    ]
                },
                "class_type": "CLIPTextEncode",
                "_meta": {
                    "title": "CLIP Text Encode (Prompt)"
                }
            },
            "13": {
                "inputs": {
                    "clip_name1": "t5-v1_1-xxl-encoder-Q4_K_S.gguf",
                    "clip_name2": "clip_l.safetensors",
                    "type": "flux"
                },
                "class_type": "DualCLIPLoaderGGUF",
                "_meta": {
                    "title": "DualCLIPLoader (GGUF)"
                }
            },
            // "14": {
            //     "inputs": {
            //     "images": [
            //         "8",
            //         0
            //     ]
            //     },
            //     "class_type": "SaveImageWebsocket",
            //     "_meta": {
            //     "title": "SaveImageWebsocket"
            //     }
            // }
        }
    }
}
// Get images
// Execution Time: 3:52.061 (m:ss.mmm)
// Execution Time: 232061 milliseconds
// ฟังก์ชันหลัก
async function main() {
    console.time("Execution Time"); // Start the timer
    // const startTime = getCurrentTime(); // Start time


        // const promtText = await db.findFirstStart()
        // const promtText = {
        //     ID: "953d8b37-c30a-4f9d-8e8d-09ba4e743fa1",
        //     Title: `Autumn foliage in Denali National Park, Alaska, with a lone cabin. Foreground displays vibrant red and gold leaves of dwarf birch and aspen trees. The middle ground features a rustic log cabin nestled in the woods. Background reveals the snow-dusted peaks of the Alaska Range under a partly cloudy sky. Warm autumnal colors create a cozy, inviting scene. 4K, ultra HD, high resolution, sharp and detailed. Peaceful, nostalgic, photographed during golden hour.`
        // }
        // // console.log("promtText?.Title", promtText);
        // if (promtText?.ID === undefined) {
        //     throw new Error("Error finding prompt text"); 
        // }

        // let promptText: any = getPrompt(`${promtText?.Title} high detail 8k `)
        // // promtTextID = promtText?.ID as string

        // const promptId = (await queuePrompt(promptText)).prompt_id;


    let promtTextID = ''
    // สร้าง WebSocket connection
    const ws = new WebSocket(WSS_URL);

    ws.on('open', async () => {
        try {
        } catch (error) {
            console.error('Error getting images:', error);
        }
    });


    ws.on('message', async (data: WebSocket.Data) => {
        const message = JSON.parse(data.toString());
     

        if (message.type === "progress") {

            bar1.update(message.data.value);
            if (message.data.value === message.data.max) {
                // const find = await db.findByPromtID(message.data.prompt_id)
                try {
                    if (promtTextID === "") {
                        throw new Error("promtTextID is empty");
                    }
                    await db.updateStageByID(promtTextID as string, "WAITING_DOWNLOAD", "", message.data.prompt_id);
                    bar1.stop();
                } catch (error) {
                    console.log(error);
                    ws.close();
                    throw new Error("Error updating stage");
                }
            }
        }

        // console.log("message =>",JSON.stringify(message));
        //  console.log("กำลังทำงาน " + message.data.prompt_id + " รอบที่ ", message.data.value, ' / ', message.data.max);

        if (message.type === "status" && message.data.status.exec_info.queue_remaining === 0) {
            const promtText = await db.findFirstStart()
            // const promtText = {
            //     ID: "953d8b37-c30a-4f9d-8e8d-09ba4e743fa1",
            //     Title: `Aerial view, braided rivers of Denali, patterns in gravel and ice, remote and untouched. The intricate network of waterways creates a mesmerizing tapestry across the landscape. The varying colors of the water, from glacial blue to muddy brown, add depth and complexity. The surrounding terrain is rugged and mountainous, with patches of snow and ice clinging to the peaks. Capture the scale and beauty of the natural patterns, emphasizing the remoteness and pristine condition of the Alaskan wilderness. The perspective should give a sense of vastness and interconnectedness.`
            // }
            // // console.log("promtText?.Title", promtText);
            if (promtText?.ID === undefined) {
                throw new Error("Error finding prompt text"); 
            }

            let promptText: any = getPrompt(`${promtText?.Title} high detail 8k `)
            promtTextID = promtText?.ID as string

            const promptId = (await queuePrompt(promptText)).prompt_id;
            await db.updateStageByID(promtText?.ID as string, "WAITING", "", promptId);
            console.log("เริ่มรอบใหม่ ",promtText?.ID ,' PROMT ID', promptId);
            bar1.start(STEP, 0);
        }

    })
    // 44182
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    // const ob = await queuePrompt(promptText)
    // {
    //     prompt_id: '87600521-f723-44bb-8d7a-d7cf67c4d327',
    //     number: 23,
    //     node_errors: {}
    //   }
    // console.log("ob",ob);
    // const history = await getHistory('953d8b37-c30a-4f9d-8e8d-09ba4e743fa1');
    // console.log("history =>",history);
    // console.log("history =>",history['adc4230b-9726-440d-848a-04c96a7c0590'].outputs['10']);
}

main().catch((error) => {
    console.error('Error in main function:', error);
});
