var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', function(req, res) {
    res.sendfile('./public/index.html');
});

app.get('/wheelchair.html', function(req, res) {
    res.sendfile('./public/wheelchair.html');
});

http.listen(8000, function() {
	console.log('listening on port 8000');
} );

io.on('connection', function(socket) {
	socket.on('chat message', function(msg) {
		io.emit('chat message', msg);
	});
});
