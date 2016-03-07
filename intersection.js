//// Smart Junction Simulator

// Gulliver Johnson
// gulliver.io/intersection
// v0.1, March 2016

// Note to anyone reading: The following is very rough prototype code - feel free to contact
// me if you'd like to understand what's going on without losing brain cells in the process!
// Once v1.0 is out, there will be an accompanying explanation covering how it works.
//
// gulliverjohnson@gmail.com

function region(id, nextFree) {
  this.id = id;
  this.nextFree = nextFree;
}

function path(id, regions, pos, rot, radius, entry, exitAngle) {
  this.id = id;
  this.regions = regions;
  this.pos = pos;
  this.rot = rot;
  this.radius = radius;
  this.entry = entry;
  this.exitAngle = exitAngle;
}

function monitor(vehicle, path, stage, rot, waitDelay, nextMon, prevMon) {
  this.vehicle = vehicle;
  this.path = path;
  this.stage = stage;
  this.rot = rot;
  this.waitDelay = waitDelay;
  this.nextMon = nextMon;
  this.prevMon = prevMon;
}

function car(speed, maxAccel, accel, graphic) {
  this.speed = speed;
  this.maxAccel = maxAccel
  this.accel = accel;
  this.graphic = graphic;
}

var regions  = [];
var paths    = [];

// User parameters
var timeMult = 1;
var maxSpeed = 350;
var safetyBuffer = 0.0;

var centerX;
var centerY;
var deltaT;
var curTime;
var nsApproach = 0;
var ewApproach = 0;
var stage;
var ticker;

var monitorsHead = null;
var monitorsTail = null;

var carsWaiting = 0;

var validPaths = [0,1,2,3,4,5,6,7,8,9,10,11];

/*
document.getElementById("speedSetting").onchange = function() {
  console.log("Changing Speed: " + document.getElementById("speedSetting").value);
  safetyBuffer = parseFloat(document.getElementById("speedSetting").value);
};

document.getElementById("nflow").onchange = function() {changeFlow();}
document.getElementById("eflow").onchange = function() {changeFlow();}
document.getElementById("sflow").onchange = function() {changeFlow();}
document.getElementById("wflow").onchange = function() {changeFlow();}

function changeFlow() {
  var tempList = []
  if(document.getElementById("nflow").checked == true) {
    for(var i = 0; i < 3; i++)
      tempList.push(i);
  }
  if(document.getElementById("eflow").checked == true) {
    for(var i = 3; i < 6; i++)
      tempList.push(i);
  }
  if(document.getElementById("sflow").checked == true) {
    for(var i = 6; i < 9; i++)
      tempList.push(i);
  }
  if(document.getElementById("wflow").checked == true) {
    for(var i = 9; i < 12; i++)
      tempList.push(i);
  }
  validPaths = tempList;
  console.log("Updating paths: " + validPaths);
}*/


/*
window.onblur = function() {
    ticker.paused = true;
    pauseTime = ticker.getTime() / 1000;
    console.log("Pausing at " + ticker.getTime() / 1000);
}

window.onfocus = function() {
    ticker.paused = false;
    pauseDelay = (ticker.getTime() / 1000) - pauseTime;
    console.log("Resuming at " + ticker.getTime() / 1000);
    console.log("Pause Delay: " + pauseDelay);
    pauseTime = 0;
}*/

