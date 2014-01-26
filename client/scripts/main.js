var mafia = angular.module('mafia', ['ngRoute', 'ui.bootstrap']);
var ip = 'http://localhost:3006';

mafia.factory('socket', function ($rootScope) {
	var socket = io.connect('/');
	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {  
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		}
	};
});

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
	.when('/setup/', {
		templateUrl: 'client/views/setup.html',
		controller: 'GameCtrl'
	})
    .otherwise({
        redirectTo: '/'
    });
}]);
