import debug from "debug";
import fs from "fs";
import path from "path";
import { Config } from "./config";

const lrulog = debug("lru:lru");

export default class LRU {
  private readonly config: Config;
  private totalSize = 0;
  private metadata: Map<string, any> = new Map();
  private sequence: string[] = [];

  public constructor(config: Config) {
    this.config = config;

    fs.readdirSync(config.storageDir).forEach(filename => {
      const dest = path.join(config.storageDir, filename);
      const stats = fs.statSync(dest);

      this.add(filename, {
        id: filename,
        size: stats.size
      });
    });
  }

  public info(id: string) {
    return this.metadata.get;
  }

  public async add(filename: string, info: any) {
    this.sequence.push(filename);
    this.metadata.set(filename, info);

    this.totalSize += info.size;

    lrulog(`Storage size increased to ${this.totalSize} bytes`);

    while (this.totalSize > this.config.maxStorage) {
      lrulog(`Storage size too large (${this.totalSize} > ${this.config.maxStorage} bytes) starting eviction`);

      const evicted = this.sequence.shift()!;
      const evictedInfo = this.metadata.get(evicted);
      this.metadata.delete(evicted);

      lrulog(`Evicting file ${evicted}!`);

      this.totalSize -= evictedInfo.size;

      await new Promise((resolve, reject) => {
        fs.unlink(path.join(this.config.storageDir, evicted), (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    }
  }

  public touch(filename: string) {
    const index = this.sequence.indexOf(filename);

    if (index !== -1) {
      lrulog(`Touching file ${filename}`);
      this.sequence.push(this.sequence.splice(index, 1)[0]);
      return true;
    } else {
      return false;
    }
  }
}
