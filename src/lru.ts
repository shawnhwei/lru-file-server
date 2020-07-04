import Debug from "debug";
import fs from "fs";
import path from "path";
import { Config } from "./config";

const debug = Debug("lruserve");

export default class LRU {
  private readonly config: Config;
  private totalSize = 0;
  private metadata: Map<string, any> = new Map();
  private sequence: string[] = [];

  public constructor(config: Config) {
    this.config = config;

    if (!fs.existsSync(config.storageDir)) {
      fs.mkdirSync(config.storageDir);
    }

    if (fs.existsSync(path.join(config.storageDir, "metadata.json")) &&
      fs.existsSync(path.join(config.storageDir, "sequence.json"))) {
      var metadataJSON = fs.readFileSync(path.join(config.storageDir, "metadata.json"), {
        encoding: "utf8"
      });
      var sequenceJSON = fs.readFileSync(path.join(config.storageDir, "sequence.json"), {
        encoding: "utf8"
      });

      var metadataTuples = JSON.parse(metadataJSON);
      var sequenceList = JSON.parse(sequenceJSON);

      this.metadata = new Map(metadataTuples);
      this.sequence = sequenceList;
    }

    process.on("SIGINT", () => {
      var metadataJSON = JSON.stringify([...this.metadata]);
      var sequenceJSON = JSON.stringify(this.sequence);

      fs.writeFileSync(path.join(config.storageDir, "metadata.json"), metadataJSON, {
        encoding: "utf8"
      });

      fs.writeFileSync(path.join(config.storageDir, "sequence.json"), sequenceJSON, {
        encoding: "utf8"
      });
    });
  }

  public info(id: string) {
    return this.metadata.get(id);
  }

  public async add(filename: string, info: any) {
    this.sequence.push(filename);
    this.metadata.set(filename, info);

    this.totalSize += info.size;

    debug(`Storage +${this.totalSize} bytes`);

    while (this.totalSize > this.config.maxStorage) {
      debug(`Storage limit exceeded (${this.totalSize} > ${this.config.maxStorage} bytes) starting eviction`);

      const evicted = this.sequence.shift()!;
      const evictedInfo = this.metadata.get(evicted);
      this.metadata.delete(evicted);

      debug(`Evicting file ${evicted}!`);

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
      debug(`Touching file ${filename}`);
      this.sequence.push(this.sequence.splice(index, 1)[0]);
      return true;
    } else {
      return false;
    }
  }

  public stats() {
    return {
      storage: {
        total: this.config.maxStorage,
        used: this.totalSize,
        percent: this.totalSize / this.config.maxStorage
      }
    };
  }
}
