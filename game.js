var maxGames = 0xffffffff;

var games = {};

function initSocket(socket) {
	
	var id = "0";
	var name;
	var leader;

	function finishSetup(socket) {
		if(leader) {
			socket.on('changeroles', function(data) {
				for(var i = 0; i < data.length; i++) {
					games[id].roles[i].number = data[i].number;
				}
				games[id].update();
			});
			socket.on('start', function(data) {
				
			});
		}
		
		socket.on('personClickNight', function(data) {
		
		});
		
		socket.on('nominate', function(data) {
			
		});
		
		
	}
	
	socket.on('newgame', function(data) {
		id = newGame(data.name, socket);
		name = data.name;
		socket.emit('success', {});
		socket.emit('gameData', games[id].getSendData());
		leader = true;
	});
	
	socket.on('connect', function(data) {
		if(games[data.id] !== undefined) {
			var player = findPlayer(games[data.id], data.name);
			if(player !== null) {
				if(player.disconnected) {
					player.disconnected = undefined;
					socket.emit('gameData', games[data.id].getSendData());
					leader = false;
				} else {
					socket.emit('nameexists', {});
				}
			} else {
				if(games[data.id].setup) {
					games[data.id].players.push(new Player(data.name, socket));
					id = data.id;
					name = data.name;
					socket.emit('success', {});
					socket.emit('gameData', games[data.id].getSendData());
					leader = false;
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
	for(var i = 0; i < game.players.legnth; i++) {
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

function Player(name, socket) {
	this.name = name;
	this.socket = socket;
}

function Game(leaderName, socket, id) {
	var game = this;
	
	this.id = id;
	
	var leader = new Player(leaderName, socket);
	this.players = [leader];
	
	this.setup = true;
	
	this.day = false;
	
	this.roles = copyRoles();
	
	this.getLeader = function() {
		return this.players[0];
	}
	
	this.update = function() {
		for(player in this.players) {
			player.socket.emit('update', this.getSendData(player.name));
		}
	}
	
	this.getSendData = function(name) {
		var data = {id: game.id, setup: game.setup, day: game.day, roles: game.roles};
		data.players = [];
		for(p in game.players) {
			if(p.name === name) {
				data.players.push(p);
			} else {
				var pobj = {name: p.name, alive: p.alive};
				if(!p.alive) {
					pobj.role = p.role;
				}
				data.players.push(pobj);
			}
		}
		return data;
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

function pad(num) {
	var n = num.toString(16);
	while(n.length < 8) { n = "0" + n; }
	return n;
}

function newGame(leaderName, socket) {
	var id = 0;
	while(games[pad(id)] !== undefined) {
		id = Math.floor(Math.random() * maxGames);
	}
	id = pad(id);
	games[id] = new Game(leaderName, socket, id);
	
	return id;
}

exports.initSocket = initSocket;