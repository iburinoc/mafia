var maxGames = 0xffffffff;

var games = {};

var deadGames = [];

function cleanDead() {
	for(var i = 0; i < deadGames.length; i++) {
		var id = deadGames[i]
		try {
			if(!(games[id].dead())) {
				deadGames.splice(i);
			} else {
				if(games[id].deadChecked) {
					deadGames.splice(i);
					delete games[i];
				} else {
					games[id].deadChecked = true;
				}
			}
		} catch(err) { console.log(err); }
	}
	for(i in games) {
		if(games[i].dead() && deadGames.indexOf(i) === -1) {
			deadGames.push(i);
		}
	}
	for(i in games) {
		console.log(games[i]);
	}
    console.log(deadGames);
}

setInterval(cleanDead, 60000);

function initSocket(socket) {
	var id = "0";
	var name;
	var leader;

	socket.on('roles', function(data) {
		try{
			if(!leader) return;
			console.log('roles' + data);
			for(var i = 0; i < data.length; i++) {
				games[id].roles[i].number = data[i].number;
			}
			games[id].update();
		} catch(err) { console.log(err) }
	});
	
	socket.on('start', function(data) {
		try{
			if(!leader) return;
			games[id].start();
		} catch(err) { console.log(err); }
	});

	socket.on('personClickNight', function(data) {
		if(!games[id].players[games[id].findPlayer(name)].picked) {
			games[id].nightClick(name, data);
		}
	});
	
	socket.on('nominate', function(data) {
		
	});
	
	socket.on('newgame', function(data) {
		id = newGame(data.name, socket);
		name = data.name;
		socket.emit('success', {});
		leader = true;
	});
	
	socket.on('connect', function(data) {
		if(games[data.id] !== undefined) {
			var player = games[data.id].players[games[data.id].findPlayer(data.name)];
			if(player !== undefined) {
				if(player.disconnected) {
					player.disconnected = undefined;
					socket.emit('gameData', games[data.id].getSendData(name));
					leader = !!player.leader;
				} else {
					socket.emit('nameexists', {});
				}
			} else {
				if(games[data.id].setup) {
					games[data.id].addPlayer(new Player(data.name, socket));
					id = data.id;
					name = data.name;
					socket.emit('success', {});
					leader = false;
				} else {
					socket.emit('inprogress', {});
				}
			}
		} else {
			socket.emit('notfound', {});
		}
	});
	
	function dc() {
		if(games[id] !== undefined) {
			if(games[id].setup) {
				games[id].players.splice(games[id].findPlayer(name));
				if(games[id].players.length === 0) {
                    delete games[id];
				} else {
					if(leader) {
						games[id].stop("Leader disconnected");
					}
					games[id].update();
				}
			} else {
				games[id].players[games[id].findPlayer(name)].disconnected = true;
				if(games[id].dead()) {
					deadGames.push(id);
				}
			}
		} else {
			console.log('wat dced from non-existant game');
		}
		name = '';
		id = '';
		leader = false;
	}
	
	socket.on('disconnect', dc);
	
	socket.on('dc', dc);
}

var roles = [{
	name: "Civilian",
	nightActivity: false,
	action: null,
	number: 0,
	consensus: true
},{
	name: "Mafia",
	nightActivity: true,
	action: "Choose someone to kill",
	number: 1,
	consensus: true
}];

function Player(name, socket) {
	this.name = name;
	this.socket = socket;
	this.alive = true;
}

function Game(leaderName, socket, id) {
	var game = this;
	
	this.id = id;
	
	var leader = new Player(leaderName, socket);
	leader.leader = true;
	this.players = [leader];
	
	this.setup = true;
	
	this.day = false;
	
	this.roles = copyObj(roles);
	
	this.getLeader = function() {
		return this.players[0];
	}
	
	this.update = function() {
		game.updateRoles();
		for(var i = 0; i < game.players.length; i++) {
			game.players[i].socket.emit('gameData', this.getSendData(game.players[i].name));
		}
		console.log(game);
	}
	
	this.addPlayer = function(p) {
		game.players.push(p);
		game.update();
	}
	
	this.updateRoles = function() {
		var n = 0;
		var civ;
		for(var i = 0; i < game.roles.length; i++) {
			var role = game.roles[i];
			if(role.name !== "Civilian") {
				n += role.number;
			} else {
				civ = role;
			}
			console.log(role.name + ":" + role.number);
		}
		civ.number = game.players.length - n;
		console.log(civ.name + ":" + civ.number);
	}
	
	this.nightClick = function(name, clickee) {
		var num = game.findPlayer(name);
		if(!game.players[num].picked) {
			game.players[num].selection = clickee;
			var updatees = [];
			if(game.players[num].role.consensus) {
				for(var p in game.players) {
					if(game.players[p].role === game.players[num].role) {
						updatees.push(game.players[p]);
					}
				}
			} else {
				updatees.append(game.players[num]);
			}
			for(var u = 0; i < updatees.length; u++) {
				updatees.socket.emit('data', game.getSendData(updatees[u].name));
			}
		}
	}

	this.findPlayer = function(name) {
		for(var i = 0; i < game.players.length; i++) {
			if(game.players[i].name === name) {
				return i;
			}
		}
		return -1;
	};
	
	this.getSendData = function(name) {
		var data = {id: game.id, setup: game.setup, day: game.day, roles: game.roles};
		var pobj = null;
		var index = game.findPlayer(name);
		data.players = [];
		for(var i = 0; i < game.players.length; i++) {
			var p = game.players[i];
			pobj = {name: p.name, alive: p.alive, leader: p.leader};
			if(game.players[index].role !== undefined && game.players[index].role === p.role && p.role.consensus) {
				pobj.selection = p.selection;
				pobj.picked = p.picked;
			}
			if(p.name === name) {
				pobj.role = p.role;
				pobj.selection = p.selection;
				pobj.picked = p.picked;
				console.log(p);
				console.log(pobj);
			} else {
				console.log(p);
				console.log(pobj);
				if(!p.alive) {
					pobj.role = p.role;
				}
			}
			data.players.push(pobj);
		}
		return data;
	};
	
	this.start = function() {
		if(!game.validateRoles()) {
			return;
		}
		
		for(var i = 0; i < game.roles.length; i++) {
			for(var j = 0; j < game.roles[i].number; j++) {
				var k;
				do {
					k = Math.floor(Math.random() * game.players.length);
				} while(game.players[k].role != undefined);
				game.players[k].role = game.roles[i];
			}
		}
		game.setup = false;
		game.day = false;
		
		game.update();
		
		for(var i = 0; i < game.players.length; i++) {
			game.players[i].socket.emit('start');
		}
	};
    
    this.stop = function(str) {
        for(var i = 0; i < game.players.length; i++) {
            game.players[i].socket.emit('stop', str);
        }
        game.players = [];
    }
	
	this.validateRoles = function() {
		var count = 0;
		for(var i = 0; i < game.roles.length; i++) {
			count += game.roles[i].number;
		}
		return count === game.players.length;
	};
	
	this.dead = function() {
		for(var i = 0; i < game.players.length; i++){ 
			if(!game.players[i].disconnected) {
				return false;
			}
		}
		return true;
	};
	
	console.log('new game');
	console.log(this);
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
	var id;
	do {
		id = Math.floor(Math.random() * maxGames);
	}
	while(games[pad(id)] !== undefined);
	id = pad(id);
	games[id] = new Game(leaderName, socket, id);
	games[id].update();
	return id;
}

exports.initSocket = initSocket;
