const { readFileSync } = require('fs')
const http = require('http')
const { parse } = require('yaml')

const getBoundary = (contentTypeHeader) => {
	const [_, boundaryOptions] = contentTypeHeader.split('; ')
	return '--' + boundaryOptions.split('=')[1]
}

const getFileChunks = (req, boundary) => new Promise((res) => {
	let body = []
	req.on('data', (chunk) => {
		body.push(chunk)
	}).on('end', () =>
		res(Buffer.concat(body).toString().split(boundary).filter(chunk => chunk && chunk.indexOf('filename=') > 0).map((chunk) => {
			return chunk.split('\r\n\r\n')[1]
		}))
	)
})

const splitYaml = (chunks) => chunks.map(chunk => chunk.split('---')).flat()

const convertToJSON = (chunks) => chunks.filter(chunk => chunk != null).map((chunk) => {
	const { kind, apiVersion, metadata, ...data } = parse(chunk)
	const { name, namespace, ...meta } = metadata
	return {
		kind,
		apiVersion,
		metadata: { name, ...meta },
		...data
	}
})

const index = readFileSync('index.html', 'utf8')

function asDeployments(key, value) {
	console.log(key, value)
	return value
}

http.createServer(function (req, res) {
	if (req.method === 'POST') {
		return getFileChunks(req, getBoundary(req.headers['content-type'])).then(splitYaml).then(convertToJSON).then((json) => {
			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify(json, asDeployments, 2))
		})
	} else {
		return res.writeHead(200, { 'Content-Type': 'text/html' }).end(index)
	}
}).listen(8080)