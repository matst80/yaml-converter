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

function asDeployments(key, value) {
	return value
}

module.exports = {
	getBoundary,
	getFileChunks,
	splitYaml,
	convertToJSON,
	asDeployments
}
