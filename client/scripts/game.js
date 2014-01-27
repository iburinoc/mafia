mafia.factory('gameData', ['$http', '$location', 'socket', function($http, $location, socket) {
	var data = null;
	var callbacks = [];
	var name;
	
	function getYou() {
		for(var i = 0; i < data.players.length; i++) {
			var p = data.players[i];
			if(p.name == name) {
				return p;
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
	
	function connect() {
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
	}
	connect();
	
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
		}
	};
}]);

mafia.controller('GameCtrl', ['$scope', '$location', '$http', 'gameData', function($scope, $location, $http, gameData) {
    $scope.data = gameData.getData();

	gameData.callbacks().push(function(data) {
		$scope.data = data;
	});
	
	$scope.start = gameData.start();
	
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
		if($scope.data != null)
			return $scope.data.you.role.nightActivity && $scope.data.you.alive;
		else
			return false;
	};
	
	$scope.updateRoles = function() {
		gameData.updateRoles($scope.roleNums.$valid);
	};
}]);
