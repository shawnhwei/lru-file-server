import cluster from "cluster";
import debug from "debug";
import express from "express";
import http from "http";
import https from "https";
import loadConfig from "./config";
import LRU from "./lru";
import { routes } from "./routes";
import { RPCServer } from "./rpc";

const infolog = debug("lru:info");
const warnlog = debug("lru:warn");
const config = loadConfig();

if (cluster.isMaster) {
  infolog(`Master ${process.pid} is running`);

  const lru = new LRU(config);
  const RPC = new RPCServer(lru);

  for (let i = 0; i < config.workers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    warnlog(`Worker ${worker.process.pid} died`);
  });
} else {
  infolog(`Worker ${process.pid} is running`);

  const app = express();

  app.use(routes(config));

  if (!config.tls) http.createServer(app).listen(config.httpPort, () => {
    infolog(`Worker ${process.pid} HTTP server listening on ${config.httpPort}`);
  });
  if (config.tls) https.createServer(config.tls, app).listen(config.httpsPort, () => {
    infolog(`Worker ${process.pid} HTTPS server listening on ${config.httpsPort}`);
  });
}
