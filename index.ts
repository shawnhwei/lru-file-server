import express from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import uuid from "uuid";

const MAX_STORAGE = 300000;
const STORAGE_DIR = __dirname + "/testing";

const limits = {
  fieldNameSize: 100,
  fieldSize: 0,
  fields: 0,
  fileSize: 100000,
  files: 1,
  parts: 2,
  headerPairs: 1
};

let totalSize = 0;
const metadata: Map<string, any> = new Map();
const sequence: string[] = [];

const files = fs.readdirSync(STORAGE_DIR);

files.forEach(filename => {
  const file = path.join(STORAGE_DIR, filename);
  const stats = fs.statSync(file);

  sequence.push(file);
  metadata.set(file, {
    id: filename,
    size: stats.size
  });

  totalSize += stats.size;
});

console.log(totalSize);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, uuid.v4());
  }
});
const upload = multer({ storage, limits });
const app = express();

app.put("/files", upload.single("file"), (req: any, res) => {
  const info = {
    originalname: req.file.originalname,
    encoding: req.file.encoding,
    mimetype: req.file.mimetype,
    size: req.file.size,
    id: req.file.filename
  };

  sequence.push(req.file.path);
  metadata.set(req.file.path, info);

  totalSize += req.file.size;

  while (totalSize > MAX_STORAGE) {
    const evicted = sequence.shift()!;
    const evictedInfo = metadata.get(evicted);
    metadata.delete(evicted);

    console.log("Evicting", evicted);

    totalSize -= evictedInfo.size;

    fs.unlink(evicted, (err) => {
      if (err) console.error(err);
    });
  }

  console.log(totalSize);

  res.status(201).json(info);
});

app.use("/files", (req, res, next) => {
  const id = req.url.slice(1);
  const index = sequence.indexOf(id);

  if (index !== -1) {
    sequence.push(sequence.splice(index, 1)[0]);
  }

  next();
});

app.use("/files", express.static(STORAGE_DIR, {
  dotfiles: "ignore",
  etag: true,
  fallthrough: true,
  immutable: true,
  index: false,
  lastModified: true,
  redirect: false
}));

app.listen(3000);
