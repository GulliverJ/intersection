
// IDEA: Store teh list of blocks needed in the monitor
// Each time it clears a block, update its ETA/ETD?
// Alternatively, store a list of ETAs

// The only ETAs the monitor controls two ETAS - arrival at junction, and departure from junction
// Car does the rest, maximising speed/minimising deceleration
// (So, better for a car to slow to 10m/s as it approaches a junction than drive at 18mps then stop at hte last moment)
// TODO: A car would come in from one of 4 directions and want to go L, S, or R. Check state and select the matching path of course
function car(speed, accel, path, graphic, x, y, rot) {
    this.speed = speed;
    this.accel = accel;
    this.path = path;
    this.graphic = graphic;
    this.x = x;
    this.y = y;
    this.rot = rot;
    prevTrans = 0;
}

// Stage: 0 = first straight; 1 = turn; 2 = second straight;
function monitor(vehicle, path, stage, eta, etd, entry, rot) {
  this.vehicle = vehicle;
  this.path = path;
  this.stage = stage;
  this.eta = eta;
  this.etd = etd;
  this.entry = entry;
  this.rot = rot;
}

function region(id, nextFree, windows) {
    this.id = id;
    this.nextFree = nextFree;
    this.windows = windows;
}

function path(id, regions, pos, rot, arrivalSpeed, juncLength, aveSpeed, radius, turnTime, pivot, entry) {
    this.id = id;
    this.regions = regions;
    this.pos = pos;
    this.rot = rot;
    this.arrivalSpeed = arrivalSpeed;
    this.juncLength = juncLength;
    this.aveSpeed = aveSpeed;
    this.radius = radius;
    this.turnTime = turnTime;
    this.pivot = pivot;
    this.entry = entry;
}

// Initialise array of junction regions
// Index clockwise, with top-left = 0 and centre = 4
var regions = [];
var vehicles = [];
var paths = [];
var monitors = [];

var maxSpeed = 300;
var arrSpeed = 150;
var aveSpeed = 130;

var centerX;
var centerY;
var context;
var deltaT;
var spawnRate = 0;
var throughput = 0;
var nsApproach = 0;
var ewApproach = 0;
var stage;
var ticker;

 $(document).ready(function($){
    for ( var i = 0; i < 5; i++ ) {
      var tempRegion = new region(i, -1, []);
      regions.push(tempRegion);
    }

    var canvas = document.getElementById('canvas'),
    context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    centerX = canvas.width  / 2;
    centerY = canvas.height / 2;

    nsApproach = centerY - 124;
    ewApproach = centerX - 124;

    //document.addEventListener('keydown', keyboardIn, false);
    //canvas.addEventListener("mousewheel", mouseWheel, false);
    //canvas.addEventListener('mousedown', gasOn, false);
    //canvas.addEventListener('mouseup', gasOff, false);

    stage = new createjs.Stage("canvas");

    var bitmap = new createjs.Bitmap('./elem/bg1.png');
    bitmap.x = centerX - 960;
    bitmap.y = centerY - 540;
    stage.addChild(bitmap);
    
    ticker = createjs.Ticker;
    ticker.setFPS(60);
    ticker.timingMode = createjs.Ticker.RAF;
    ticker.addEventListener("tick", tick);

    var rightTurnRadius = 125;
    var rightTurnTime = 6.5;
    var rightTurnEntry = 12;
    var leftTurnRadius = 125;
    var leftTurnTime = 6.0;
    var leftTurnEntry = -16;

    //path(id, regions, pos, rot, arrivalSpeed, aveSpeed, radius, turnTime, pivot, entry) {
    var path0 = new path(0, [0,4,2], [centerX + 31, -36], 0, arrSpeed, 848, aveSpeed, rightTurnRadius, rightTurnTime, [(centerX - 93), (centerY - 93)], rightTurnEntry);
    var path1 = new path(1, [0,1], [centerX + 31, -36], 0, maxSpeed, 314, maxSpeed, -1, -1, [], 0);
    var path2 = new path(2, [0], [centerX + 31, -36], 0, arrSpeed, 784, aveSpeed, leftTurnRadius, leftTurnTime, [centerX + 157, centerY - 157], leftTurnEntry);

    var path3 = new path(3, [1,4,3], [canvas.width + 36, centerY + 31], 90, arrSpeed, 848, aveSpeed, rightTurnRadius, rightTurnTime, [(centerX + 93), (centerY - 93)], rightTurnEntry);
    var path4 = new path(4, [1,2], [canvas.width + 36, centerY + 31], 90, maxSpeed, 314, maxSpeed, -1, -1, [], 0);
    var path5 = new path(5, [2], [canvas.width + 36, centerY + 31], 90, arrSpeed, 784, aveSpeed, leftTurnRadius, leftTurnTime, [(centerX + 157), (centerY + 157)], leftTurnEntry);

    paths.push(path0);
    paths.push(path1);
    paths.push(path2);

    paths.push(path3);
    paths.push(path4);
    paths.push(path5);

    // TEST CODE - TO BE IN A CREATOR FUNCTION
    newVehicle();

  });

