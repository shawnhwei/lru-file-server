import express from "express";
import session from "express-session";
import Debug from "debug";
import fs from "fs";
import Grant from "grant";
import Busboy from "busboy";
import nanoid from "nanoid";
import path from "path";
import { Config } from "./config";
import { RPCClient } from "./rpc";
import { Readable } from "stream";
import IORedis from "ioredis";
import ConnectRedis from "connect-redis";
import { HttpsProxyAgent } from "https-proxy-agent";

const router = express.Router();
const RedisStore = ConnectRedis(session);
const RPC = new RPCClient();

function has(object, key) {
  return object ? Object.prototype.hasOwnProperty.call(object, key) : false;
}

export function routes(config: Config) {
  if (config.sessions) {
    const client = new IORedis(config.redis);
    const store = new RedisStore({ client });

    router.use((req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    });

    router.use(session({
      store,
      ...config.sessions
    }));

    if (config.grants) {
      if (process.env.https_proxy || process.env.http_proxy) {
        const proxy = process.env.https_proxy as string || process.env.http_proxy as string;
        const agent = new HttpsProxyAgent(proxy);

        const grant = Grant.express({
          config: config.grants,
          request: { agent }
        });

        router.use(grant);
      } else {
        router.use(Grant.express({ config: config.grants }));
      }

      router.get("/oauth/callback", (req, res) => {
        if (req.session && req.session.grant && req.session.grant.response && req.session.grant.response.access_token) {
          res.redirect("/");
        } else {
          res.status(401).end();
        }
      });

      router.use((req, res, next) => {
        if (req.session && req.session.grant && req.session.grant.response && req.session.grant.response.access_token) {
          next();
        } else {
          res.redirect(`/connect/${config.provider}`);
        }
      });
    }
  }

  if (config.ui) {
    router.use("/", express.static(config.uiDir, {
      dotfiles: "ignore",
      etag: true,
      fallthrough: true,
      immutable: false,
      index: ["index.html"],
      lastModified: true,
      maxAge: 3600000,
      redirect: true
    }));
  }

  router.get("/stats", async (req, res) => {
    const stats = await RPC.lru_stats();

    res.json(stats);
  });

  router.get("/:id", async (req, res) => {
    const id = req.params.id;

    const found = await RPC.lru_touch(id);

    if (!found) {
      res.status(404).end();
      return;
    }

    const info = await RPC.lru_info(id);

    res.download(path.join(config.storageDir, info.filename), info.originalname);
  });

  router.put("/", (req, res) => {
    try {
      const busboy = new Busboy({
        headers: req.headers,
        limits: {
          files: 1,
          fileSize: config.limits?.fileSize ? config.limits.fileSize : config.maxStorage
        }
      });

      let info: any = {};

      busboy.on("file", (fieldname, readStream: Readable, origName, encoding, mimetype) => {
        const filename = nanoid(config.idSize);
        const filepath = path.join(config.storageDir, filename);
        const writeStream = fs.createWriteStream(filepath);
        let size = 0;

        info = {
          filename,
          originalname: origName,
          encoding: encoding,
          mimetype: mimetype,
          size: size,
          id: filename
        };

        readStream.pipe(writeStream);

        readStream.on("data", (chunk) => {
          size += chunk.length;
        });

        readStream.on("limit", () => {
          res.status(400).end();
        });

        readStream.on("error", () => {
          res.status(400).end();
        });

        writeStream.on("error", () => {
          res.status(400).end();
        });

        writeStream.on("finish", async () => {
          await RPC.lru_add(info.filename, info);
          res.status(201).json(info);
        })
      });

      req.pipe(busboy);
    } catch (err) {
      res.status(400).end();
    }
  });

  return router;
}
