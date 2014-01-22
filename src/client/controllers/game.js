mafia.controller('GameCtrl', ['$scope', '$location', '$http', 'gameData', function($scope, $location, $http, gameData) {
    $scope.day=false;
    $scope.notDead = function(item) {
        return item.alive;
    }
    $scope.others = gameData.others();
}]);