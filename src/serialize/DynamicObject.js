"use strict";


const Point= require('../Point');
const Serializable= require('./Serializable');
const Serializer= require('./Serializer');

/**
 * Defines an objects which can move about in the game world
 */
class DynamicObject extends Serializable {

    static get netScheme(){
        return {
            id: { type: Serializer.TYPES.UINT8 },
            playerId: { type: Serializer.TYPES.UINT8 },
            x: { type: Serializer.TYPES.INT16 },
            y: { type: Serializer.TYPES.INT16 },
            velX: { type: Serializer.TYPES.FLOAT32 },
            velY: { type: Serializer.TYPES.FLOAT32 },
            angle: { type: Serializer.TYPES.INT16 }
        }
    }

    constructor(id, x, y){
        super();
        this.id = id; //instance id
        this.playerId = 0;
        this.x = x;
        this.y = y;
        this.velX = 0;
        this.velY = 0;
        this.angle = 90;
        this.rotationSpeed = 3;
        this.acceleration = 0.1;
        this.deceleration = 0.99;
        this.maxSpeed = 2;

        //todo deal with what goes over the wire
        this.velocity = new Point();
        this.temp={
            accelerationVector: new Point()
        };

    };

    copyFrom(sourceObj){
        this.id = sourceObj.id;
        this.playerId = sourceObj.playerId;
        this.isPlayerControlled = sourceObj.isPlayerControlled;

        this.x = sourceObj.x;
        this.y = sourceObj.y;
        this.velX = sourceObj.velX;
        this.velY = sourceObj.velY;
        this.velocity.set(sourceObj.velX, sourceObj.velY);
        this.angle = sourceObj.angle;
        this.rotationSpeed = sourceObj.rotationSpeed;
        this.acceleration = sourceObj.acceleration;
        this.deceleration = sourceObj.deceleration;
        this.maxSpeed = sourceObj.maxSpeed;
    }

    step(worldSettings){
        if (this.isRotatingRight){ this.angle += this.rotationSpeed; }
        if (this.isRotatingLeft){this.angle -= this.rotationSpeed; }

        if(this.angle>360){ this.angle -= 360; }
        if(this.angle<0){ this.angle += 360; }

        if (this.isAccelerating) {
            this.temp.accelerationVector.set(
                Math.cos( this.angle * (Math.PI / 180) ),
                Math.sin( this.angle * (Math.PI / 180) )
            ).setMagnitude(this.acceleration);
        }
        else{
            this.temp.accelerationVector.set(0,0);
        }

        // console.log(this.temp.accelerationVector.x,this.temp.accelerationVector.y);
        // console.log(this.temp.accelerationVector.x, this.temp.accelerationVector.y);
        // console.log(this.temp.accelerationVector.x, this.temp.accelerationVector.y);

        //constant velocity, like a missile
        if (this.constantVelocity){
            this.velocity.set(
                Math.cos( this.angle * (Math.PI / 180) ),
                Math.sin( this.angle * (Math.PI / 180) )
            ).setMagnitude(this.constantVelocity);
        }
        else{
            //acceleration
            Point.add(this.velocity,this.temp.accelerationVector, this.velocity);
            this.velocity.multiply(this.deceleration, this.deceleration);
            this.velocity.x = Math.round(this.velocity.x * 100)/100;
            this.velocity.y = Math.round(this.velocity.y * 100)/100;
        }



        this.velX = this.velocity.x;
        this.velY = this.velocity.y;

        this.isAccelerating = false;
        this.isRotatingLeft = false;
        this.isRotatingRight = false;
        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;

        if (this.x>=worldSettings.width){ this.x = worldSettings.width - this.x;}
        else if (this.y>=worldSettings.height){ this.y = worldSettings.height - this.y;}
        else if (this.x < 0){ this.x = worldSettings.width + this.x;}
        else if (this.y<0){ this.y = worldSettings.width + this.y;}
    };

    init(options) {
        Object.assign(this, options);
    }

    initRenderObject(renderer) {
        this.renderer = renderer;
        this.renderObject = this.renderer.addObject(this);
    }

    updateRenderObject() {
        this.renderObject.x = this.x;
        this.renderObject.y = this.y;
        this.renderObject.angle = this.angle;
    }

    interpolate(prevObj, nextObj, playPercentage) {

        // update other objects with interpolation
        // TODO refactor into general interpolation class
        // TODO: this interpolate function should not care about worldSettings.
        if (this.isPlayerControlled != true){

            if (Math.abs(nextObj.x - prevObj.x) > this.renderer.worldSettings.height /2){ //fix for world wraparound
                this.renderObject.x = nextObj.x;
            } else{
                this.renderObject.x = (nextObj.x - prevObj.x) * playPercentage + prevObj.x;
            }

            if (Math.abs(nextObj.y - prevObj.y) > this.renderer.worldSettings.height/2) { //fix for world wraparound
                this.renderObject.y = nextObj.y;
            } else{
                this.renderObject.y = (nextObj.y - prevObj.y) * playPercentage + prevObj.y;
            }

            var shortest_angle=((((nextObj.angle - prevObj.angle) % 360) + 540) % 360) - 180; //todo wrap this in a util
            this.renderObject.angle = prevObj.angle + shortest_angle *  playPercentage;
        }
    }

    // release resources
    destroy() {
        console.log(`destroying object ${this.id}`);

        // destroy the renderObject
        if (this.renderObject) {
            this.renderer.removeObject(this.renderObject);
        }
    }


}


module.exports = DynamicObject;
