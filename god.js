var maxGames = 0xffffffff; // The range of games

var games = {}; // Associative array of all current games

var deadGames = []; // Games ready for collection

var messageLimit = 5; // TODO: message system.  this should be increased to ~100?

var secondTimer = 15;

function cleanDead() { // checks for dead games every minute
	for(var i = 0; i < deadGames.length; i++) {
		var id = deadGames[i]
		try {
			if(!(games[id].isdead())) {
				deadGames.splice(i);
			} else {
				if(games[id].deadChecked) {
					delete games[deadGames[i]];
					deadGames.splice(i);
				} else {
					games[id].deadChecked = true;
				}
			}
		} catch(err) { console.log(err); }
	}
	for(i in games) {
		if(games[i].isdead() && deadGames.indexOf(i) === -1) {
			deadGames.push(i);
		}
	}
	for(i in games) {
		console.log(games[i]);
	}
    console.log(deadGames);
}

setInterval(cleanDead, 60000);

//TODO: add input checking cuz theres probably a bunch of things a bad person could do here
function initSocket(socket) { // init this when the person connects.
	var id = "0";
	var name; // TODO: add checking for the name
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
		try{
			if(games[id].pAlive(name) && !games[id].players[games[id].findPlayer(name)].picked) {
				games[id].nightClick(name, data);
			}
		} catch(err) {console.log(err)};
	});
	
	socket.on('nomination', function(data) {
		try{
			if(games[id].pAlive(name) && games[id].phase === 'nomination' && games[id].day && !games[id].players[games[id].findPlayer(data)].nominated) {
				games[id].nomination(name, data);
			}
		} catch(err) {console.log(err)};
	});
	
	socket.on('newgame', function(data) {
		try{
			if(games[id]) {
				return;
			}
			id = newGame(data.name, socket);
			name = data.name;
			socket.emit('success', {});
			leader = true;
		} catch(err) {console.log(err)};
	});
	
	socket.on('connect', function(data) {
		try{
			if(games[data.id] !== undefined) {
				var player = games[data.id].players[games[data.id].findPlayer(data.name)];
				if(player !== undefined) { // am i ever gonna fix this?
					if(player.disconnected && data.name !== "God") {
						player.disconnected = undefined;
						socket.emit('gameData', games[data.id].getSendData(data.name));
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
		} catch(err) {console.log(err)};
	});
	
	socket.on('message', function(data) {
		games[id].message('<' + name + '> ' + data);
	});
	
	
	function dc() { // dc, its a named function as it could be called from returning to menu or from disconnecting socket
		// when all players have dc'ed, it is ready for garbage collection
		try{
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
					if(games[id].isdead()) {
						deadGames.push(id);
					}
				}
			} else {
				console.log('wat dced from non-existant game');
			}
			name = '';
			id = '';
			leader = false;
		} catch(err) {console.log(err)};
	}
	
	socket.on('disconnect', dc);
	
	socket.on('dc', dc);
}

// list of roles, pretty self explanatory
var roles = [{
	name: "Civilian",
	nightActivity: false,
	action: null,
	number: 0,
	consensus: false,
	order: -1,
	nightActionS: function() {},
	nightActionE: function() {}
},{
	name: "Mafia",
	nightActivity: true,
	action: "Choose someone to kill",
	number: 1,
	consensus: true,
	order: 1,
	nightActionS: function(game, selection, selecter) {
		selection.mark.mafia = true;
	},
	nightActionE: function(game, selection, selecter) {
		if(selection && selection.mark.mafia) {
			game.kill(selection);
			game.message('<God> ' + selection.name + ' was killed by the mafia.');
			delete selection.mark.mafia;
		}
	}
}];

function Player(name, socket) { // Player constructor
	this.name = name;
	this.socket = socket;
	this.alive = true;
	this.mark = {};
	this.message = "";
}

