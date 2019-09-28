import express from "express";
import fs from "fs";
import multer from "multer";
import nanoid from "nanoid";
import path from "path";
import { Config } from "./config";
import { RPCClient } from "./rpc";

const router = express.Router();
const storage = multer.memoryStorage();

export function routes(config: Config) {
  const upload = multer({ storage, limits: config.limits });
  const RPC = new RPCClient();

  router.use("/stats", async (req: any, res, next) => {
    const stats = await RPC.lru_stats();

    res.json(stats);
  });

  router.use("/files", upload.single("file"), async (req: any, res, next) => {
    if (!["PUT", "POST"].includes(req.method)) next();

    const filename = nanoid() + path.extname(req.file.originalname);

    const info = {
      filename,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      size: req.file.size,
      id: filename
    };

    await RPC.lru_add(filename, info);

    await new Promise((resolve, reject) => {
      fs.writeFile(path.join(config.storageDir, filename), req.file.buffer, (err) => {
        if (err) reject(err);
        resolve();
      });
    });

    res.status(201).json(info);
  });

  router.use("/files", async (req, res, next) => {
    const id = req.url.slice(1);

    const found = await RPC.lru_touch(id);

    if (!found) {
      res.status(404).end();
    }

    next();
  });

  router.use("/files", express.static(config.storageDir, {
    dotfiles: "ignore",
    etag: true,
    fallthrough: true,
    immutable: true,
    index: false,
    lastModified: true,
    redirect: false
  }));

  router.use("/", express.static(config.uiDir, {
    dotfiles: "ignore",
    etag: true,
    fallthrough: false,
    immutable: true,
    index: ["index.html"],
    lastModified: true,
    redirect: true
  }));

  return router;
}
