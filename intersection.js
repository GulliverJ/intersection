
// IDEA: Store teh list of blocks needed in the monitor
// Each time it clears a block, update its ETA/ETD?
// Alternatively, store a list of ETAs

// The only ETAs the monitor controls two ETAS - arrival at junction, and departure from junction
// Car does the rest, maximising speed/minimising deceleration
// (So, better for a car to slow to 10m/s as it approaches a junction than drive at 18mps then stop at hte last moment)
// TODO: A car would come in from one of 4 directions and want to go L, S, or R. Check state and select the matching path of course
function car(speed, maxAccel, accel, path, graphic, x, y, rot, turnFactor) {
    this.speed = speed;
    this.maxAccel = maxAccel
    this.accel = accel;
    this.path = path;
    this.graphic = graphic;
    this.x = x;
    this.y = y;
    this.rot = rot;
    this.turnFactor = turnFactor;
    prevTrans = 0;
}

// Stage: 0 = first straight; 1 = turn; 2 = second straight;
function monitor(vehicle, path, stage, eta, etd, entry, rot, clearTime) {
  this.vehicle = vehicle;
  this.path = path;
  this.stage = stage;
  this.eta = eta;
  this.etd = etd;
  this.entry = entry;
  this.rot = rot;
  this.clearTime = clearTime;
}

function region(id, nextFree, windows) {
    this.id = id;
    this.nextFree = nextFree;
    this.windows = windows;
}

function path(id, regions, pos, rot, arrivalSpeed, juncLength, aveSpeed, radius, turnTime, pivot, entry, exitAngle) {
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
    this.exitAngle = exitAngle;
}

// Initialise array of junction regions
// Index clockwise, with top-left = 0 and centre = 4
var regions  = [];
var vehicles = [];
var paths    = [];
var monitors = [];

var maxSpeed = 300;
var arrSpeed = 150;
var aveSpeed = 130;
var controlRadius = 0;
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
var safetyBuffer = 0;

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

    controlRadius = Math.min(centerX, centerY);

    // Distance travelled in each diection before reaching the first region of the junction
    nsApproach = centerY - 60;
    ewApproach = centerX - 60;
    //snApproach = centerY + 96;
    //ewApproach = canvas.width - weApproach;

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

    var rightTurnRadius = 125; //measured
    var rightTurnTime = 6.5;
    var rightTurnEntry = 12;
    var leftTurnRadius = 125;
    var leftTurnTime = 6.0;
    var leftTurnEntry = -16;

    //path(id, regions, pos, rot, arrivalSpeed, aveSpeed, radius, turnTime, pivot, entry) {
    var path0 = new path(0, [0,2], [centerX + 31, -36], 0, arrSpeed, 848, aveSpeed, rightTurnRadius, rightTurnTime, [(centerX - 93), (centerY - 93)], (centerY - 94), 90);
    var path1 = new path(1, [0,1], [centerX + 31, -36], 0, maxSpeed, 314, maxSpeed, -1, -1, [], 0, 0);
    var path2 = new path(2, [0], [centerX + 31, -36], 0, arrSpeed, 784, aveSpeed, leftTurnRadius, leftTurnTime, [centerX + 157, centerY - 157], (centerY - 157), -90);

    var path3 = new path(3, [1,3], [canvas.width + 36, centerY + 31], 90, arrSpeed, 848, aveSpeed, rightTurnRadius, rightTurnTime, [(centerX + 93), (centerX + 94)], (centerX + 94), 180);
    var path4 = new path(4, [1,2], [canvas.width + 36, centerY + 31], 90, maxSpeed, 314, maxSpeed, -1, -1, [], 0, 90);
    var path5 = new path(5, [1], [canvas.width + 36, centerY + 31], 90, arrSpeed, 784, aveSpeed, leftTurnRadius, leftTurnTime, [(centerX + 157), (centerX + 157)], (centerX + 157), 0);

    var path6 = new path(6, [2,0], [centerX - 31, canvas.height + 36], 180, arrSpeed, 848, aveSpeed, rightTurnRadius, rightTurnTime, [(centerX + 93), (centerX + 94)], (centerY + 94), 270);
    var path7 = new path(7, [2,3], [centerX - 31, canvas.height + 36], 180, maxSpeed, 314, maxSpeed, -1, -1, [], 0, 180);
    var path8 = new path(8, [2], [centerX - 31, canvas.height + 36], 180, arrSpeed, 784, aveSpeed, leftTurnRadius, leftTurnTime, [(centerX + 157), (centerX + 157)], (centerY + 157), 90);

    var path9 = new path(9, [3,1], [-36, centerY - 31], 270, arrSpeed, 848, aveSpeed, rightTurnRadius, rightTurnTime, [(centerX + 93), (centerX + 94)], (centerX - 94), 360);
    var path10 = new path(10, [3,0], [-36, centerY - 31], 270, maxSpeed, 314, maxSpeed, -1, -1, [], 0, 270);
    var path11 = new path(11, [3], [-36, centerY - 31], 270, arrSpeed, 784, aveSpeed, leftTurnRadius, leftTurnTime, [(centerX + 157), (centerX + 157)], (centerX - 157), 180);

    paths.push(path0);
    paths.push(path1);
    paths.push(path2);

    paths.push(path3);
    paths.push(path4);
    paths.push(path5);

    paths.push(path6);
    paths.push(path7);
    paths.push(path8);

    paths.push(path9);
    paths.push(path10);
    paths.push(path11);


    for(var i = 0; i < 3; i++) {
      regions.push(new region(i, -1, []));
    }

    newVehicle();
  });

