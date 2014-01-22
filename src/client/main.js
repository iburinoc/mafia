var mafia = angular.module('mafia', ['ngRoute']);
var ip = '99.225.251.49';

mafia.factory('socket', function ($rootScope) {
  var socket = io.connect();
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

mafia.service('gameData', ['$http', '$location', 'roles', function($http, $location, roles) {
    var data = {you: {name: "ibur", alive: true, role: roles["mafia"]}, others: [{name: "bill", alive: true}, {name: "jill", alive: false}, {name: "jillawdiawdioawnfiawdddawd", alive: true}]};
    data.others.push(data.you);
    
    return {
        reload: function() {
            
        },
        connect: function(username, gameid) {
            $http.post('/game/join', {name: username, id: gameid})
            .success(function(data, status, headers, config) {
                console.log(status);
               //data = 
            })
            .error(function(data, status, headers, config) {
                console.log(status);
                if(status == 474) {
                    console.log("gameID not found");
                }else 
                if(status == 475) {
                    console.log("Username in use.");
                }
            });
        },
        newGame: function(username) {
            $http.post('/game/new', {name: username})
            .success(function(data, status, headers, config) {
                console.log(status);
            })
            .error(function(data, status, headers, config) {
                console.log(status);
                if(status == 473) {
                    console.log("Could not create game");
                }
            });
        },
        you: function() {
            return data.you;
        }, 
        players: function() {
            return data.others;
        }
    };
}]);

mafia.factory('roles', function() {
    return {
        "mafia": {
            name: "Mafia",
            nightActivity: true,
            action: "Choose someone to kill",
            plural: true
        },
        "civilian": {
            name: "Civilian",
            nightActivity: false,
            action: null,
            plural: true
        }
    };
});
