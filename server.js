var http = require('http'),
	url = require('url'),
	cache = require('cachemere'),
	fs = require('fs'),
	io = require('socket.io'),
	game = require('./game');

var index = fs.readFileSync('index.html');

var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

var server = http.createServer(function(req, res) {
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
});
server.listen(3006);

io = io.listen(server);

game.injectIO(io);
