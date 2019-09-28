import cluster from "cluster";
import LRU from "./lru";

interface Deferred {
  promise: Promise<unknown>;
  then: any;
  catch: any;
  resolve: any;
  reject: any;
}

const Deferred = function (this: Deferred): Deferred {
  const self = this;
  const p = this.promise = new Promise((resolve, reject) => {
    self.resolve = resolve;
    self.reject = reject;
  });
  this.then = this.promise.then.bind(p);
  this.catch = this.promise.catch.bind(p);
  return this;
  // tslint:disable-next-line:callable-types
} as any as { new(): Deferred };

export enum LRURPC {
  Add,
  Touch,
  Info,
  Stats
}

export class RPCServer {
  private readonly promises: Map<number, Deferred> = new Map();
  private readonly lru: LRU;

  constructor(lru: LRU) {
    this.lru = lru;
    cluster.on("message", this.handleMessage.bind(this));
  }

  private async handleMessage(worker: cluster.Worker, data: any) {
    if (data.action === LRURPC.Add) {
      await this.lru.add(data.filename, data.info);

      worker.send({
        handle: data.handle,
        action: LRURPC.Add,
        filename: data.filename
      });
    } else if (data.action === LRURPC.Touch) {
      const found = this.lru.touch(data.id);

      worker.send({
        handle: data.handle,
        action: LRURPC.Touch,
        id: data.id,
        found
      });
    } else if (data.action === LRURPC.Info) {
      const info = this.lru.info(data.id);

      worker.send({
        handle: data.handle,
        action: LRURPC.Info,
        id: data.id,
        info
      });
    } else if (data.action === LRURPC.Stats) {
      const stats = this.lru.stats();

      worker.send({
        handle: data.handle,
        action: LRURPC.Stats,
        stats
      });
    }
  }
}

export class RPCClient {
  private readonly promises: Map<number, Deferred> = new Map();
  private counter = 0;

  constructor() {
    process.on("message", this.handleMessage.bind(this));
  }

  public lru_add(filename: string, info: any): Promise<any> {
    const handle = this.counter++;
    const promise = new Deferred();

    this.promises.set(handle, promise);

    process.send!({
      handle,
      action: LRURPC.Add,
      filename,
      info
    });

    return promise as unknown as Promise<any>;
  }

  public lru_touch(id: string): Promise<any> {
    const handle = this.counter++;
    const promise = new Deferred();

    this.promises.set(handle, promise);

    process.send!({
      handle,
      action: LRURPC.Touch,
      id
    });

    return promise as unknown as Promise<any>;
  }

  public lru_info(id: string): Promise<any> {
    const handle = this.counter++;
    const promise = new Deferred();

    this.promises.set(handle, promise);

    process.send!({
      handle,
      action: LRURPC.Info,
      id
    });

    return promise as unknown as Promise<any>;
  }

  public lru_stats(): Promise<any> {
    const handle = this.counter++;
    const promise = new Deferred();

    this.promises.set(handle, promise);

    process.send!({
      handle,
      action: LRURPC.Stats
    });

    return promise as unknown as Promise<any>;
  }

  private handleMessage(data: any) {
    if (this.promises.has(data.handle)) {
      if (data.action === LRURPC.Add) {
        this.promises.get(data.handle)!.resolve();
      } else if (data.action === LRURPC.Touch) {
        this.promises.get(data.handle)!.resolve(data.found);
      } else if (data.action === LRURPC.Info) {
        this.promises.get(data.handle)!.resolve(data.info);
      } else if (data.action === LRURPC.Stats) {
        this.promises.get(data.handle)!.resolve(data.stats);
      }
    }
  }
}