var counter = 0;

  function tick(event) {

    if(!event.paused) {
      deltaT = event.delta / 1000;

    counter += deltaT;
    if(counter > 0.75) {
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
    
    var rand = Math.floor((Math.random() * 12));
    var thisPath = paths[rand];
  
    //thisPath = paths[5];

    var graphic = new createjs.Shape();
    // Choose a random vehicle, with probabilities. For now, just car (32 x 74)
    // All vehicles by default are facing South

    switch(thisPath.id % 3) {
      case 0:
        graphic.graphics.beginFill("#a22").drawRect(0,0,32,74);
        break;
       case 1:
        graphic.graphics.beginFill("#222").drawRect(0,0,32,74);
        break;
      case 2:
        graphic.graphics.beginFill("#2a2").drawRect(0,0,32,74);
        break;
    }
    
    graphic.x += thisPath.pos[0];
    graphic.y += thisPath.pos[1];
    graphic.regX = 16;
    graphic.regY = 37;

    graphic.rotation = thisPath.rot;

    // This is a car
    var tempVehicle = new car(maxSpeed, 128, 0, 0, graphic, 0, 0, thisPath.rot, 110);

    vehicles.push(tempVehicle);

    var mon = new monitor(tempVehicle, thisPath, 0, -1, -1, 0, 0, -1);

    setETA(mon);

    monitors.push(mon);

    // TODO: Schedule the new car!!
    stage.addChild(graphic);
  }

  function setETA(monitor) {

    // Initialise eta and etd for the junction
    // TIME IN SECONDS:
    var curTime = ticker.getTime() / 1000;
    var eta;
    var etd;
    var path = monitor.path;
    var veh = monitor.vehicle;
    var s;
    var t = -1;
    var v = 0;
    var boxDist = 0;

    // TODO: Make this intelligent
    switch(path.id % 6) {
      case 1:
        s = nsApproach;
        boxDist = 96;
        eta = (nsApproach / veh.speed) + curTime;
        break;
      case 4:
        s = ewApproach;
        boxDist = 96;
        eta = (ewApproach / veh.speed) + curTime;
        break;
      case 0:
      case 2:
        s = nsApproach;
        v = Math.pow(path.radius, 2) / veh.turnFactor;
        veh.accel = ((v * v) - (veh.speed * veh.speed)) / (2 * nsApproach)
        eta = (v - veh.speed) / veh.accel + curTime;
        break;
      case 3:
      case 5:
        s = ewApproach;
        v = Math.pow(path.radius, 2) / veh.turnFactor;
        veh.accel = ((v * v) - (veh.speed * veh.speed)) / (2 * ewApproach)
        eta = (v - veh.speed) / veh.accel + curTime;
        break;
    }
/*
    // TODO this is mostly arbitrary; make it more general
    if(path.id % 3 == 0) {
      boxDist = 0.25 * Math.PI * path.radius + 3;
    } else if (path.id % 3 == 2) {
      boxDist = 90;
    }

    // TODO: Add testing for windows, also
    // TODO: We're making an assumption that we'll always arrive at the junction with the best speed?

    // Check when we can enter the first region
    var r1 = path.regions[0];
    var r2 = path.regions[1];
    if(eta < regions[r1].nextFree) {
      eta = regions[r1].nextFree;
      t = (regions[r1].nextFree) - curTime;
      v = ((2 * s) / t) - veh.speed;
      veh.accel = ((v * v) - (veh.speed * veh.speed)) / (2 * s);

    }

    // Here, u is v
    var bestV = Math.sqrt((v * v) + 2 * veh.maxAccel * boxDist);

    var etdBestGuess = (bestV - v) / veh.maxAccel + eta;
    var etdWorstGuess = boxDist / v + eta;

    if(path.regions.length == 2) {
      if(regions[r2].nextFree > etdBestGuess) {
        if(regions[r2].nextFree > etdWorstGuess) {
          var gracePeriod = (regions[r2].nextFree - etdWorstGuess);
          eta += gracePeriod;
          veh.accel = (v - veh.speed) / (eta - curTime);
          regions[r1].nextFree = etdWorstGuess + gracePeriod
        } else {
          regions[r1].nextFree = etdWorstGuess;
        }
        var finalV = Math.sqrt((v * v) + 2 * veh.maxAccel * boxDist)
        regions[r2].nextFree = (finalV - v) / veh.maxAccel + regions[r1].nextFree;
        monitor.clearTime = regions[r1].nextFree;
      } else {
        monitor.clearTime = eta;
        regions[r1].nextFree = etdBestGuess;
        var finalV = Math.sqrt((bestV * bestV) + 2 * veh.maxAccel * boxDist)
        regions[r2].nextFree = (finalV - bestV) / veh.maxAccel + regions[r1].nextFree;
      }
      regions[r2].nextFree += safetyBuffer;
    } else {
      regions[r1].nextFree = etdBestGuess + safetyBuffer;
    }*/

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

  // TODO this can be done when updating position maybe????
  function setSpeed(monitor) {

    var vehicle = monitor.vehicle;

    if(vehicle.accel == 0 && monitor.rot >= 45) {
      vehicle.accel = vehicle.maxAccel;
    } else if (vehicle.speed > maxSpeed) {
      vehicle.accel = 0;
      vehicle.speed = maxSpeed;
    }

    vehicle.speed += deltaT * vehicle.accel;



  }

  function updatePosition(monitor) {

    var vehicle = monitor.vehicle;
    var path = monitor.path;

    setSpeed(monitor);

    var dist = vehicle.speed * deltaT;

    var makingTurn = (path.id % 3 != 1);

    var angle = vehicle.graphic.rotation + 180;
    if(monitor.stage == 1) {
      // TEMPORARY - USE FUNCTIOn

      var tempAngle = (180 * dist) / (Math.PI * path.radius);
      if(path.id % 3 == 2) {
        tempAngle *= -1;
      }

      if(Math.abs(monitor.rot + tempAngle) >= 90) {
        monitor.stage = 2;
        tempAngle = (angle + tempAngle - 180) - path.exitAngle;
        angle = path.exitAngle + 180;
        monitor.rot = 90;
        if(path.id % 3 == 2) {
          tempAngle *= -1;
        }
        console.log("UPDATE: " + Math.abs(angle + tempAngle - 180) + ", " + Math.abs(path.exitAngle) + ", " + tempAngle + ", " + angle);
      } else {
        angle += tempAngle;
        monitor.rot += tempAngle;
      }
      
    }

    
    var radAngle = (angle * Math.PI) / 180;
    var transX = dist * Math.sin(radAngle);
    var transY = 0 - dist * Math.cos(radAngle);

    // TODO: Define explicitly the point to start turning, in each path???
    if(makingTurn && monitor.stage == 0) {
      var overshot = -1;
      var target;
      switch (path.rot) {
        case 0:
          if(vehicle.graphic.y + transY >= path.entry) 
            overshot = (vehicle.graphic.y + transY - path.entry);
          break;
        case 90:
          if(vehicle.graphic.x + transX <= path.entry) 
            overshot = path.entry - (vehicle.graphic.x + transX);
          break;
        case 180:
          if(vehicle.graphic.y + transY <= path.entry)
            overshot = path.entry - (vehicle.graphic.y + transY);
          break;
        case 270:
          if(vehicle.graphic.x + transX >= path.entry)
            overshot = (vehicle.graphic.x + transX - path.entry);
          break;
      }

      if(overshot >= 0) {
        tempAngle = (180 * overshot) / (Math.PI * path.radius);
        if(path.id % 3 == 2) {
          tempAngle *= -1;
        }
        angle += tempAngle;
        monitor.rot += tempAngle;
        
        monitor.stage = 1;
        monitor.vehicle.accel = 0;
        radAngle = (angle * Math.PI) / 180;
        transX += overshot * Math.sin(radAngle);
        transY += (0 - overshot * Math.cos(radAngle));
        
      }
    }
    
    vehicle.graphic.rotation = angle - 180;
    
    vehicle.graphic.x += transX;
    vehicle.graphic.y += transY;

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