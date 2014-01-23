mafia.config(['$routeProvider', function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'client/views/main.html', 
        controller: 'MainCtrl'
    })
    .when('/game/', {
        templateUrl: 'client/views/game.html',
        controller: 'GameCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });
}]);
