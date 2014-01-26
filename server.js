var http = require('http'),
	url = require('url'),
	cache = require('cachemere'),
	fs = require('fs'),
	server = http.createServer(handler),
	io = require('socket.io').listen(server),
	game = require('./gamemaker'),
	index = fs.readFileSync('index.html');

server.listen(3006);

var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

function handler(req, res) {
	console.log(req.method + ":" + req.url);
	uri = url.parse(req.url).pathname;
	console.log(uri);
	if(uri == '/favicon.ico') {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('404 not found');
		res.end();
	}else if(uri == '/') {
		res.writeHead(200, {'Content-Type': mimeTypes["html"]});
		res.write(index);
		res.end();
		console.log('index written');
	} else if(uri.substring(0, 7) == '/client') {
		cache.fetch(req, function(err, resource) {
			if(err) {
				console.log(err);
				res.writeHead(404, {'Content-Type': 'text/plain'});
				res.write('404 not found');
				res.end();
			} else {
				resource.output(res);
				res.end();
				console.log('resources written');
			}
		});
	} else {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.write('404 not found');
		res.end();
	}
}

io.sockets.on('connection', function(socket) {
	game.initSocket(socket);
	console.log('socket connected');
});
