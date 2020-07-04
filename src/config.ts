import fs from "fs";
import http from "http";
import os from "os";
import path from "path";
import tls from "tls";

export interface Config {
  storageDir: string;
  maxStorage: number;
  workers: number;
  httpPort: number;
  httpsPort: number;
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
  storageDir: path.join(os.tmpdir()),
  maxStorage: 10000000,
  workers: os.cpus().length,
  ui: true,
  uiDir: path.join(__dirname, "..", "dist"),
  httpPort: 8080,
  httpsPort: 8443,
  idSize: 10
};

export default function loadConfig() {
  const localConfig = path.join(process.cwd(), "config.json");

  if (fs.existsSync(localConfig)) {
    const data: Config = JSON.parse(fs.readFileSync(localConfig, { encoding: "utf8" }));
    config = { ...config, ...data };
  }

  return config;
}
