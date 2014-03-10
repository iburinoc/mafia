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
				deadGames.splice(i, 1);
			} else {
				if(games[id].deadChecked) {
					delete games[deadGames[i]];
					deadGames.splice(i, 1);
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
	var name;
	var leader;

	var getGameIDs = function() {
		var gameIDs = [];
		for(var g in games) {
			if(games[g].setup) {
				gameIDs.push({id: g, leader: games[g].players[0].name});
			}
		}
		return gameIDs;
	}
	
	socket.on('games', function() {	
		socket.emit('games', getGameIDs());
	});

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
	
	socket.on('second', function() {
		try{
			if(games[id].phase === 'second') {
				games[id].second(name);
			}
		} catch(err) {console.log(err);}
	});
	
	socket.on('vote', function(data) {
		try{
			if(games[id].phase === 'vote' && !games[id].players[games[id].findPlayer(name)].vote) {
				games[id].vote(name, data);
			}
		} catch(err) {console.log(err);}
	});
	
	socket.on('nolynchvote', function() {
		try{
			if(games[id].pAlive(name) && games[id].day && games[id].phase === 'nomination') {
				games[id].nolynchvote(name);
			}
		} catch(err) { console.log(err); }
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
			socket.broadcast.emit('games', getGameIDs());
		} catch(err) {console.log(err)};
	});
	
	socket.on('connect', function(data) {
		try{
			if(games[data.id] !== undefined) {
				var player = games[data.id].players[games[data.id].findPlayer(data.name)];
				if(player !== undefined) { // am i ever gonna fix this?
					if(player.disconnected && data.name !== "God") {
						delete player.disconnected;
						socket.emit('gameData', games[data.id].getSendData(data.name));
						leader = !!player.leader;
						id = data.id;
						name = data.name;
						player.socket = socket;
					} else {
						socket.emit('nameexists', {});
					}
				} else {
					if(games[data.id].setup && data.name !== "God") {
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
		try{
			if(!games[id].pAlive(name)) {
				return;
			}
			games[id].message('<' + name + '> ' + data);
		} catch(err) {console.log(err);}
	});
	
	
	function dc() { // dc, its a named function as it could be called from returning to menu or from disconnecting socket
		// when all players have dc'ed, it is ready for garbage collection
		try{
			if(games[id] !== undefined) {
				if(games[id].setup) {
					games[id].players.splice(games[id].findPlayer(name), 1);
					if(games[id].players.length === 0) {
	                    delete games[id];
						socket.broadcast.emit('games', getGameIDs());
					} else {
						console.log(leader);
						if(leader) {
							console.log('Leader disconnected\n\n\n');
							games[id].stop("Leader disconnected");
							socket.broadcast.emit('games', getGameIDs());
						}
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
	nightActionE: function() {},
	registerCB: function(game) {
		game.callbacks.postdeath.push(function(g) {
			for(var i in g.players) {
				if(g.players[i].role.name === 'Mafia') {
					return;
				}
			}
			game.win('Civilians win!');
		});
	}
},{
	name: "Mafia",
	nightActivity: true,
	action: "Choose someone to kill",
	number: 1,
	consensus: true,
	order: 2,
	nightActionS: function(game, selection, selecter) {
		selection.mark.mafia = true;
	},
	nightActionE: function(game, selection, selecter) {
		if(selection && selection.mark.mafia) {
			game.kill(selection);
			game.message('<God> ' + selection.name + ' was killed by the mafia.');
			delete selection.mark.mafia;
		}
	},
	registerCB: function(game) {
		game.callbacks.postdeath.push(function(g) {
			var count = 0;
			for(var i in g.players) {
				if(g.players[i].role.name === 'Mafia') {
					count++;
				}
			}
			if(count >= game.players.length / 2.0)
				game.win('Mafia wins!');
		});
	},
	specialActions: [
	{
		name: "Bribe God",
		action: function(game) {
			for(var i in game.players) {
				game.players[i].mark.bribe = true;
			}
		}
	}
	]
},
{
	name: "Doctor",
	nightActivity: true,
	action: "Choose someone to save",
	number: 0,
	consensus: true,
	order: 3,
	nightActionS: function(game, selection, selecter) {
		if(selection.mark.mafia) {
			game.message('<God> No death tonight');
			delete selection.mark.mafia;
		}
	},
	nightActionE: function(){}
},
{
	name: "Inspector",
	nightActivity: true,
	action: "Choose someone to inspect",
	number: 0,
	consensus: false,
	order: 4,
	nightActionS: function(game, selection, selecter) {
		var alliance = selection.role.name === "Mafia";
		alliance = alliance ^ selecter.crazy;
		alliance = alliance ^ selecter.mark.bribe;
		var val = alliance ? 'M' : 'C';
		selecter.socket.emit('message', '<God> ' + selection.name + ': ' + val);
	},
	nightActionE: function(){},
	playerAdded: function(game, num, player) {
		if(num === 1) { // crazy inspector
			player.crazy = true;
		}
	}
},
{
	name: "Lawyer",
	nightActivity: true,
	action: "Choose someone to attorney for",
	number: 0,
	consensus: true,
	order: 5,
	nightActionS: function(game, selection, selecter) {
		selection.mark.lawyer = true;
	},
	nightActionE: function(){},
	registerCB: function(game) {
		game.callbacks.lynch.push(function(game) {
			var index = game.findPlayer(game.nominatee);
			if(game.players[index].mark.lawyer) {
				game.message('<God> ' + game.nominatee + ' has a great lawyer!');
				delete game.players[index].mark.lynch;
			}
		});
	}
},
{
	name: "Prostitute",
	nightActivity: true,
	action: "Choose a client",
	number: 0,
	consensus: false,
	order: 1,
	nightActionS: function(game, selection, selecter) {
		if(selection.role.consensus) {
			for(var i = 0; i < game.players.length; i++) {
				if(game.players[i].role.name === selection.role.name) {
					game.players[i].mark.occupied = true;
				}
			}
		} else {
			selection.mark.occupied = true;
		}
	},
	nightActionE: function(){}
},
{
	name: "Fool",
	nightActivit: false,
	action: "",
	number: 0,
	consensus: false,
	order: -1,
	nightActionS: function(){},
	nightActionE: function(){},
	registerCB: function(game) {
		game.callbacks.postlynch.push(function(game) {
			console.log(game.players[game.findPlayer(game.nominatee)].role.name);
			if(game.players[game.findPlayer(game.nominatee)].role.name === "Fool") {
				game.win(game.nominatee + ' wins!');
			}
		});
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

	this.callbacks = {lynch: [], postlynch: [], postdeath: []};
	
	this.setup = true;
	
	this.day = false;
	
	this.roles = copyObj(roles); // change this at some point?  the only mutable part is the number for each
	
	var nomtimer;
	
	for(var r in roles) {
		if(roles[r].registerCB) {
			roles[r].registerCB(game);
		}
	}
	
	function nomtimerCounter() {
		if(game.phase !== 'second') {
			clearInterval(nomtimer);
			return;
		}
		if(game.timer > 0) {
			game.timer--;
			console.log('nomtimer' + game.id + ': ' + game.timer);
		} else if(game.timer === 0) {
			game.nomdone();
		}
	}
	
	this.win = function(winner) {
		game.over = true;
		game.winner = winner;
		game.phase = 'done';
		game.update();
	};
	
	this.message = function(message, dest) {
		if(dest) {
			var index = game.findPlayer(dest);
			if(index != -1) {
				game.players[index].socket.emit('message', message);
			}
		} else {
			for(var p in game.players) {
				try{
					game.players[p].socket.emit('message', message);
				} catch(err) { console.log(err); };
			}
			for(var p in game.dead) {
				try{
					game.dead[p].socket.emit('message', message);
				} catch(err) { console.log(err); };
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
		for(var i in game.callbacks.postdeath) {
			game.callbacks.postdeath[i](game);
		}
	}

	this.update = function() { // updates all clients
		if(game.setup)
			game.updateRoles();
		for(var i = 0; i < game.players.length; i++) {
			game.players[i].socket.emit('gameData', this.getSendData(game.players[i].name));
		}
		game.updateDead();
		console.log(game);
	}
	
	this.updateDead = function() {
		var data = game.getDeadSendData();
		for(var i = 0; i < game.dead.length; i++) {
			try{
				game.dead[i].socket.emit('gameData', data);
			} catch(err) { console.log(err); }
		}
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
				updatees.push(game.players[num]);
				game.players[num].picked = true;
			}
			for(var u = 0; u < updatees.length; u++) {
				updatees[u].socket.emit('gameData', game.getSendData(updatees[u].name));
			}
			game.updateDead();
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
		game.message('<God> ' + nominator + ' has nominated ' + nominatee + '.');
		game.update();
	};
	
	this.second = function(seconder) {
		if(seconder === game.nominator) 
			return;
		game.message('<God> ' + seconder + ' has seconded ' + game.nominatee + "'s nomination.");
		game.phase = 'vote';
		game.update();
	};
	
	var endDay = function() {
		for(var i in game.players) {
			delete game.players[i].nominated;
			delete game.players[i].vote;
			delete game.players[i].nolynch;
			game.players[i].mark = {};
		}
		delete game.nominator;
		delete game.nominatee;
		game.phase = 'nomination';
		game.day = false;
		game.update();
	};
	
	var lynch = function() {
		var index = game.findPlayer(game.nominatee);
		try{
			game.players[index].mark.lynch = true;
			for(var i in game.callbacks.lynch) {
				game.callbacks.lynch[i](game);
			}
			if(game.players[index].mark.lynch) {
				for(var i in game.callbacks.postlynch) {
					game.callbacks.postlynch[i](game);
				}
				game.kill(game.players[game.findPlayer(game.nominatee)]);
				game.message('<God> ' + game.nominatee + ' has been lynched.');
				endDay();
			} else {
				delete game.nominator;
				delete game.nominatee;
				game.phase = 'nomination';
				delete game.players[index].mark.lynch;
				game.update();
			}
		} catch(err) {console.log(err);}
	};
	
	var checklynchdone = function() {
		if(game.players.reduce(function(prevValue, curPlay) {
			return prevValue && curPlay.nominated;
		}, true)) {
			endDay();
		}
	};

	var nolynch = function() {
		game.message('<God> Lynch attempt failed, ' + game.nominatee + ' lives.');
		delete game.nominator;
		delete game.nominatee;
		game.phase = 'nomination';
		for(var i in game.players) {
			delete game.players[i].vote;
		}
		checklynchdone();
		game.update();
	};
	
	this.nomdone = function() {
		clearInterval(nomtimer);
		game.message('<God> Nomination attempt failed, ' + game.nominatee + ' lives.');
		delete game.nominator;
		delete game.nominatee;
		game.phase = 'nomination';
		checklynchdone();
		game.update();
	};
	
	var voteTally = function(yn) {
		return game.players.reduce(function(prevVal, curPlay){
			return prevVal + (curPlay.vote === yn ? 1 : 0);
		}, 0);
	};
	
	var voteDone = function(v) {
		if(voteTally(v) > (game.players.length / 2.0)) {
			return true;
		} else if(v === 'n'){
			return game.players.reduce(function(prev, cur) { return prev && cur.vote; }, true) // check if all players have voted
				&& voteTally('y') <= (game.players.length / 2.0);
		}
	};
	
	this.vote = function(voter, vote) {
		game.players[game.findPlayer(voter)].vote = vote;
		game.update();
		if(voteDone('y')) {
			setTimeout(lynch, 750);
		} else if(voteDone('n')){
			setTimeout(nolynch, 750);
		}
	};
	
	this.nolynchvote = function(voter) {
		game.players[game.findPlayer(voter)].nolynch = true;
		var tally = game.players.reduce(function(prevVal, curPlay) {
			return prevVal + (curPlay.nolynch ? 1 : 0);
		}, 0);
		game.update();
		if(tally > game.players.length / 2.0) {
			endDay();
		}
	};

	this.checkDoneNight = function() {
		for(var i = 0; i < game.players.length; i++) {
			if(!game.players[i].picked && game.players[i].role.nightActivity) {
				return;
			}
		}
		setTimeout(endNight, 750);
	};

	var endNight = function() {
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
					var index = game.findPlayer(game.players[j].selection);
					if(game.players[j].mark.occupied) {
						if(game.players[j].role.name !== "Mafia") {
							game.message('<God> You have been occupied', game.players[j].name);
						}
					} else {
						if(index != -1) {
							role.nightActionS(game, game.players[game.findPlayer(game.players[j].selection)], game.players[j]);
						} else {
							for(var sa in role.specialActions) {
								if(game.players[j].selection === role.specialActions[sa].name) {
									role.specialActions[sa].action(game);
								}
							}
						}
					}
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
	};
	
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
	};
	
	this.getSendData = function(name) { // get the data safe to send to a player
		var data = {id: game.id, setup: game.setup, day: game.day, roles: game.roles,
			phase: game.phase, timer: game.timer, nominator: game.nominator, nominatee: game.nominatee,
			over: game.over, winner: game.winner};
		var pobj = null;
		var index = game.findPlayer(name);
		data.players = [];
		for(var i = 0; i < game.players.length; i++) {
			var p = game.players[i];
			pobj = {name: p.name, alive: p.alive, leader: p.leader, nominated: p.nominated, vote: p.vote, nolynch: p.nolynch};
			if((game.players[index].role !== undefined && game.players[index].role.name === p.role.name && p.role.consensus) || game.over){
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
			data.dead.push({name: game.dead[i].name, role: game.dead[i].role, alive: false});
		}
		return data;
	};
	
	this.getDeadSendData = function() {
		var data = {id: game.id, setup: game.setup, day: game.day, roles: game.roles,
			phase: game.phase, timer: game.timer, nominator: game.nominator, nominatee: game.nominatee,
			over: game.over, winner: game.winner};
		data.players = [];
		data.dead = [];
		for(var i = 0; i < game.players.length; i++) {
			var p = game.players[i];
			data.players.push({name: p.name, alive: p.alive, leader: p.leader, nominated: p.nominated,
				role: p.role, selection: p.selection, picked: p.picked, vote: p.vote, nolynch: p.nolynch});
		}
		for(var i = 0; i < game.dead.length; i++) {
			data.dead.push({name: game.dead[i].name, role: game.dead[i].role, alive: false});
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
				} while(game.players[k].role !== undefined);
				game.players[k].role = game.roles[i];
				if(roles[i].playerAdded) {
					roles[i].playerAdded(game, j, game.players[k]);
				}
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
			try{
				game.players[i].socket.emit('stop', str);
			} catch(err) { console.log(err); }
        }
        delete games[game.id];
    };
	
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
