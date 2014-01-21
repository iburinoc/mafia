/*mafia.config(['$routeProvider', function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl: 'views/main.html'
    })
    .otherwise({
        redirectTo: '/'
    });
}]);
*/
mafia.controller('MainCtrl', ['$scope', function($scope) {
	$scope.username = '';
	$scope.validate = function () {
		console.log($scope.username);	
	}
}]);