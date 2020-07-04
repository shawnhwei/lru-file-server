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

  router.put("/", upload.single("file"), async (req, res) => {
    if (req.file.size > config.maxStorage) {
      res.status(400).end();
      return;
    }

    const filename = nanoid(config.idSize);

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

  return router;
}
