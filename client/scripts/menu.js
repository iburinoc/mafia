mafia.controller('MainCtrl', ['$scope', '$location', '$modal', 'gameData', function ($scope, $location, $modal, gameData) {
	var modalOpened;
	function failed(message) {
		if(modalOpened) return;
		
		$scope.modalMessage = message;
		var modalInstance = $modal.open({
			templateUrl: 'connectFailed.html', 
			scope: $scope
		});
		
		modalOpened = true;
		
		$scope.closeModal = function() {
			modalInstance.dismiss('cancel');
			console.log('modal closed');
		}
		function closed() {
			modalOpened = false;
		}
		modalInstance.result.then(closed, closed);
	}
	
	function gameRedirect() {
		
	}

	function successNew() {
		console.log('New game created');
	}

	$scope.newGameFn = function() {
        console.log('New Game');
        gameData.newGame($scope.username.name.uname, successNew);
    };
    
    function successJoin() {
		console.log('Successfully joined');
	}
	
    $scope.joinGameFn = function() {
        console.log('Join Game: ' + $scope.joinGame.gameID.id);
        gameData.connect($scope.username.name.uname, $scope.joinGame.gameID.id, successJoin, failed);
    };
}]);
