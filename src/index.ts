#!/usr/bin/env node
import cluster from "cluster";
import Debug from "debug";
import express from "express";
import http from "http";
import https from "https";
import loadConfig from "./config";
import LRU from "./lru";
import { routes } from "./routes";
import { RPCServer } from "./rpc";

const debug = Debug("lruserve");
const config = loadConfig();

Debug.enable("lruserve");

if (cluster.isMaster) {
  debug(`Master (${process.pid}) is running`);

  const lru = new LRU(config);
  const RPC = new RPCServer(lru);

  for (let i = 0; i < config.workers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    debug(`Worker ${worker.process.pid} died`);
  });
} else {
  debug(`Worker ${cluster.worker.id} (${process.pid}) is running`);

  const app = express();

  app.set("views", "./web")
  app.set("view engine", "pug")
  app.use(routes(config));

  if (!config.tls) http.createServer(app).listen(config.httpPort, () => {
    debug(`Worker ${cluster.worker.id} (${process.pid}) HTTP server listening on ${config.httpPort}`);
  });
  if (config.tls) https.createServer(config.tls, app).listen(config.httpsPort, () => {
    debug(`Worker ${cluster.worker.id} (${process.pid}) HTTPS server listening on ${config.httpsPort}`);
  });
}
