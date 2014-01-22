mafia.controller('GameCtrl', ['$scope', '$location', '$http', 'gameData', function($scope, $location, $http, gameData) {
    $scope.day=false;
    $scope.notDead = function(item) {
        return item.alive;
    }
    $scope.you = gameData.you();
    $scope.players = gameData.players();
    $scope.hasAction = true;
}]);