mafia.factory('gameData', ['$http', '$location', 'socket', function($http, $location, socket) {
//    var data = {you: {name: "ibur", alive: true, role: roles["mafia"]}, others: [{name: "bill", alive: true}, {name: "jill", alive: false}, {name: "jillawdiawdioawnfiawdddawd", alive: true}]};
	var data = null;
	var callbacks = [];
	var name;
	socket.on('gameData', function(g) {
		console.log('data!');
		data = g;
		data.you = getYou();
		console.log(g);
		for(var i = 0; i < callbacks.length; i++) {
			callbacks[i](g);
		}
	});
	
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
	
	return {
		connect: function(username, id, success, error) {
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
				name = username;
				success();
			});
			socket.emit('connect', {name: username, id: id});
		},
		newGame: function(username, success) {
			socket.emit('newgame', {name: username});
			socket.on('success', function(data) {
				name = username;
				success();
			});
		},
		getData: function() {
			return data;
		},
		reload: function() {
			socket.emit('reload', {});
		},
		callbacks: function() {
			return callbacks;
		},
		setName: function(n) {
			name = n;
		},
		getYou: getYou
	};
}]);

mafia.controller('GameCtrl', ['$scope', '$location', '$http', 'gameData', function($scope, $location, $http, gameData) {
    $scope.data = gameData.getData();

	gameData.callbacks().push(function(data) {
		$scope.data = data;
	});
	
    $scope.notDead = function(item) {
        return item.alive;
    }
	
    $scope.hasAction = function() {
		if($scope.data != null)
			return $scope.data.you.role.nightActivity && $scope.data.you.alive;
		else
			return false;
	};
}]);
