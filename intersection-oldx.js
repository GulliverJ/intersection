
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
function monitor(vehicle, path, stage, eta, etd, entry) {
  this.vehicle = vehicle;
  this.path = path;
  this.stage = stage;
  this.eta = eta;
  this.etd = etd;
  this.entry = entry;
  rot = 0;
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

    //path(id, regions, pos, rot, arrivalSpeed, aveSpeed, radius, turnTime, pivot, entry) {
    var path0 = new path(0, [0,4,2], [centerX + 31, -36], 0, 150, 848, 130, 125, 6.5, [(centerX - 93), (centerY - 93)], centerY - 64);
    var path1 = new path(1, [0,1], [centerX + 31, -36], 0, maxSpeed, 314, maxSpeed, -1, -1, [], 0);
    var path2 = new path(2, [0], [centerX + 31, -36], 0, 150, 784, 130, 125, 6.0, [centerX + 125, centerY - 125], 0);

    paths.push(path0);
    paths.push(path1);
    paths.push(path2);

    // TEST CODE - TO BE IN A CREATOR FUNCTION
    newVehicle();

  });


  function tick(event) {
    deltaT = event.delta / 1000;

    updateVehicles();

    stage.update(event);

  }

  function newVehicle() {

    // TODO: Randomly choose path
    var thisPath = paths[2];


    var graphic = new createjs.Shape();
    // Choose a random vehicle, with probabilities. For now, just car (32 x 74)
    // All vehicles by default are facing South
    graphic.graphics.beginFill("#222").drawRect(0,0,32,74);
    
    console.log("INIT X " + graphic.x);
    console.log("INIT Y " + graphic.y);

    graphic.x += thisPath.pos[0];
    graphic.y += thisPath.pos[1];

    graphic.regX = 16;
    graphic.regY = 37;

    console.log("THEN X " + graphic.x);
    console.log("THEN Y " + graphic.y);


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


    monitors.push(new monitor(tempVehicle, thisPath, 0, eta, etd, 0));

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

    //graphic.x -= dX;
    //graphic.y -= dY;
    console.log("NEW x,y: " + graphic.x + ", " + graphic.y);
    console.log("NEW regx,regy: " + graphic.regX + ", " + graphic.regY);
  }

  function resetPivot(graphic, point) {
    var dX = graphic.x - point[0];
    var dY = graphic.y - point[1];
    graphic.regX = graphic.x;
    graphic.regY = graphic.y;
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




    switch(path.rot) {
      case 0:
        // Drive straight
        if(monitor.stage == 0) {
          if(path.id % 3 != 1) {
            target = centerY - path.radius + path.entry;
            console.log("RANDOMSOM " + target);
            trans = dist;
            if(vehicle.graphic.y + trans >= target) {
              dist -= (target - vehicle.graphic.y);
              monitor.vehicle.graphic.y = target;
              monitor.stage = 2;
              // Gotta set hte pivot point
              setPivot(monitor.vehicle.graphic, path.pivot);



            }
          }
          monitor.vehicle.graphic.y += dist;
        }

        // Rotate about dist
        if(monitor.stage == 2) {
          var angle = (180 * dist) / (Math.PI * path.radius);
          if(monitor.rot + angle >= 90) {
            dist *= ((90 - monitor.rot) / angle);
            angle = 90 - monitor.rot;
            monitor.rot = 90;
            monitor.stage == 4;


            //resetPivot(vehicle.graphic, path.pivot);
          }
          if(path.id % 3 == 2) {
            angle = 0 - angle;
          }
          vehicle.graphic.rotation += angle;
        }

        if(monitor.stage == 4) {
          if(path.id % 3 == 0) {
            vehicle.graphic.x -= dist;
          } else {
            vehicle.graphic.x += dist;
          }
        }
        break;
      case 90:
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



/*
    rectangle = new createjs.Shape();
    rectangle.graphics.beginFill("#CCCCCC").drawRect(0,groundHeight,canvas.width,80);

    reset = false;


    resetRocket();

    stage.regX = canvas.width/2;
    stage.regY = canvas.height;

    stage.x = canvas.width/2;
    stage.y = canvas.height;

    rocket.lowestY = groundHeight;

    circle = new createjs.Shape();
    circle.graphics.beginFill("DeepSkyBlue").drawCircle(0, 00, 50);
    circle.x = 1000;
    circle.y = 100;
    //stage.addChild(rectangle);
    stage.addChild(rectangle, launcher);

  createjs.Ticker.setFPS(60);
    createjs.Ticker.timingMode = createjs.Ticker.RAF;
    createjs.Ticker.addEventListener("tick", tick);*/






    /*
    if(dead || landed) {
        return;
    }

    deltaT = event.delta / 1000;

    var thrustX = thrust * Math.sin(angle);
    var thrustY = (thrust * Math.cos(angle)) + (environment.gravity * rocket.mass);

    xVel += thrustX * deltaT;

    if(inContact) {
      xVel *= 0.9; // Simulated friction D: todo
      yVel = thrustY * deltaT;
      if(yVel < 0) {
        yVel = 0;
      }
    } else {
      
      yVel += thrustY * deltaT;
    }

    deltaX = xVel * deltaT;
    deltaY = yVel * deltaT;

    // Deals with rocking on the base
    // Yes, it's a variable called blah
    // I can only apologise ;_;
    var blah = 1;
    if(inContact) {
      if(angle < 0) {
        angle = angle + Math.atan( 15 / rocket.com );
      } else if(angle > 0) {
        angle = angle - Math.atan( 15 / rocket.com );
      }
    } else {
      if(thrustY > 0) {
        blah = (50 - thrustY) / 50; // Seems to work, for now
      } else {
        blah = 0;
      }
    }

    // This is dumb, ain't it.
    if(blah < 0) {
      blah = 0;
    }

    // What does this even mean?
    legAngle = angle;

    var spin = (Math.abs(environment.gravity * rocket.mass) * Math.sin(angle)) * blah;  

    rotMomentum += spin * deltaT;

    if(coldGasRight) {
      rotMomentum -= coldGasThrust * deltaT;
    }
    if(coldGasLeft) {
      rotMomentum += coldGasThrust * deltaT;
    }

    var tempRot = launcher.rotation + (rotMomentum * deltaT);

    angle = (tempRot * Math.PI) / 180;

    var tAngle = angle;

    if(!inContact) {

        if(Math.abs(tAngle) > Math.PI) {
          if(tAngle > 0) {
            tAngle = ((2 * Math.PI) - angle);
          } else {
            tAngle = ((2 * Math.PI) + angle);
          }
        }         

        if(Math.abs(tAngle) < Math.PI/2) {
            rocket.lowestY = launcher.y + ((15 * Math.sin(Math.abs(tAngle))) + (50 * Math.cos(Math.abs(tAngle))));       
        } else {

            tAngle = Math.abs(tAngle) - (Math.PI/2);
            rocket.lowestY = launcher.y + ((150 * Math.sin(Math.abs(tAngle))) + (15 * Math.cos(Math.abs(tAngle))));
        }
    }

    if(deltaY < 0) {
      if(inContact) {
        deltaY = 0;
      } else if (rocket.lowestY - deltaY >= groundHeight) {
        inContact = true;
        
        deltaY = rocket.lowestY - groundHeight;

        if (Math.abs(angle) < Math.PI/2) {
          if(angle < 0) {
            legAngle = angle + Math.atan( 15 / rocket.com );
          } else if(angle > 0) {
            legAngle = angle - Math.atan( 15 / rocket.com );
          }
          console.log(": " + deltaY + ", " + tAngle);
        }


        

      } 
    }

    if(inContact) {
      if(!dev && (Math.abs(angle) >= Math.PI/2 || yVel < -50)) {
        launcher.graphics.beginFill("#f00").drawRect(0, 0, 30, 200);
        stage.update(event);
        dead = true;
        return;
      }

      if(deltaY > 0) {
        
        inContact = false;
        setOrigin("COM");
      } else {

        if(Math.abs(tempRot) >= 90) {
          console.log("You're dead!");
          
        } else if(tempRot < 0) {
          setOrigin("LEFT");
        } else {
          setOrigin("RIGHT");
        }
      }

      if(!dev && Math.abs(angle) < 0.001 && Math.abs(rotMomentum) < 1 && Math.abs(yVel) < 10 && Math.abs(xVel) < 10) {
        launcher.graphics.beginFill("#0f0").drawRect(0, 0, 30, 200);
        stage.update(event);
        landed = true;
      }
    }

    // Applies rotation
    launcher.rotation = tempRot;
    rotMomentum *= airResistance;
    xVel *= airResistance;
    yVel *= airResistance;

    // Applies translation
    launcher.y -= deltaY;
    launcher.x += deltaX;

    stage.update(event);
    */