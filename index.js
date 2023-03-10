const { readFileSync } = require("fs");
const { getBoundary, getFileChunks, splitYaml } = require("./utils");
const http = require("http");
const port = process.env.PORT ?? "8080";
const index = readFileSync("index.html", "utf8");

const asDownload = (res) => (content) => {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Content-Disposition": "attachment; filename=result.js",
  });
  res.end(content);
};

const toPulumi = ({ kind, apiVersion, metadata, ...data }) => {
  const { name, namespace, ...meta } = metadata;
  return `new ${kind}("${name}",${JSON.stringify(
    {
      metadata: { name, namespace: "REMOVE", ...meta },
      ...data,
    },
    null,
    2
  ).replace('space": "REMOVE"', 'space"')},options)`;
};

const toSlask = ({ kind, apiVersion, metadata, ...data }) => {
  const { name, namespace, ...meta } = metadata;
  return `create${kind}(namespace,${JSON.stringify(
    {
      metadata: { name, ...meta },
      ...data,
    },
    null,
    2
  )})`;
};

http
  .createServer(function (req, res) {
    if (req.method === "POST") {
      const boundary = getBoundary(req.headers["content-type"]);
      return getFileChunks(req, boundary)
        .then(splitYaml)
        .then(({ files, fields }) => {
          const { format } = fields;
          if (format === "pulumi") {
            return files.map(toPulumi).join("\n");
          } else if (format === "slask") {
            return files.map(toSlask).join("\n");
          }
          return JSON.stringify(files, null, 2);
        })
        .then(asDownload(res));
    } else {
      res.setHeader("Cache-Control", "public; max-age=604800");
      return res.writeHead(200, { "Content-Type": "text/html" }).end(index);
    }
  })
  .listen(Number(port));
console.log(`Server running at port ${port}`);
