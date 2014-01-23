mafia.controller('MainCtrl', ['$scope', '$location', 'gameData', function ($scope, $location, gameData) {
    $scope.newGameFn = function() {
        console.log('New Game');
        gameData.newGame($scope.username.name.uname);
    };
    
    $scope.joinGameFn = function() {
        console.log('Join Game: ' + $scope.joinGame.gameID.id);
        gameData.connect($scope.username.name.uname, $scope.joinGame.gameID.id);
    };
}]);
