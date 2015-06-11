var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var five = require('johnny-five'),
      board, sensor;
var Leap = require('leapjs'),
      controller = new Leap.Controller({background: true});
var action = 'Stop';

var say = require('say'),
control = true, 
current = 'Undefined', 
prev = current;

var temporal = require('temporal');
var speech = false;

app.use(express.static('public'));

http.listen(3000, function() {
	console.log('listening on port 3000');
});

app.get('/', function(req, res) {
      	res.sendFile('./public/index.html');
});

app.get('/gps.html', function(req, res) {
      	res.sendFile('./public/gps.html');
});

app.get('/heartrate.html', function(req, res) {
      	res.sendFile('./public/heartrate.html');
});

app.get('/locomotion.html', function(req, res) {
      	res.sendFile('./public/locomotion.html');
});

app.get('/speech.html', function(req, res) {
	res.sendFile('./public/speech.html');
});

app.get('/chat.html', function(req, res) {
      	res.sendFile('./public/chat.html');
});

board = new five.Board();

board.on('ready', function() {
	      sensor = new five.Sensor({
            	pin: 'A0',
            	freq: 2
            });

      	var configs = five.Motor.SHIELD_CONFIGS.ADAFRUIT_V1;

            motor1 = new five.Motor(configs.M1);
            motor2 = new five.Motor(configs.M2);
            motor3 = new five.Motor(configs.M3);
            motor4 = new five.Motor(configs.M4);

      	io.on('connection', function(socket) {	
      		/*** Index Page ***/
      		socket.on('index_ack', function(err) {
      			if(err)
      				console.error(err);

      			speech = false;
                        console.log('MAIN PAGE');
      			controller.disconnect();
      		});
      		/********************/

      		/*** Heart Rate ***/
      		socket.on('heartrate_ack', function(err) {
      			if(err)
      				console.error(err);

                        console.log('HEARTRATE');
      			sensor.scale([0,1024]).on('read', function() {
            			io.emit('pulse', this.scaled.toFixed(0));
      			});
      			socket.on('bpm', function(data) {
                              socket.emit('plot', data);
      			});
      		});
      		/********************/ 

      		/*** Locomotion ***/
      		socket.on('locomotion_ack', function(err) {
      			if(err)
      				console.error(err);

                        console.log('LOCOMOTION');
      			controller.connect();
      			controller.on('frame', function(frame) {
      				io.emit('action', action);
      				if(frame.hands.length < 1) 
                  			action = 'Stop';
            			else 
                  			getCommand(frame.hands[0]);
      			});
      		});
      		/*********************/

      		/*** Speech ***/
      		socket.on('speech_ack', function(err) {
      			if(err)
      				console.error(err);

                        console.log('SPEECH');
                        speech = true;
      		      controller.connect();
                        temporal.loop(1000, function() {
                            	if (!speech)
                             		this.stop();

                              var frame = controller.frame();
                              io.emit('action', current);
	                       	count = 0;

					if(frame.hands.length > 0 && control) {
						frame.pointables.forEach(function(data) {
							if(data.extended)
								count++;
						});
						command(count);
						if(current !== prev) {
							talk(current);
						}
						else {
							control = true;
						}
					}
                        });
      		});
      		/****************/

      		/*** Chat ***/
      		socket.on('chat_ack', function(err) {
      			if(err)
      				console.error(err);
      			
      			console.log('CHAT');
      			var usernames = {};
				var numUsers = 0;

      			var addedUser = false;

	      		// when the client emits 'new message', this listens and executes
	      		socket.on('new message', function (data) {
	      		// we tell the client to execute 'new message'
	            		socket.broadcast.emit('new message', {
	                  			username: socket.username,
	                  			message: data
	            		});
	      		});

	      		// when the client emits 'add user', this listens and executes
	      		socket.on('add user', function (username) {
	            		// we store the username in the socket session for this client
	            		socket.username = username;
	            		// add the client's username to the global list
	            		usernames[username] = username;
	            		++numUsers;
	            		addedUser = true;
	            		socket.emit('login', {
	                  		numUsers: numUsers
	            		});
	            		// echo globally (all clients) that a person has connected
	            		socket.broadcast.emit('user joined', {
	                  		username: socket.username,
	                  		numUsers: numUsers
	            		});
	      		});

	      		// when the client emits 'typing', we broadcast it to others
	      		socket.on('typing', function () {
	            		socket.broadcast.emit('typing', {
	                  		username: socket.username
	            		});
	      		});

	      		// when the client emits 'stop typing', we broadcast it to others
	      		socket.on('stop typing', function () {
	            		socket.broadcast.emit('stop typing', {
	                  		username: socket.username
	            		});
	      		});

	      		// when the user disconnects.. perform this
	      		socket.on('disconnect', function () {
	            	// remove the username from global usernames list
		            	if(addedUser) {
		                  	delete usernames[socket.username];
		                  	--numUsers;

		                  	// echo globally that this client has left
		                  	socket.broadcast.emit('user left', {
		                        	username: socket.username,
		                        	numUsers: numUsers
		                  	});
		            	}
	      		});			
	      	});
	      	/*************/
      	});
});


function getCommand(hand){
      	var x_axis = hand.palmPosition[0];
      	var y_axis = hand.palmPosition[1];
      	var z_axis = hand.palmPosition[2];

      	var power = 0;
      	if( y_axis <= 50 ) {
            	power = 0;
      	}
      	else if (y_axis >= 500) {
      		power = 200;
      	}
      	else {
            	//power = ((y_axis-50)/(500-100) * 244).toFixed(0);
      	      power = ((y_axis/500)*200).toFixed(0);
            }

      	if( Math.abs(x_axis) > Math.abs(z_axis) ) {
            	if( x_axis > 100 ) 
                  	action = 'Right';
            
            	else if( x_axis < -100 ) 
                  	action = 'Left';
            
	            else 
            	      action = 'Stop' ;
      	}
      	else {
            	if( z_axis > 50 ) 
                  	action = 'Reverse';
            
	            else if( z_axis < -50 ) 
            		action = 'Forward';
            
            	else
                  	action = 'Stop';
      	}

      	arduino(action, power);
}

function arduino(action, power) {
      if(power === 0)
            arduino('stop', 200);

      switch(action) {
            case 'Forward':
	            motor1.forward(150);
  			motor2.forward(150);
  			motor3.forward(150);
  			motor4.forward(150);
                  break;

            case 'Reverse':
                  motor1.reverse(150);
  			motor2.reverse(150);
		  	motor3.reverse(150);
  			motor4.reverse(150);
                  break;

            case 'Right':
                 	motor1.reverse(250);
  			motor2.reverse(250);
  			motor3.forward(250);
 			motor4.forward(250);
              	break;

            case 'Left':
                  motor1.forward(250);
  			motor2.forward(250);
  			motor3.reverse(250);
  			motor4.reverse(250);
                 	break;

           	case 'Stop':

            default:
                  motor1.stop();
  			motor2.stop();
  			motor3.stop();
  			motor4.stop();
      }
}


function command(count) {
	control = false;
	switch(count) {
		case 0:
			current = '';
			break;
		case 1:
			current = 'Hello!';
			break;
		case 2:
			current = 'How are you?';
			break;
		case 3:
			current = 'Thank you';
			break;
		case 4:
			current = 'Have a nice day';
			break;
		case 5:
			current = 'Please give way!';
			break;
		default:
			current = '';
	}
	return;
}

function talk(current) {
	say.speak(null, current, function() {
		control = true;
		prev = current;
	});
}


