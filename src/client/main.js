var mafia = angular.module('mafia', ['ngRoute']);
var ip = '99.225.251.49';

mafia.config(['$routeProvider', function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'views/main.html', 
        controller: MainCtrl
    })
    .otherwise({
        redirectTo: '/'
    });
}]);