var io;

var maxGames = 0xffffffff;

var games = {};

function initIO() {
	io.sockets.on('connection', function(socket) {
		initSocket(socket);
	});
}

function initSocket(socket) {
	var id;
	var name;
	socket.on('newgame', function(data) {
		id = newGame(data.name);
		name = data.name;
	});
	
	socket.on('connect', function(data) {
		if(games[data.id] !== undefined) {
			var player = findPlayer(games[data.id], data.name);
			if(player !== null) {
				if(player.disconnected) {
					player.disconnected = undefined;
					// TODO: send game data to client, they reconnected
				} else {
					socket.emit('nameexists', {});
				}
			} else {
				if(games[data.id].setup) {
					games[data.id].addPlayer(data.name);
				} else {
					socket.emit('inprogress', {});
				}
			}
		} else {
			socket.emit('notfound', {});
		}
	});
	
	socket.on('disconnect', function() {
		if(games[id] !== undefined) {
			if(games[id].setup) {
				games[id].players.splice(findPlayerIndex(games[id], name));
			} else {
				findPlayer(games[id], name).disconnected = true;
			}
		} else {
			console.log('wat dced from non-existant game');
		}
	});
}

function findPlayer(game, name) {
	return game.players[findPlayerIndex(game, name)];
}

function findPlayerIndex(game, name) {
	for(int i = 0; i < game.players.legnth; i++) {
		if(game.players[i].name === name) {
			return i;
		}
	}
	return -1;
}

var roles = [{
	name: "Mafia",
	nightActivity: true,
	action: "Choose someone to kill",
	number: 0,
	consensus: true
},
{
	name: "Civilian",
	nightActivity: false,
	action: null,
	number: 0,
	consensus: true
}];

function Player(name) {
	this.name = name;
}

function Game(leaderName, id) {
	this.id = id;
	
	var leader = new Player(leaderName);
	this.players = [leader];
	
	this.setup = true;
	
	this.day = false;
	
	this.roles = copyRoles();
	
	this.getLeader = function() {
		return this.players[0];
	}
}

function copyRoles() {
	r = [];
	for(role in roles) {
		r.push(copyObj(role));
	}
	return r;
}

function copyObj(o) {
	return JSON.parse(JSON.stringify(o));
}

function rmSensitive(game, player) {
	
}

function pad(num) {
	var n = num.toString(16);
	while(n.length < 8) { n = "0" + n; }
	return n;
}

function newGame(leaderName) {
	var id = 0;
	while(games[pad(id)] !== undefined) {
		id = Math.floor(Math.random() * maxGames);
	}
	id = pad(id);
	games[id] = new Game(leaderName, id);
	
	return id;
}

exports.injectIO = function(s) {
	io = s;
	initIO();
};
