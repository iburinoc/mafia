var mafia = angular.module('mafia', []);

mafia.controller('MainCtrl', ['$scope', function($scope) {
	$scope.username = '';
	$scope.validate = function () {
		console.log($scope.username);	
	}
}]);