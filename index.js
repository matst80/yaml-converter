const { readFileSync } = require('fs')
const { getBoundary, getFileChunks, splitYaml, convertToJSON, asDeployments } = require('./utils')
const http = require('http')
const port = process.env.PORT ?? '8080'
const index = readFileSync('index.html', 'utf8')

const asDownload = (res) => (json) => {
	res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename=result.json' })
	res.end(JSON.stringify(json, asDeployments, 2))
}

http.createServer(function (req, res) {
	if (req.method === 'POST') {
		const boundary = getBoundary(req.headers['content-type'])
		return getFileChunks(req, boundary)
			.then(splitYaml)
			.then(convertToJSON)
			.then(asDownload(res))
	} else {
		return res.writeHead(200, { 'Content-Type': 'text/html' }).end(index)
	}
}).listen(Number(port))
console.log(`Server running at port ${port}`)