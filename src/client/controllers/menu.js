mafia.controller('MainCtrl', ['$scope', '$location', function ($scope, $location) {
    $scope.newGame = function() {
        console.log($location.path());
        $location.path('/game/');
        console.log('New Game');
    };
}]);