function Game(leaderName, socket, id) { // Game constructor
	var game = this; // damn function objects
	
	this.id = id;
	
	var leader = new Player(leaderName, socket);
	leader.leader = true;
	this.players = [leader];
	
	this.dead = [];
	
	this.setup = true;
	
	this.day = false;
	
	this.roles = copyObj(roles); // change this at some point?  the only mutable part is the number for each
	
	var nomtimer;
	
	function nomtimerCounter() {
		if(game.timer > 0) {
			game.timer--;
			console.log('nomtimer' + game.id + ': ' + game.timer);
		} else if(game.timer === 0) {
			game.nomdone();
		}
	}
	
	this.message = function(message, dest) {
		if(dest) {
			var index = game.findPlayer(dest);
			if(index != -1) {
				game.players[index].socket.emit('message', message);
			}
		} else {
			for(var p in game.players) {
				game.players[p].socket.emit('message', message);
			}
		}
	}

	this.addPlayer = function(p) {
		game.players.push(p);
		game.update();
	}
	
	this.kill = function(p) {
		game.dead.push(p);
		p.alive = false;
		game.players.splice(game.findPlayer(p.name), 1);
	}

	this.update = function() { // updates all clients
		if(game.setup)
			game.updateRoles();
		for(var i = 0; i < game.players.length; i++) {
			game.players[i].socket.emit('gameData', this.getSendData(game.players[i].name));
		}
		console.log(game);
	}
	
	this.updateRoles = function() { // for when the leader changes numbers
		var n = 0;
		var civ;
		for(var i = 0; i < game.roles.length; i++) {
			var role = game.roles[i];
			if(role.name !== "Civilian") {
				n += role.number;
			} else {
				civ = role;
			}
		}
		civ.number = game.players.length - n;
	}
	
	this.nightClick = function(name, clickee) {
		var num = game.findPlayer(name);
		console.log(name + ' clicked on ' + clickee);
		if(num === -1) return;
		if(!game.players[num].picked) {
			game.players[num].selection = clickee;
			var updatees = [];
			if(game.players[num].role.consensus) {
				var cons = true;
				for(var p in game.players) {
					if(game.players[p].role.name === game.players[num].role.name) {
						updatees.push(game.players[p]);
						//console.log(game.players[p].selection);
						//console.log(clickee);
						if(game.players[p].selection !== clickee) {
							cons = false;
						}
					}
				}
				if(cons) {
					for(var i = 0; i < updatees.length; i++) {
						updatees[i].picked = true;
					}
				}
			} else {
				updatees.append(game.players[num]);
				game.players[num].picked = true;
			}
			for(var u = 0; u < updatees.length; u++) {
				updatees[u].socket.emit('gameData', game.getSendData(updatees[u].name));
			}
		}
		game.checkDoneNight();
	}
	
	this.nomination = function(nominator, nominatee) {
		game.nominator = nominator;
		game.nominatee = nominatee;
		game.timer = secondTimer;
		game.phase = 'second';
		game.players[game.findPlayer(nominatee)].nominated = true;
		nomtimer = setInterval(nomtimerCounter, 1000);
		game.update();
	}
	
	this.nomdone = function() {
		delete game.nominator;
		delete game.nominatee;
		game.phase = 'nomination';
		clearInterval(nomtimer);
		game.update();
	}

	this.checkDoneNight = function() {
		for(var i = 0; i < game.players.length; i++) {
			if(!game.players[i].picked && game.players[i].role.nightActivity) {
				return;
			}
		}
		setTimeout(game.endNight, 1000);
	};

	this.endNight = function() {
		console.log('night ended for ' + game.id);
		ordRoles = {};
		for(var i = 0; i < roles.length; i++) {
			if(roles[i].nightActivity) {
				ordRoles[roles[i].order] = roles[i];
			}
		}
		
		for(var i in ordRoles) {
			var role = ordRoles[i];
			for(var j = 0; j < game.players.length; j++) {
				if(game.players[j].role.name === role.name) {
					role.nightActionS(game, game.players[game.findPlayer(game.players[j].selection)], game.players[j]);
				}
			}
		}

		for(var i in ordRoles) {
			var role = ordRoles[i];
			for(var j = 0; j < game.players.length; j++) {
				if(game.players[j].role.name === role.name) {
					role.nightActionE(game, game.players[game.findPlayer(game.players[j].selection)], game.players[j]);
				}
			}
		}
		game.day = true;
		game.phase = 'nomination';
		for(var i in game.players) {
			delete game.players[i].selection;
			game.players[i].picked = false;
		}
		game.update();
	}
	
	this.findPlayer = function(name) { // gets the index in the players array of a certain player
		for(var i = 0; i < game.players.length; i++) {
			if(game.players[i].name === name) {
				return i;
			}
		}
		return -1;
	};
	
	this.pAlive = function(name) {
		return game.findPlayer(name) >= 0;
	}
	
	this.getSendData = function(name) { // get the data safe to send to a player
		var data = {id: game.id, setup: game.setup, day: game.day, roles: game.roles,
			phase: game.phase, timer: game.timer, nominator: game.nominator, nominatee: game.nominatee};
		var pobj = null;
		var index = game.findPlayer(name);
		data.players = [];
		for(var i = 0; i < game.players.length; i++) {
			var p = game.players[i];
			pobj = {name: p.name, alive: p.alive, leader: p.leader, nominated: p.nominated};
			if(game.players[index].role !== undefined && game.players[index].role.name === p.role.name && p.role.consensus) {
				pobj.selection = p.selection;
				pobj.picked = p.picked;
				pobj.role = p.role;
			}
			if(p.name === name) {
				pobj.role = p.role;
				pobj.selection = p.selection;
				pobj.picked = p.picked;
			}
			data.players.push(pobj);
		}
		data.dead = [];
		for(var i = 0; i < game.dead.length; i++) {
			data.dead.push({name: game.dead[i].name, role: game.dead[i].role.name, alive: false});
		}
		return data;
	};
	
	// TODO: getDeadSendData
	
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
	
	this.isdead = function() {
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
