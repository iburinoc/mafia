mafia.config(['$routeProvider', function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'views/main.html', 
        controller: 'MainCtrl'
    })
    .when('/game/', {
        templateUrl: 'views/game.html',
        controller: 'GameCtrl'
    })
    .otherwise({
        redirectTo: '/'
    });
}]);
