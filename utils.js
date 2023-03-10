const { parse } = require("yaml");

const getBoundary = (contentTypeHeader) => {
  const [_, boundaryOptions] = contentTypeHeader.split("; ");
  return "--" + boundaryOptions.split("=")[1];
};

const extractKeyValue = (p) => {
  console.log("hoho", p);
  const { headers, content } = p;
  const match = headers?.match(/name="(.*)"/);
  return match?.length ? [match[1], content.trim()] : null;
};

const isField = ({ headers }) =>
  headers?.length &&
  headers?.match(/name="(.*)"/) &&
  headers.indexOf("filename=") === -1;

const isFile = ({ headers, content }) =>
  content?.length > 10 && headers?.indexOf("filename=") > 0;

const getFileChunks = (req, boundary) =>
  new Promise((res) => {
    let body = [];
    req
      .on("data", (chunk) => {
        body.push(chunk);
      })
      .on("end", () => {
        const parts = Buffer.concat(body)
          .toString()
          .split(boundary)
          .map((chunk) => {
            [headers, content] = chunk.split("\r\n\r\n");
            return { headers, content };
          });

        const files = parts.filter(isFile).map((d) => d.content);
        const fields = Object.fromEntries(
          parts.filter(isField).map(extractKeyValue)
        );
        console.log(files, fields);
        res({ files, fields });
      });
  });

const toJson = (chunk) => {
  const { kind, apiVersion, metadata = {}, ...data } = parse(chunk);
  const { name, namespace, ...meta } = metadata;
  return {
    kind,
    apiVersion,
    metadata: { name, ...meta },
    ...data,
  };
};

const splitYaml = ({ files, fields }) => ({
  files: files
    .map((chunk) => chunk.split("---"))
    .flat()
    .map(toJson),
  fields,
});

module.exports = {
  getBoundary,
  getFileChunks,
  splitYaml,
};
