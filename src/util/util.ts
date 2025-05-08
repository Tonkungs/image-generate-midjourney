import { Epoch, Snowyflake } from "snowyflake";

export class Utils {
    private snowflake
    constructor () {
        this.snowflake = new Snowyflake({
            workerId: 0n,
            processId: 0n,
            epoch: Epoch.Discord, // BigInt timestamp
        });
    }

    public nextNonce(): string {
        return this.snowflake.nextId().toString();
    }

    public async Delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * RandomNumber
     */
    public RandomNumber(min: number = 5, max: number = 10): number {
        return Math.floor(Math.random() * (max - 1 + 1)) + min;
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

    /**
 * Removes the "https://" prefix from a URL string if it exists.
 *
 * @param url The input URL string.
 * @returns The URL string without the "https://" prefix,
 *          or the original string if the prefix is not found.
 */
    public RemoveHttpsPrefix(url: string): string {
    const prefix = 'https://';
    if (url.startsWith(prefix)) {
      // If the string starts with "https://", return the rest of the string
      return url.slice(prefix.length);
    }
    // Otherwise, return the original string
    return url;
  }
}

export default new Utils()