var counter = 0;

  function tick(event) {

    if(!event.paused) {
      deltaT = event.delta / 1000;

    counter += deltaT;
    if(counter > 1.5) {
      counter = 0;
      newVehicle();
    }


    //deltaT = event.delta / 1000;
    updateVehicles();

    stage.update(event);
    }
    

  }

  function newVehicle() {

    // TODO: Randomly choose path
    
    var rand = Math.floor((Math.random() * 6));
    var thisPath = paths[rand];
    

    //thisPath = paths[5];

    var graphic = new createjs.Shape();
    // Choose a random vehicle, with probabilities. For now, just car (32 x 74)
    // All vehicles by default are facing South
    graphic.graphics.beginFill("#222").drawRect(0,0,32,74);
    
    console.log("INIT X " + graphic.x);
    console.log("INIT Y " + graphic.y);


    graphic.x += thisPath.pos[0];
    graphic.y += thisPath.pos[1];

    switch(thisPath.id) {
      case 0:
        graphic.x -= thisPath.radius + 16;
        graphic.regX = 0 - thisPath.radius;
        graphic.regY = 24;
        break;
      case 2:
        graphic.x += thisPath.radius - 16;
        graphic.regX = thisPath.radius;
        graphic.regY = 24;
        break;
      case 3:
        graphic.y -= thisPath.radius + 16;
        graphic.regX = 0 - thisPath.radius;
        graphic.regY = 24;
        break;
      case 5:
        graphic.y += thisPath.radius - 16;
        graphic.regX = thisPath.radius;
        graphic.regY = 24;
        break;
      default:
        graphic.regX = 16;
        graphic.regY = 24;
        break;
    }

    console.log("INIT X " + graphic.x);
    console.log("INIT Y " + graphic.y);
    console.log("REG X " + graphic.regX);
    console.log("REG Y " + graphic.regY);
    graphic.rotation = thisPath.rot;


    var tempVehicle = new car(maxSpeed, 0, 0, graphic, 0, 0, thisPath.rot);

    tempVehicle.x += thisPath.pos[0];
    tempVehicle.y += thisPath.pos[1];

    vehicles.push(tempVehicle);

    // Initialise eta and etd for the junction

    var curTime = ticker.getTime();
    var eta;
    var etd;

    // Set a naive ETA - assume constant decel from arrival
    //    - Car will set its own best speed and match the ETA
    // Set ETA, let the car work it out.

    switch(thisPath.id % 6) {
      case 1:
        eta = ((nsApproach / maxSpeed) * 1000) + curTime;
        console.log("ETA: " + eta + ", time is " + curTime);
        etd = eta + thisPath.juncLength / maxSpeed;
        break;
      case 4:
        eta = ((ewApproach / maxSpeed) * 1000) + curTime;
        console.log("ETA: " + eta + ", time is " + curTime);
        etd = eta + thisPath.juncLength / maxSpeed;
        break;
      case 0:
      case 2:
        eta = ((1000 * nsApproach) / maxSpeed) + curTime;
        // TODO: CALC ETD PROPERLY
        //etd = eta + thisPath.turnTime;
        etd = eta + (1000 * thisPath.juncLength / maxSpeed);
        break;
      case 3:
      case 5:
        //eta = ((2000 * ewApproach) / (maxSpeed + thisPath.arrivalSpeed)) + curTime;
        eta = ((1000 * ewApproach) / maxSpeed) + curTime;
        //etd = eta + thisPath.turnTime;
        etd = eta + (1000 * thisPath.juncLength / maxSpeed);
        break;
    }


    monitors.push(new monitor(tempVehicle, thisPath, 0, eta, etd, 0, 0));

    // TODO: Schedule the new car!!

    stage.addChild(graphic);
  }



  function updateVehicles() {
    var thisVehicle;
    var dX;
    var dY;
    var curTime = ticker.getTime();

    for(var i = 0; i < monitors.length; i++) {
      // Juggle the timings, check whether it should be turning, make sure it has a schedule....
      updatePosition(monitors[i]);
    }
    
  }

  /*  Stages:
        0  Approching the junction
        1  Driving into the junction
        2  Turning
        3  Driving straight out of the junction
        4  Departing the junction
  */

  function setSpeed(vehicle, path, eta, etd) {

    // Should set accel here but I won't.


  }

  function setPivot(graphic, point) {
    console.log("x,y: " + graphic.x + ", " + graphic.y);
    console.log("regx,regy: " + graphic.regX + ", " + graphic.regY);
    console.log("point: " + point[0] + ", " + point[1]);


    var dX = point[0] - graphic.x;
    var dY = point[1] - graphic.y;
    /*
    console.log("dx, dy: " + dX + ", " + dY);
    graphic.regX = point[0];
    graphic.regY = point[1];*/

    graphic.regX += dX;
    graphic.regY += dY;

    graphic.x += dX;
    graphic.y += dY;
    console.log("NEW x,y: " + graphic.x + ", " + graphic.y);
    console.log("NEW regx,regy: " + graphic.regX + ", " + graphic.regY);
  }

  function resetPivot(graphic, point) {
    console.log("I tried");
    var dX = graphic.x - point[0];
    var dY = graphic.y - point[1];
    graphic.regX -= dX;
    graphic.regY -= dY;
    graphic.x -= dX;
    graphic.y -= dY;
  }

  function updatePosition(monitor) {

    var vehicle = monitor.vehicle;
    var path = monitor.path;
    
    setSpeed(vehicle, path, monitor.eta, monitor.etd);

    var dist = vehicle.speed * deltaT;
    var target;
    var trans;

/*
    console.log("X " + vehicle.graphic.x);
    console.log("Y " + vehicle.graphic.y);
    console.log("REG X " + vehicle.graphic.regX);
    console.log("REG Y " + vehicle.graphic.regY);
    console.log("DIST " + dist);

*/

    switch(path.rot) {
      case 0:
        // Drive straight
        if(monitor.stage == 0) {
          if(path.id % 3 != 1) {
            target = centerY - path.radius + path.entry;
            trans = dist;
            if(vehicle.graphic.y + trans >= target) {
              dist -= (target - vehicle.graphic.y);
              monitor.vehicle.graphic.y = target;
              monitor.stage = 2;
              // Gotta set hte pivot point
              //setPivot(monitor.vehicle.graphic, path.pivot);

            }
          }
          monitor.vehicle.graphic.y += dist;
        }

        // Rotate about dist
        if(monitor.stage == 2) {
          var angle = (180 * dist) / (Math.PI * path.radius);
          monitor.rot += angle;
          if(monitor.rot >= 90) {
            dist *= ((90 - monitor.rot) / angle);
            angle = 90 - monitor.rot;
            monitor.rot = 90;
            monitor.stage = 4;
            
            if(path.id == 2) {
              vehicle.graphic.rotation = -90;
            } else {
              vehicle.graphic.rotation = 90;
            }
            

            //resetPivot(vehicle.graphic, path.pivot);
          } else {
            if(path.id % 3 == 2) {
              angle = 0 - angle;
            } 
            vehicle.graphic.rotation += angle;
          }
          
        }

        if(monitor.stage == 4) {
          if(path.id % 3 == 0) {
            vehicle.graphic.x -= dist;
          } else {
            vehicle.graphic.x += dist;
          }
        }
        break;

      // Coming from the right!  
      case 90:
        // Drive straight
        if(monitor.stage == 0) {
          if(path.id % 3 != 1) {
            target = centerX + path.radius - path.entry;
            if(vehicle.graphic.x - dist <= target) {
              dist -= (vehicle.graphic.x - target);
              monitor.vehicle.graphic.x = target;
              monitor.stage = 2;

            }
          }
          monitor.vehicle.graphic.x -= dist;
        }

        // Rotate about dist
        if(monitor.stage == 2) {
          var angle = (180 * dist) / (Math.PI * path.radius);
          monitor.rot += angle;
          if(monitor.rot >= 90) {
            dist *= ((90 - monitor.rot) / angle);
            angle = 90 - monitor.rot;
            monitor.rot = 90;
            monitor.stage = 4;
            
            if(path.id == 3) {
              vehicle.graphic.rotation = 180;
            } else {
              vehicle.graphic.rotation = 0;
            }
            

            //resetPivot(vehicle.graphic, path.pivot);
          } else {
            if(path.id % 3 == 2) {
              angle = 0 - angle;
            } 
            vehicle.graphic.rotation += angle;
          }
          
        }

        if(monitor.stage == 4) {
          if(path.id % 3 == 0) {
            vehicle.graphic.y -= dist;
          } else {
            vehicle.graphic.y += dist;
          }
        }

        break;
      case 180:
      case 270:
        break;
    }  
    
  }


  function keyboardIn(event) {
    switch(event.keyCode){ 
      case 82:
        resetRocket();
        break;
      case 68:
        if(dev) {
            dev = false;
        } else {
            dev = true;
        }
        resetRocket();
        break;
    }
  }


  function gasOn(event) {
    if(event.button == 0) {
        coldGasLeft = true;
    }
    else if(event.button == 2) {
        coldGasRight = true;
    }
  }

  function gasOff(event) {
    if(event.button == 0) {
        coldGasLeft = false;
    }
    else if(event.button == 2) {
        coldGasRight = false;
    }
  }

  function mouseWheel(event) {

    console.log(event.wheelDelta);

    thrust += (event.wheelDelta / 10);
    
    if(thrust < 0) {
        thrust = 0;
    } else if (thrust > rocket.maxThrust) {
        thrust = rocket.maxThrust;
    }
  }