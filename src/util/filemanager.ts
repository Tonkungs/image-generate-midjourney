// import mime from 'mime';
import mime from 'mime-types';
import * as fs from 'fs';
  
export class FIleManager {
	protected filePath: string

	constructor (path: string) {
		if (path == "") {
			throw new Error("path is required");
		}
		this.filePath = path
	}


	public getFileBase64(): string {
		return Buffer.from(fs.readFileSync(this.filePath)).toString("base64")
	}

	/**
	 * getMimeType
	 */
	public getMimeType(): string {
		return mime.lookup(this.filePath) as string
	}

	public async Delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

	/**
     * ToMs
     */
    public ToHour(num: number = 1): number {
        return this.ToMinutes(num) * 60
    }

    public ToMinutes(num: number = 1): number {
        return this.ToSecound(num) * 60
    }

    public ToSecound(num: number = 1): number {
        return num * 1000
    }

}