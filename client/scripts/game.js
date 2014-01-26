mafia.factory('gameData', ['$http', '$location', 'socket', function($http, $location, socket) {
//    var data = {you: {name: "ibur", alive: true, role: roles["mafia"]}, others: [{name: "bill", alive: true}, {name: "jill", alive: false}, {name: "jillawdiawdioawnfiawdddawd", alive: true}]};
	var data = null;
	socket.on('gameData', function(g) {
		console.log(g);
		data = g;
	});
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
				success();
			});
			socket.emit('connect', {name: username, id: id});
		},
		newGame: function(username, success) {
			socket.emit('newgame', {name: username});
			socket.on('success', function(data) {
				success();
			});
		}
	};
}]);

mafia.controller('GameCtrl', ['$scope', '$location', '$http', 'gameData', function($scope, $location, $http, gameData) {
    $scope.day=false;
    $scope.notDead = function(item) {
        return item.alive;
    }
    $scope.you = gameData.you();
    $scope.players = gameData.players();
    $scope.hasAction = $scope.you.role.nightActivity && $scope.you.alive;
}]);