mafia.factory('gameData', ['$rootScope', '$http', '$location', 'socket', function($rootScope, $http, $location, socket) {
	var data = null;
	var callbacks = [];
	var name;
	
	var messageCB;

	function getYou() {
		for(var i = 0; i < data.players.length; i++) {
			var p = data.players[i];
			if(p.name === name) {
				return p;
			}
		}
		for(var i = 0; i < data.dead.length; i++) {
			if(name === data.dead[i].name) {
				return data.dead[i];
			}
		}
		return null;
	}
	
	function chooseLoc() {
		if(data === null || data.setup) {
			$location.path('/setup/');
		} else {
			$location.path('/game/');
		}
	}
	callbacks.push(chooseLoc);

	socket.on('gameData', function(g) {
		console.log('data!');
		data = g;
		data.you = getYou();
		data.civilian = data.roles[0];
		console.log(g);
		for(var i = 0; i < callbacks.length; i++) {
			callbacks[i](g);
		}
	});
	
	function timerChecker(g) {
		var timerInterval;
		if(g.timer > 0) {
			if(timerInterval) {
				clearInterval(timerInterval);
			}
			timerInterval = setInterval(function() {
				$rootScope.$apply(function() {
					g.timer--;
					if(g.timer <= 0) {
						clearInterval(timerInterval);
						timerInterval = undefined;
					}
				});
			}, 1000);
		}
	}
	
	callbacks.push(timerChecker);

	socket.on('message', function(data) {
		console.log('message received: ' + data);
		if(messageCB) {
			messageCB(data);
		}
	});
			
	
	socket.on('start', function() {
		$location.path('/game/');
	});
	
	socket.on('stop', function(data) {
		$location.path('/');
	});

	return {
		connect: function(username, id, success, error) {
			name = username;
			socket.on('inprogress', function(data) {
				error('The game is already in progress');
			});
			socket.on('nameexists', function(data) {
				error('The username specified already exists in this game');
			});
			socket.on('notfound', function(data) {
				error('We could not find the game you are looking for');
			});
			socket.on('success', function(data) {
				success();
			});
			socket.emit('connect', {name: username, id: id});
		},
		newGame: function(username, success) {
			name = username;
			socket.emit('newgame', {name: username});
			socket.on('success', function(data) {
				success();
			});
		},
		getData: function() {
			return data;
		},
		reload: function() {
			socket.emit('reload');
		},
		callbacks: function() {
			return callbacks;
		},
		onMessage: function(cb) {
			messageCB = cb;	
		},
		message: function(data) {
			socket.emit('message', data);
		},
		setName: function(n) {
			name = n;
		},
		getYou: getYou,
		updateRoles: function(send) {
			console.log('roles changed');
			var n = 0;
			var civ;
			for(var i = 0; i < data.roles.length; i++) {
				var role = data.roles[i];
				if(role.name !== "Civilian") {
					n += role.number;
				}
				console.log(role.name + ":" + role.number);
			}
			data.civilian.number = data.players.length - n;
			if(send) {
				socket.emit('roles', data.roles);
			}
		},
		disconnect: function() {
			socket.emit('dc');
		},
		start: function() {
			socket.emit('start');
            console.log('starting');
		},
		personClickNight: function(name) {
			socket.emit('personClickNight', name);
		},
		nomination: function(name) {
			socket.emit('nomination', name);
		},
		second: function() {
			socket.emit('second');
		},
		vote: function(v) {
			socket.emit('vote', v);
		},
		nolynchvote: function() {
			socket.emit('nolynchvote');
		},
		socket: socket
	};
}]);

mafia.controller('GameCtrl', ['$scope', '$rootScope', '$location', '$http', 'gameData', function($scope, $rootScope, $location, $http, gameData) {
	
    $scope.data = gameData.getData();
	if($scope.data == null) {
		$location.path('/');
	}

	gameData.callbacks().push(function(data) {
		$scope.data = data;
	});
	
	$scope.start = function() {
		if($scope.roleNums.$valid) {
			gameData.start();
		}
	}
	
	$scope.roleMin = function(role) {
		return role.name === 'Mafia'? 1 : 0;
	};
	
	$scope.roleMax = function(role) {
		if(role.name !== "Civilian" && !isNaN($scope.data.civilian.number))
			return role.number + $scope.data.civilian.number;
		else
			return $scope.data.players.length;
	};
	
    $scope.notDead = function(item) {
        return item.alive;
    };
	
	$scope.hasAction = function() {
		if(!$scope.data.day) {
			return $scope.hasNightAction();
		} else {
			return $scope.hasNomAction();
		}
	}
	
	$scope.pButtonDis = function(player) {
		return $scope.data.day && player.nominated || $scope.data.you.picked;
	}
	
	$scope.hasNomAction = function() {
		return $scope.data.day && $scope.data.phase === 'nomination';
	}
	
    $scope.hasNightAction = function() {
			return $scope.data && $scope.data.you.role.nightActivity && $scope.data.you.alive;
	};
	
	$scope.updateRoles = function() {
		gameData.updateRoles($scope.roleNums.$valid);
	};
	
	$scope.showSelection = function(player) {
		return player.role && player.role.name === $scope.data.you.role.name;// && player !== $scope.data.you;
	};
	
	$scope.personClick = function(p) {
		if(!$scope.data.day && $scope.data.you.role.nightActivity) {
			gameData.personClickNight(p.name);
		}
		if($scope.data.day && $scope.data.phase === 'nomination') {
			gameData.nomination(p.name);
		}
	};

	$scope.specialClick = function(a) {
		if(!$scope.data.day) {
			gameData.personClickNight(a.name);
		}
	};
	
	$scope.second = function() {
		if($scope.data.day && $scope.data.phase === 'second') {
			console.log('Seconded');
			gameData.second();
		}
	};
	
	$scope.vote = function(v) {
		gameData.vote(v);
	};
	
	$scope.voteTally = function(yn) {
		return $scope.data.players.reduce(function(prevVal, curPlay){
			return prevVal + (curPlay.vote === yn ? 1 : 0);
		}, 0);
	};

	$scope.nolynchvote = function() {
		gameData.nolynchvote();
	};

	$scope.nolynchvotecount = function() {
		return $scope.data.players.reduce(function(prevVal, curPlay) {
			return prevVal + (curPlay.nolynch ? 1 : 0);
		}, 0);
	};
	
	$scope.messages = '';
	gameData.onMessage(function(data) {
		$scope.messages += data + '\n';
	});
	
	$scope.message = '';
	$scope.messageKeyD = function($event) {
		if($event.keyCode === 13 && $scope.message !== '') {
			gameData.message($scope.message);
			$scope.message = '';
		}
	};

	$scope.menu = function() {
		$location.path('/');
	};
	
	// GAME TEXT GOES HERE
	$scope.nomtext = "Choose someone to nominate for lynching if you wish"
}]);