// Count the number of cars waiting to approach the junction

 $(document).ready(function($){

    ///////////////////////////////////////////////////
    /****          Canvas/createJS setup          ****/
    ///////////////////////////////////////////////////

    // Initialise canvas
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    canvas.width = window.innerWidth - 384;
    canvas.height = window.innerHeight;

    // Initialise stage and background image
    stage = new createjs.Stage("canvas");
    centerX = canvas.width  / 2;
    centerY = canvas.height / 2;

    var test = new createjs.Bitmap('./elem/road-sec-ns.png');
    test.x = centerX - 63;
    test.y = 0;
    test.scaleY = window.innerHeight;
    stage.addChild(test);

    var test2 = new createjs.Bitmap('./elem/road-sec-ew.png');
    test2.y = centerY - 63;
    test2.x = 0;
    test2.scaleX = window.innerWidth;
    stage.addChild(test2);

    var bitmap = new createjs.Bitmap('./elem/junc-centre.png');
    bitmap.x = centerX - 150;
    bitmap.y = centerY - 150;
    stage.addChild(bitmap);
    
    // Initialise createjs ticker
    ticker = createjs.Ticker;
    ticker.setFPS(60);
    ticker.timingMode = createjs.Ticker.RAF;
    ticker.addEventListener("tick", tick);

    ///////////////////////////////////////////////////
    /****  Junction Dimensions and Path Knowledge ****/
    ///////////////////////////////////////////////////

    // Store distance from screen edge to junction
    nsApproach = centerY - 96;
    ewApproach = centerX - 96;

    // Radius of a left/right hand turn
    var rightTurnRadius = 125;
    var leftTurnRadius = 125;

    // Describing each path through the junction
    // Params: id, regions required, starting position, starting orientation, radius of turn, point of junction entry, exit orientation
    // Path ID order: Right-turn first, then straight-ahead, then left turn, for each direction

    // Originating North
    var path0 = new path(0, [0,2], [centerX + 31, -36], 0, rightTurnRadius, (centerY - 94), 90);
    var path1 = new path(1, [0,1], [centerX + 31, -36], 0, 0, 0, 0);
    var path2 = new path(2, [0], [centerX + 31, -36], 0, leftTurnRadius, (centerY - 157), -90);

    // East
    var path3 = new path(3, [1,3], [canvas.width + 36, centerY + 31], 90, rightTurnRadius, (centerX + 94), 180);
    var path4 = new path(4, [1,2], [canvas.width + 36, centerY + 31], 90, -1, 0, 90);
    var path5 = new path(5, [1], [canvas.width + 36, centerY + 31], 90, leftTurnRadius, (centerX + 157), 0);

    // South
    var path6 = new path(6, [2,0], [centerX - 31, canvas.height + 36], 180, rightTurnRadius, (centerY + 94), 270);
    var path7 = new path(7, [2,3], [centerX - 31, canvas.height + 36], 180, -1, 0, 180);
    var path8 = new path(8, [2], [centerX - 31, canvas.height + 36], 180, leftTurnRadius, (centerY + 157), 90);

    // West
    var path9 = new path(9, [3,1], [-36, centerY - 31], 270, rightTurnRadius, (centerX - 94), 360);
    var path10 = new path(10, [3,0], [-36, centerY - 31], 270, -1, 0, 270);
    var path11 = new path(11, [3], [-36, centerY - 31], 270, leftTurnRadius, (centerX - 157), 180);

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

    // Initialise array of regions
    // Regions are labelled clockwise, 0 - 3, from the upper-right block
    // Region 4 is the centre region
    for(var i = 0; i < 5; i++) {
      regions.push(new region(i, -1));
    }

  });

  // The main update function
  function tick(event) {
    
    if(!event.paused) {
      deltaT = (event.delta / 1000);
      curTime = (ticker.getTime() / 1000);

      // CURRENT HEURISTIC FOR SPAWN RATE: No more than 4 waiting.
      if(carsWaiting < 5) {
        newVehicle();
      }

      // Update vehicle positions
      var mon = monitorsHead;
      while(mon != null) {
        updatePosition(mon);
        mon = mon.nextMon;
      }

      stage.update(event);
    }
  }


  /* Add a new vehicle to the simulation */
  function newVehicle() {

    // Choose the path
    // TODO: Add selection criteria
    var rand = Math.floor((Math.random() * validPaths.length));
    var pathID = validPaths[rand];
    var thisPath = paths[pathID];

    // Initialise the graphic (a grey rectangle)
    var graphic = new createjs.Shape();
    graphic.graphics.beginFill("#444").drawRect(0,0,30,70);
    graphic.x += thisPath.pos[0];
    graphic.y += thisPath.pos[1];
    graphic.regX = 15; // Testing - orig 16
    graphic.regY = 35; // Testing - orig 37
    graphic.rotation = thisPath.rot;
    stage.addChild(graphic);

    // For now, create a car. Later versions will feature probabilistic selection of vehicle
    var thisVehicle = new car(maxSpeed, 128, 0, graphic);

    // Create and assign a monitor to this vehicle
    var mon = new monitor(thisVehicle, thisPath, -1, -1, 0, null, null);

    // Add monitor to the doubly linked list
    if(monitorsHead == null) {
      monitorsHead = mon;
      monitorsTail = mon;
    } else {
      monitorsTail.nextMon = mon;
      mon.prevMon = monitorsTail;
      monitorsTail = mon;
    }

    // Run the scheduling algorithm on the monitor
    setETA(mon);
  }

  /* Schedule the arrival a newly approaching car */
  // NOTE: To be fully rewritten for v1.0
  function setETA(monitor) {
    var path = monitor.path;
    var veh = monitor.vehicle;
    var eta;
    var boxDist = 0;
    
    // Calculate the best possible ETA
    // Set the average 'box length' for this path (TODO hardcode elsewhere)
    switch(path.id % 6) {
      case 1:
        boxDist = 96;
        eta = (nsApproach / maxSpeed) + curTime;
        break;
      case 4:
        boxDist = 96;
        eta = (ewApproach / maxSpeed) + curTime;
        break;
      case 0:
      case 2:
        veh.accel = 0;
        eta = (nsApproach / maxSpeed) + curTime;
        break;
      case 3:
      case 5:
        veh.accel = 0;
        eta = (ewApproach / maxSpeed) + curTime;
        break;
    }

    if(path.id % 3 == 0) {
      boxDist = (0.25 * Math.PI * path.radius); // Note should have a different vehicleLength reading because of the nature of the turn
    } else if (path.id % 3 == 2) {
      boxDist = (0.5 * Math.PI * path.radius);
    }

    var r1 = path.regions[0];

    //// Schedule passage through the first required region

    // If we have to wait, calculate how long for
    if(eta < regions[r1].nextFree) {
      monitor.waitDelay = regions[r1].nextFree - eta + curTime;
      eta = regions[r1].nextFree;
    }

    // Make an optimistic assumption of when we need the lock on our second required region
    var etdBestGuess = (boxDist / maxSpeed) + eta;
    regions[r1].nextFree = etdBestGuess + safetyBuffer + 74 / maxSpeed; // TODO should be vehicle length/vehicle speed at exit...
    if(path.id % 3 == 0) {
      regions[r1].nextFree += 0.2; // TODO: Hack to avoid some near encounters
    }

    // Schedule other regions if we need them
    if(path.regions.length == 2) {
      var r2 = path.regions[1];
      var etaCent = (etdBestGuess + eta) / 2;
      var lag = 0;

      //// Scheduling passage through the centre region
      // Note that cars passing straight through set the lock on the centre
      // but don't require it to pass through
      if(path.id % 3 == 0 && regions[4].nextFree > etaCent) {
        // Calculate how long we need to wait for our region
        lag = regions[4].nextFree - etaCent;

        if(monitor.waitDelay == 0) {
          monitor.waitDelay = lag + curTime;  
        } else {
          monitor.waitDelay += lag;
        }

        regions[r1].nextFree += lag;
        etdBestGuess += lag;
        regions[4].nextFree += (boxDist + 74) / maxSpeed + safetyBuffer;
      } else {
        // No waiting to be done so far; set nextFree
        regions[4].nextFree = etaCent + ((boxDist + 74)/maxSpeed) + safetyBuffer;
      }

      //// Scheduling passage through our final region
      if(regions[r2].nextFree > etdBestGuess) {
        lag = regions[r2].nextFree - etdBestGuess;

        if(monitor.waitDelay == 0) {
          monitor.waitDelay = lag + curTime;  
        } else {
          monitor.waitDelay += lag;
        }

        regions[r1].nextFree += lag;
        regions[4].nextFree += lag;
        regions[r2].nextFree += (boxDist + 74) / maxSpeed + safetyBuffer;
      } else {
        regions[r2].nextFree = etdBestGuess + ((boxDist + 74)/maxSpeed) + safetyBuffer;
      }

    }

    // Keep a record of how many cars are waiting to approach at any given time
    if(monitor.waitDelay > 0) {
      carsWaiting++;
    }

  }

  function updatePosition(monitor) {

    var vehicle = monitor.vehicle;
    var path = monitor.path;
    var completed = false;

    // Check if this car's left the screen; if so, remove from the list
    switch(path.id % 4) {
      case 0:
        if(vehicle.graphic.x < - 74) // TODO: Forget this in general
          completed = true;
        break;
      case 1:
        if(vehicle.graphic.y > (centerY * 2 + 74)) // TODO Store screenheight, this is unnecessary mess
          completed = true;
        break;
      case 2:
        if(vehicle.graphic.x > (centerX * 2 + 74))
          completed = true;
        break;
      case 3:
        if(vehicle.graphic.y < -74)
          completed = true;
        break;
      default:
        break;
    }

    if(completed) {

      if(monitor.prevMon != null) {
        monitor.prevMon.nextMon = monitor.nextMon;
      } else {
        monitorsHead = monitor.nextMon;
      }

      if(monitor.nextMon != null) {
        monitor.nextMon.prevMon = monitor.prevMon;
      }

      return;
    }

    // Set the speed before calculating translation
    // Note: At present, options are 0 or maxSpeed
    setSpeed(monitor);

    var dist = vehicle.speed * deltaT;

    var makingTurn = (path.id % 3 != 1); // True if the path involves a turn

    var angle = vehicle.graphic.rotation + 180;

    // Stage 1 indicates a car is in the process of turning; calculate translation
    if(monitor.stage == 1) {
      var tempAngle = (180 * dist) / (Math.PI * path.radius);
      if(path.id % 3 == 2) {
        tempAngle *= -1;
      }

      if(Math.abs(monitor.rot + tempAngle) >= 90) {
        // Stage 2 indicates that a car has completed its turn
        monitor.stage = 2;
        tempAngle = (angle + tempAngle - 180) - path.exitAngle;
        angle = path.exitAngle + 180;
        monitor.rot = 90;
        if(path.id % 3 == 2) {
          tempAngle *= -1;
        }
      } else {
        angle += tempAngle;
        monitor.rot += tempAngle;
      }
      
    }
    
    var radAngle = (angle * Math.PI) / 180;
    var transX = dist * Math.sin(radAngle);
    var transY = 0 - dist * Math.cos(radAngle);

    // Calculate minor corrective details to rounding errors/overshooting the turn
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

  /* Set the speed of a vehicle based on its position and schedule */
  function setSpeed(monitor) {

    var vehicle = monitor.vehicle;

    // Stage = -1 indicates that a car is waiting
    if(monitor.stage == -1) {
      
      if(monitor.waitDelay <= curTime) {
        monitor.stage = 0;
        if(monitor.waitDelay > 0) {
          carsWaiting--;
        }        
        vehicle.speed = maxSpeed;
      } else {
        vehicle.speed = 0;
      }
    } else {
      vehicle.speed = maxSpeed;
    }
  }