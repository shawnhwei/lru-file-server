import fs from "fs";
import * as http from "http";
import os from "os";
import path from "path";
import * as tls from "tls";

export interface Config {
  storageDir: string;
  maxStorage: number;
  workers: number;
  httpPort: number;
  httpsPort: number;
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
  storageDir: os.tmpdir(),
  maxStorage: 100000000,
  workers: os.cpus().length,
  ui: true,
  uiDir: path.join(__dirname, "..", "ui"),
  httpPort: 8080,
  httpsPort: 8443
};

export default function loadConfig() {
  let configFile: string;

  switch (os.type()) {
    case "Windows_NT":
      configFile = path.join(process.cwd(), "config.json");
      break;
    case "Linux":
    case "Darwin":
    default:
      configFile = path.join(path.sep + "etc", "lruserve", "config.json");
  }

  const data: any = JSON.parse(fs.readFileSync(configFile, { encoding: "utf8" }));

  config = { ...config, ...data };

  return config;
}
