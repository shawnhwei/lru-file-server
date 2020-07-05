import fs from "fs";
import http from "http";
import nanoid from "nanoid";
import os from "os";
import path from "path";
import tls from "tls";
import IORedis from "ioredis";

export interface Config {
  storageDir: string;
  maxStorage: number;
  workers: number;
  httpPort: number;
  httpsPort: number;
  sessions?: {
    secret: string;
  };
  provider?: string;
  grants?: any;
  redis: IORedis.RedisOptions;
  idSize: number;
  ui: boolean;
  uiDir: string;
  limits?: {
    fieldNameSize: number;
    fieldSize: number;
    fields: number;
    fileSize: number;
    files: number;
    parts: number;
    headerPairs: number;
  };
  tls?: tls.SecureContextOptions & tls.TlsOptions & http.ServerOptions;
}

let config: Config = {
  httpPort: 8080,
  httpsPort: 8443,
  redis: {},
  idSize: 10,
  maxStorage: 10000000,
  storageDir: path.join(os.tmpdir()),
  ui: true,
  uiDir: path.join(__dirname, "..", "dist"),
  workers: os.cpus().length
};

export default function loadConfig() {
  const localConfig = path.join(process.cwd(), "config.json");

  if (fs.existsSync(localConfig)) {
    const data: Config = JSON.parse(fs.readFileSync(localConfig, { encoding: "utf8" }));
    config = { ...config, ...data };
  }

  return config;
}
