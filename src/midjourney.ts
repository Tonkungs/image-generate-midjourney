export abstract class Midjourney {

  
    constructor() {
        
    }

    abstract SendPromt (promt:string)  :Promise<any>

    abstract GetPromts(limit :number) :Promise<any>

    abstract DeletePromt(messageID :string):Promise<any>

}