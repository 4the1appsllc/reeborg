(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
require("./rur.js");
RUR.EAST = 0;
RUR.NORTH = 1;
RUR.WEST = 2;
RUR.SOUTH = 3;

// all images are of this size.
RUR.TILE_SIZE = 40;

// current default canvas size.
RUR.DEFAULT_HEIGHT = 550;
RUR.DEFAULT_WIDTH = 625;

// TODO: set up all canvas in separate isolated function so that
// unit testing can be done more easily - with contants defined but without
// having to mock document.

RUR.BACKGROUND_CANVAS = document.getElementById("background-canvas");
RUR.HEIGHT = RUR.BACKGROUND_CANVAS.height;
RUR.WIDTH = RUR.BACKGROUND_CANVAS.width;

RUR.BACKGROUND_CTX = document.getElementById("background-canvas").getContext("2d");
RUR.SECOND_LAYER_CTX = document.getElementById("second-layer-canvas").getContext("2d");
RUR.GOAL_CTX = document.getElementById("goal-canvas").getContext("2d");
RUR.OBJECTS_CTX = document.getElementById("objects-canvas").getContext("2d");
RUR.TRACE_CTX = document.getElementById("trace-canvas").getContext("2d");
RUR.ROBOT_CTX = document.getElementById("robot-canvas").getContext("2d");

RUR.BACKGROUND_CTX.font = "bold 12px sans-serif";

RUR.WALL_LENGTH = 40;   // These can be adjusted
RUR.WALL_THICKNESS = 4;  // elsewhere if RUR.CURRENT_WORLD.small_tiles become true.

RUR.ROWS = Math.floor(RUR.HEIGHT / RUR.WALL_LENGTH) - 1;
RUR.COLS = Math.floor(RUR.WIDTH / RUR.WALL_LENGTH) - 1;
// the current default values of RUR.COLS and RUR.ROWS on the fixed-size
// canvas work out to be 14 and 12 respectively: these seem to be appropriate
// values for the lower entry screen resolution.  The following are meant
// to be essentially synonymous - but are also meant to be used only if/when
// specific values are not used in the "new" dialog that allows them to be specified
// worlds created.  Everywhere else, RUR.COLS and RUR.ROWS should be used.
RUR.MAX_X = 14;
RUR.MAX_Y = 12;
RUR.USE_SMALL_TILES = false;  // keep as unchanged default

RUR.WALL_COLOR = "brown";   // changed (toggled) in world_editor.js
RUR.SHADOW_WALL_COLOR= "#f0f0f0";    // changed (toggled) in world_editor.js
RUR.GOAL_WALL_COLOR = "black";
RUR.COORDINATES_COLOR = "black";
RUR.AXIS_LABEL_COLOR = "brown";

RUR.MAX_STEPS = 1000;
RUR.MIN_TIME_SOUND = 250;

RUR.DEFAULT_TRACE_COLOR = "seagreen";

RUR.KNOWN_OBJECTS = [];
RUR.KNOWN_TILES = [];
RUR.KNOWN_SOLID_OBJECTS = [];
RUR.ANIMATION_TIME = 120;

RUR._CALLBACK_FN = function () {
    alert("FATAL internal error: RUR._CALLBACK_FN was not initialized.");
};

},{"./rur.js":43}],2:[function(require,module,exports){

/*jshint  -W002,browser:true, devel:true, indent:4, white:false, plusplus:false */
/*globals $, RUR */

require("./translator.js");
require("./constants.js");
require("./objects.js");
require("./output.js");
require("./recorder/record_frame.js");
require("./state.js");
require("./exceptions.js");
require("./world_get.js");
require("./world_set.js");

RUR.control = {};

RUR.control.move = function (robot) {
    "use strict";
    var tile, tiles, name, objects, tile_beyond, solid_tile_beyond,
        solids_beyond, solid_object_beyond,
        pushable_object_here, pushable_object_beyond,
        wall_beyond, x_beyond, y_beyond;

    if (RUR.control.wall_in_front(robot)) {
        throw new RUR.WallCollisionError(RUR.translate("Ouch! I hit a wall!"));
    }

    robot._prev_x = robot.x;
    robot._prev_y = robot.y;

    x_beyond = robot.x;  // if robot is moving vertically, it x coordinate does not change
    y_beyond = robot.y;

    switch (robot._orientation){
    case RUR.EAST:
        robot.x += 1;
        x_beyond = robot.x + 1;
        break;
    case RUR.NORTH:
        robot.y += 1;
        y_beyond = robot.y + 1;
        break;
    case RUR.WEST:
        robot.x -= 1;
        x_beyond = robot.x - 1;
        break;
    case RUR.SOUTH:
        robot.y -= 1;
        y_beyond = robot.y - 1;
        break;
    default:
        throw new Error("Should not happen: unhandled case in RUR.control.move().");
    }

    pushable_object_here = RUR.world_get.pushable_object_at_position(robot.x, robot.y);

    if (pushable_object_here) {
        // we had assume that we have made a successful move as nothing was
        // blocking the robot which is now at its next position.
        // However, something may have prevented the pushable object from
        // actually being pushed
        wall_beyond = RUR.control.wall_in_front(robot);
        pushable_object_beyond = RUR.world_get.pushable_object_at_position(x_beyond, y_beyond);
        tile_beyond = RUR.world_get.tile_at_position(x_beyond, y_beyond);
        if (tile_beyond && tile_beyond.solid) {
            solid_tile_beyond = true;
            } else {
            solid_tile_beyond = false;
        }

        solids_beyond = RUR.world_get.solid_objects_at_position(x_beyond, y_beyond);
        solid_object_beyond = false;
        if (solids_beyond) {
            for (name in solids_beyond) {
                if (RUR.SOLID_OBJECTS[name] !== undefined && RUR.SOLID_OBJECTS[name].solid) {
                    solid_object_beyond = true;
                    break;
                }
            }
        }

        if (pushable_object_beyond || wall_beyond || solid_tile_beyond || solid_object_beyond) {
            robot.x = robot._prev_x;
            robot.y = robot._prev_y;
            throw new RUR.ReeborgError(RUR.translate("Something is blocking the way!"));
        } else {
            RUR.control.move_object(pushable_object_here, robot.x, robot.y,
            x_beyond, y_beyond);
        }
    }

    RUR.state.sound_id = "#move-sound";
    RUR.record_frame("debug", "RUR.control.move");
    tile = RUR.world_get.tile_at_position(robot.x, robot.y);
    if (tile) {
        if (tile.fatal){
            if (!(tile == RUR.TILES.water && RUR.control.solid_object_here(robot, RUR.translate("bridge"))) ){
                throw new RUR.ReeborgError(RUR.translate(tile.message));
            }
        }
        if (tile.slippery){
            RUR.output.write(RUR.translate(tile.message) + "\n");
            RUR.control.move(robot);
        }
    }

    objects = RUR.world_get.solid_objects_at_position(robot.x, robot.y);
    if (objects) {
        for (name in objects) {
            if (RUR.SOLID_OBJECTS[name] !== undefined && RUR.SOLID_OBJECTS[name].fatal) {
                robot.x = robot._prev_x;
                robot.y = robot._prev_y;
                throw new RUR.ReeborgError(RUR.SOLID_OBJECTS[name].message);
            }
        }
    }
};

RUR.control.move_object = function(obj, x, y, to_x, to_y){
    "use strict";
    var bridge_already_there = false;
    if (RUR.world_get.solid_objects_at_position(to_x, to_y).bridge !== undefined){
        bridge_already_there = true;
    }


    RUR.add_object_at_position(obj, x, y, 0);
    if (RUR.OBJECTS[obj].in_water &&
        RUR.world_get.tile_at_position(to_x, to_y) == RUR.TILES.water &&
        !bridge_already_there){
            // TODO: fix this
        RUR.world_set.add_solid_object(RUR.OBJECTS[obj].in_water, to_x, to_y, 1);
    } else {
        RUR.add_object_at_position(obj, to_x, to_y, 1);
    }
};


RUR.control.turn_left = function(robot){
    "use strict";
    robot._prev_orientation = robot._orientation;
    robot._prev_x = robot.x;
    robot._prev_y = robot.y;
    robot._orientation += 1;  // could have used "++" instead of "+= 1"
    robot._orientation %= 4;
    RUR.state.sound_id = "#turn-sound";
    RUR.record_frame("debug", "RUR.control.turn_left");
};

RUR.control.__turn_right = function(robot){
    "use strict";
    robot._prev_orientation = (robot._orientation+2)%4; // fix so that oil trace looks right
    robot._prev_x = robot.x;
    robot._prev_y = robot.y;
    robot._orientation += 3;
    robot._orientation %= 4;
    RUR.record_frame("debug", "RUR.control.__turn_right");
};

RUR.control.pause = function (ms) {
    RUR.record_frame("pause", {pause_time:ms});
};

RUR.control.done = function () {
    throw new RUR.ReeborgError(RUR.translate("Done!"));
};

RUR.control.put = function(robot, arg){
    var translated_arg, objects_carried, obj_type, all_objects;
    RUR.state.sound_id = "#put-sound";

    if (arg !== undefined) {
        translated_arg = RUR.translate_to_english(arg);
        if (RUR.KNOWN_OBJECTS.indexOf(translated_arg) == -1){
            throw new RUR.ReeborgError(RUR.translate("Unknown object").supplant({obj: arg}));
        }
    }

    objects_carried = robot.objects;
    all_objects = [];
    for (obj_type in objects_carried) {
        if (objects_carried.hasOwnProperty(obj_type)) {
            all_objects.push(obj_type);
        }
    }
    if (all_objects.length === 0){
        throw new RUR.ReeborgError(RUR.translate("I don't have any object to put down!").supplant({obj: RUR.translate("object")}));
    }
    if (arg !== undefined) {
        if (robot.objects[translated_arg] === undefined) {
            throw new RUR.ReeborgError(RUR.translate("I don't have any object to put down!").supplant({obj:arg}));
        }  else {
            RUR.control._robot_put_down_object(robot, translated_arg);
        }
    }  else {
        if (objects_carried.length === 0){
            throw new RUR.ReeborgError(RUR.translate("I don't have any object to put down!").supplant({obj: RUR.translate("object")}));
        } else if (all_objects.length > 1){
             throw new RUR.ReeborgError(RUR.translate("I carry too many different objects. I don't know which one to put down!"));
        } else {
            RUR.control._robot_put_down_object(robot, translated_arg);
        }
    }
};

RUR.control._robot_put_down_object = function (robot, obj) {
    "use strict";
    var objects_carried, coords, obj_type;
    if (obj === undefined){
        objects_carried = robot.objects;
        for (obj_type in objects_carried) {
            if (objects_carried.hasOwnProperty(obj_type)) {
                obj = obj_type;
            }
        }
    }
    robot.objects[obj] -= 1;
    if (robot.objects[obj] === 0) {
        delete robot.objects[obj];
    }

    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "objects");
    coords = robot.x + "," + robot.y;
    RUR._ensure_key_exists(RUR.CURRENT_WORLD.objects, coords);
    if (RUR.CURRENT_WORLD.objects[coords][obj] === undefined) {
        RUR.CURRENT_WORLD.objects[coords][obj] = 1;
    } else {
        RUR.CURRENT_WORLD.objects[coords][obj] += 1;
    }
    RUR.record_frame("debug", "RUR.control._put_object");
};


RUR.control.take = function(robot, arg){
    var translated_arg, objects_here;
    RUR.state.sound_id = "#take-sound";
    if (arg !== undefined) {
        translated_arg = RUR.translate_to_english(arg);
        if (RUR.KNOWN_OBJECTS.indexOf(translated_arg) == -1){
            throw new RUR.ReeborgError(RUR.translate("Unknown object").supplant({obj: arg}));
        }
    }

    objects_here = RUR.world_get.object_at_robot_position(robot, arg);
    if (arg !== undefined) {
        // WARNING: do not change this silly comparison to false
        // to anything else ... []==false is true  but []==[] is false
        // and ![] is false
        if (objects_here.length === 0 || objects_here == false) { // jshint ignore:line
            throw new RUR.ReeborgError(RUR.translate("No object found here").supplant({obj: arg}));
        }  else {
            RUR.control._take_object_and_give_to_robot(robot, arg);
        }
        // WARNING: do not change this silly comparison to false
        // to anything else ... []==false is true  but []==[] is false
        // and ![] is false
    }  else if (objects_here.length === 0 || objects_here == false){ // jshint ignore:line
        throw new RUR.ReeborgError(RUR.translate("No object found here").supplant({obj: RUR.translate("object")}));
    }  else if (objects_here.length > 1){
        throw new RUR.ReeborgError(RUR.translate("Many objects are here; I do not know which one to take!"));
    } else {
        RUR.control._take_object_and_give_to_robot(robot, objects_here[0]);
    }
};

RUR.control._take_object_and_give_to_robot = function (robot, obj) {
    var objects_here, coords;
    obj = RUR.translate_to_english(obj);
    coords = robot.x + "," + robot.y;
    RUR.CURRENT_WORLD.objects[coords][obj] -= 1;

    if (RUR.CURRENT_WORLD.objects[coords][obj] === 0){
        delete RUR.CURRENT_WORLD.objects[coords][obj];
        // WARNING: do not change this silly comparison to false
        // to anything else ... []==false is true  but []==[] is false
        // and ![] is false
        if (RUR.world_get.object_at_robot_position(robot) == false){ // jshint ignore:line
            delete RUR.CURRENT_WORLD.objects[coords];
        }
    }
    RUR._ensure_key_exists(robot, "objects");
    if (robot.objects[obj] === undefined){
        robot.objects[obj] = 1;
    } else {
        robot.objects[obj]++;
    }
    RUR.record_frame("debug", "RUR.control._take_object");
};


RUR.control.build_wall = function (robot){
    var coords, orientation, x, y, walls;
    if (RUR.control.wall_in_front(robot)){
        throw new RUR.WallCollisionError(RUR.translate("There is already a wall here!"));
    }

    switch (robot._orientation){
    case RUR.EAST:
        coords = robot.x + "," + robot.y;
        orientation = "east";
        x = robot.x;
        y = robot.y;
        break;
    case RUR.NORTH:
        coords = robot.x + "," + robot.y;
        orientation = "north";
        x = robot.x;
        y = robot.y;
        break;
    case RUR.WEST:
        orientation = "east";
        x = robot.x-1;
        y = robot.y;
        break;
    case RUR.SOUTH:
        orientation = "north";
        x = robot.x;
        y = robot.y-1;
        break;
    default:
        throw new RUR.ReeborgError("Should not happen: unhandled case in RUR.control.build_wall().");
    }

    coords = x + "," + y;
    walls = RUR.CURRENT_WORLD.walls;
    if (walls === undefined){
        walls = {};
        RUR.CURRENT_WORLD.walls = walls;
    }

    if (walls[coords] === undefined){
        walls[coords] = [orientation];
    } else {
        walls[coords].push(orientation);
    }
    RUR.state.sound_id = "#build-sound";
    RUR.record_frame("debug", "RUR.control.build_wall");
};


RUR.control.wall_in_front = function (robot) {
    var coords;
    switch (robot._orientation){
    case RUR.EAST:
        coords = robot.x + "," + robot.y;
        if (robot.x == RUR.COLS){
            return true;
        }
        if (RUR.world_get.is_wall_at(coords, "east")) {
            return true;
        }
        break;
    case RUR.NORTH:
        coords = robot.x + "," + robot.y;
        if (robot.y == RUR.ROWS){
            return true;
        }
        if (RUR.world_get.is_wall_at(coords, "north")) {
            return true;
        }
        break;
    case RUR.WEST:
        if (robot.x===1){
            return true;
        } else {
            coords = (robot.x-1) + "," + robot.y; // do math first before building strings
            if (RUR.world_get.is_wall_at(coords, "east")) {
                return true;
            }
        }
        break;
    case RUR.SOUTH:
        if (robot.y===1){
            return true;
        } else {
            coords = robot.x + "," + (robot.y-1);  // do math first before building strings
            if (RUR.world_get.is_wall_at(coords, "north")) {
                return true;
            }
        }
        break;
    default:
        throw new RUR.ReeborgError("Should not happen: unhandled case in RUR.control.wall_in_front().");
    }
    return false;
};

RUR.control.wall_on_right = function (robot) {
    var result;
    RUR._recording_(false);
    RUR.control.__turn_right(robot);
    result = RUR.control.wall_in_front(robot);
    RUR.control.turn_left(robot);
    RUR._recording_(true);
    return result;
};

RUR.control.tile_in_front = function (robot) {
    // returns single tile
    switch (robot._orientation){
    case RUR.EAST:
        return RUR.world_get.tile_at_position(robot.x+1, robot.y);
    case RUR.NORTH:
        return RUR.world_get.tile_at_position(robot.x, robot.y+1);
    case RUR.WEST:
        return RUR.world_get.tile_at_position(robot.x-1, robot.y);
    case RUR.SOUTH:
        return RUR.world_get.tile_at_position(robot.x, robot.y-1);
    default:
        throw new RUR.ReeborgError("Should not happen: unhandled case in RUR.control.tile_in_front().");
    }
};


RUR.control.solid_objects_in_front = function (robot) {
    // returns list of tiles
    switch (robot._orientation){
    case RUR.EAST:
        return RUR.world_get.solid_objects_at_position(robot.x+1, robot.y);
    case RUR.NORTH:
        return RUR.world_get.solid_objects_at_position(robot.x, robot.y+1);
    case RUR.WEST:
        return RUR.world_get.solid_objects_at_position(robot.x-1, robot.y);
    case RUR.SOUTH:
        return RUR.world_get.solid_objects_at_position(robot.x, robot.y-1);
    default:
        throw new RUR.ReeborgError("Should not happen: unhandled case in RUR.control.solid_objects_in_front().");
    }
};


RUR.control.front_is_clear = function(robot){
    var tile, tiles, solid, name;
    if( RUR.control.wall_in_front(robot)) {
        return false;
    }
    tile = RUR.control.tile_in_front(robot);
    if (tile) {
        if (tile.detectable && tile.fatal){
                if (tile == RUR.TILES.water) {
                    if (!RUR.control._bridge_present(robot)){
                        return false;
                    }
                } else {
                    return false;
                }
        }
    }

    solid = RUR.control.solid_objects_in_front(robot);
    if (solid) {
        for (name in solid) {
            if (RUR.SOLID_OBJECTS[name] !== undefined &&
                RUR.SOLID_OBJECTS[name].detectable &&
                RUR.SOLID_OBJECTS[name].fatal) {
                return false;
            }
        }
    }

    return true;
};


RUR.control._bridge_present = function(robot) {
    var solid, name;
        solid = RUR.control.solid_objects_in_front(robot);
    if (solid) {
        for (name in solid) {
            if (name == "bridge") {
                return true;
            }
        }
    }
    return false;
};


RUR.control.right_is_clear = function(robot){
    var result;
    RUR._recording_(false);
    RUR.control.__turn_right(robot);
    result = RUR.control.front_is_clear(robot);
    RUR.control.turn_left(robot);
    RUR._recording_(true);
    return result;
};

RUR.control.is_facing_north = function (robot) {
    return robot._orientation === RUR.NORTH;
};

RUR.control.think = function (delay) {
    RUR.playback_delay = delay;
};

RUR.control.at_goal = function (robot) {
    var goal = RUR.CURRENT_WORLD.goal;
    if (goal !== undefined){
        if (goal.position !== undefined) {
            return (robot.x === goal.position.x && robot.y === goal.position.y);
        }
        throw new RUR.ReeborgError(RUR.translate("There is no position as a goal in this world!"));
    }
    throw new RUR.ReeborgError(RUR.translate("There is no goal in this world!"));
};


// TODO: review this as it seems redundant ... and may not work as expected.
RUR.control.solid_object_here = function (robot, tile) {
    var tile_here, tile_type, all_solid_objects;
    var coords = robot.x + "," + robot.y;

    if (RUR.CURRENT_WORLD.solid_objects === undefined ||
        RUR.CURRENT_WORLD.solid_objects[coords] === undefined) {
        return false;
    }

    tile_here =  RUR.CURRENT_WORLD.solid_objects[coords];

    for (tile_type in tile_here) {
        if (tile_here.hasOwnProperty(tile_type)) {
            if (tile!== undefined && tile_type == RUR.translate_to_english(tile)) {
                return true;
            }
        }
    }
    return false;
};


RUR.control.carries_object = function (robot, obj) {
    var obj_type, all_objects, carried=false;

    if (robot === undefined || robot.objects === undefined) {
        return 0;
    }

    all_objects = {};

    if (obj === undefined) {
        for (obj_type in robot.objects) {
            if (robot.objects.hasOwnProperty(obj_type)) {
                all_objects[RUR.translate(obj_type)] = robot.objects[obj_type];
                carried = true;
            }
        }
        if (carried) {
            return all_objects;
        } else {
            return 0;
        }
    } else {
        obj = RUR.translate_to_english(obj);
        for (obj_type in robot.objects) {
            if (robot.objects.hasOwnProperty(obj_type) && obj_type == obj) {
                return robot.objects[obj_type];
            }
        }
        return 0;
    }
};


RUR.control.set_model = function(robot, model){
    robot.model = model;
    RUR.record_frame();
 };

RUR.control.set_trace_color = function(robot, color){
    robot.trace_color = color;
 };

RUR.control.set_trace_style = function(robot, style){
    robot.trace_style = style;
 };

RUR.state.sound_on = false;
RUR.control.sound = function(on){
    if(!on){
        RUR.state.sound_on = false;
        return;
    }
    RUR.state.sound_on = true;
};

RUR.control.get_colour_at_position = function (x, y) {
    if (RUR.world_get.tile_at_position(x, y)===false) {
        return null;
    } else if (RUR.world_get.tile_at_position(x, y)===undefined){
        return RUR.CURRENT_WORLD.tiles[x + "," + y];
    } else {
        return null;
    }
};

RUR.control.set_tile_at_position = function (x, y, tile) {
    "use strict";
    // note: "tile" will most often be a colour.
    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "tiles");
    RUR.CURRENT_WORLD.tiles[x + "," + y] = tile;
    RUR.record_frame("debug", "set_tile_at_position");
};

},{"./constants.js":1,"./exceptions.js":10,"./objects.js":31,"./output.js":32,"./recorder/record_frame.js":39,"./state.js":45,"./translator.js":48,"./world_get.js":65,"./world_set.js":68}],3:[function(require,module,exports){

require("./translator.js");
require("./world_select.js");
require("./storage.js");

RUR.custom_world_select = {};

RUR.custom_world_select.make = function (contents) {
    "use strict";
    var i, url;
    RUR.world_select.empty_menu();
    for(i=0; i<contents.length; i++){
        RUR.world_select.append_world( {url:contents[i][0],
                                        shortname:contents[i][1]});
    }
    load_user_worlds();
    if (RUR.state.session_initialized) {
        RUR.world_select.set_default();
    }
};

function load_user_worlds() {
    var key, name, i;
    RUR.state.creating_menu = true;
    for (i = localStorage.length - 1; i >= 0; i--) {
        key = localStorage.key(i);
        if (key.slice(0, 11) === "user_world:") {
            name = key.slice(11);
            RUR.storage.append_world_name(name);
            $('#delete-world').show();
        }
    }
    RUR.state.creating_menu = false;
}


RUR.make_default_menu = function(language) {
    switch (language) {
        case 'en': RUR.make_default_menu_en();
                   break;
        case 'fr': RUR.make_default_menu_fr();
                   break;
        default: RUR.make_default_menu_en();
    }
};


RUR.make_default_menu_en = function () {
    "use strict";
    var contents,
        tutorial_en = '/src/worlds/tutorial_en/',
        menus = '/src/worlds/menus/',
        worlds = '/src/worlds/',
        docs = '/src/worlds/documentation/',
        permalinks = '/src/worlds/permalinks/';

    contents = [
        [worlds + 'alone.json', 'Alone'],
        [worlds + 'empty.json', 'Empty'],
        [tutorial_en + 'around1.json', 'Around 1'],
        [tutorial_en + 'around2.json', 'Around 2'],
        [tutorial_en + 'around3.json', 'Around 3'],
        [tutorial_en + 'around4.json', 'Around 4'],
        [tutorial_en + 'center1.json', 'Center 1'],
        [tutorial_en + 'center2.json', 'Center 2'],
        [tutorial_en + 'center3.json', 'Center 3'],
        [tutorial_en + 'harvest1.json', 'Harvest 1'],
        [tutorial_en + 'harvest2.json', 'Harvest 2'],
        [tutorial_en + 'harvest3.json', 'Harvest 3'],
        [tutorial_en + 'harvest4a.json', 'Harvest 4a'],
        [tutorial_en + 'harvest4b.json', 'Harvest 4b'],
        [tutorial_en + 'harvest4c.json', 'Harvest 4c'],
        [tutorial_en + 'harvest4d.json', 'Harvest 4d'],
        [tutorial_en + 'home1.json', 'Home 1'],
        [tutorial_en + 'home2.json', 'Home 2'],
        [tutorial_en + 'home3.json', 'Home 3'],
        [tutorial_en + 'hurdle1.json', 'Hurdle 1'],
        [tutorial_en + 'hurdle2.json', 'Hurdle 2'],
        [tutorial_en + 'hurdle3.json', 'Hurdle 3'],
        [tutorial_en + 'hurdle4.json', 'Hurdle 4'],
        [tutorial_en + 'maze1.json', 'Maze 1'],
        [tutorial_en + 'maze2.json', 'Maze 2'],
        [tutorial_en + 'newspaper0.json', 'Newspaper 0'],
        [tutorial_en + 'newspaper1.json', 'Newspaper 1'],
        [tutorial_en + 'newspaper2.json', 'Newspaper 2'],
        [tutorial_en + 'rain1.json', 'Rain 1'],
        [tutorial_en + 'rain2.json', 'Rain 2'],
        [tutorial_en + 'storm1.json', 'Storm 1'],
        [tutorial_en + 'storm2.json', 'Storm 2'],
        [tutorial_en + 'storm3.json', 'Storm 3'],
        [tutorial_en + 'tokens1.json', 'Tokens 1'],
        [tutorial_en + 'tokens2.json', 'Tokens 2'],
        [tutorial_en + 'tokens3.json', 'Tokens 3'],
        [tutorial_en + 'tokens4.json', 'Tokens 4'],
        [tutorial_en + 'tokens5.json', 'Tokens 5'],
        [tutorial_en + 'tokens6.json', 'Tokens 6'],
        [docs + 'simple_demo1', 'Demo 1 (solution)'],
        [docs + 'simple_demo2', 'Demo 2 (solution)'],
        [docs + 'simple_demo3', 'Demo 3 (solution)'],
        [worlds + 'simple_path.json', 'Simple path'],
        [worlds + 'gravel_path.json', 'Gravel path'],
        [worlds + 'gravel_path',
                           'Gravel path (solution)'],
        [worlds + 'slalom.json', 'Slalom'],
        [permalinks + 'pre_post_demo', 'Pre & Post code demo'],
        [permalinks + 'story', 'Story'],
        [permalinks + 'test_remove', 'Robot replacement'],
        [docs + 'big_maze.json', 'Big maze'],
        [worlds + 'maze_gen_py', 'Maze generation (Python)'],
        [worlds + 'maze_gen_js', 'Maze generation (Javascript)'],
        [worlds + 'blank.json', 'Blank canvas'],
        ];

    RUR.custom_world_select.make(contents);
};

RUR.make_default_menu_fr = function () {
    "use strict";
    var base_url, base_url2, contents, menus, worlds;

    base_url = '/src/worlds/tutorial_en/';
    base_url2 = '/src/worlds/tutorial_fr/';

    menus = '/src/worlds/menus/';
    worlds = '/src/worlds/';


    contents = [
        ['/src/worlds/alone.json', 'Seul'],
        ['/src/worlds/empty.json', 'Vide'],
        [base_url2 + 'around1.json', 'Autour 1'],
        [base_url2 + 'around2.json', 'Autour 2'],
        [base_url2 + 'around3.json', 'Autour 3'],
        [base_url2 + 'around4.json', 'Autour 4'],
        [base_url + 'home1.json', 'But 1'],
        [base_url + 'home2.json', 'But 2'],
        [base_url + 'home3.json', 'But 3'],
        [base_url + 'center1.json', 'Centrer 1'],
        [base_url + 'center2.json', 'Centrer 2'],
        [base_url + 'center3.json', 'Centrer 3'],
        [base_url + 'hurdle1.json', 'Haies 1'],
        [base_url + 'hurdle2.json', 'Haies 2'],
        [base_url + 'hurdle3.json', 'Haies 3'],
        [base_url + 'hurdle4.json', 'Haies 4'],
        [base_url + 'tokens1.json', 'Jetons 1'],
        [base_url + 'tokens2.json', 'Jetons 2'],
        [base_url + 'tokens3.json', 'Jetons 3'],
        [base_url + 'tokens4.json', 'Jetons 4'],
        [base_url + 'tokens5.json', 'Jetons 5'],
        [base_url + 'tokens6.json', 'Jetons 6'],
        [base_url + 'newspaper0.json', 'Journal 0'],
        [base_url + 'newspaper1.json', 'Journal 1'],
        [base_url + 'newspaper2.json', 'Journal 2'],
        [base_url + 'maze1.json', 'Labyrinthe 1'],
        [base_url + 'maze2.json', 'Labyrinthe 2'],
        [base_url + 'rain1.json', 'Pluie 1'],
        [base_url + 'rain2.json', 'Pluie 2'],
        [base_url + 'harvest1.json', 'Récolte 1'],
        [base_url + 'harvest2.json', 'Récolte 2'],
        [base_url + 'harvest3.json', 'Récolte 3'],
        [base_url + 'harvest4a.json', 'Récolte 4a'],
        [base_url + 'harvest4b.json', 'Récolte 4b'],
        [base_url + 'harvest4c.json', 'Récolte 4c'],
        [base_url + 'harvest4d.json', 'Récolte 4d'],
        [base_url + 'storm1.json', 'Tempête 1'],
        [base_url + 'storm2.json', 'Tempête 2'],
        [base_url + 'storm3.json', 'Tempête 3'],
        // [menus + 'default_fr', 'Menu par défaut'],
        [worlds + 'menus/documentation_fr', 'Documentation (menu anglais)'],
        [worlds + 'simple_path_fr.json', 'Simple sentier'],
        [worlds + 'gravel_path.json', 'Sentier de gravier'],
        [worlds + 'gravel_path_fr',
                           'Sentier de gravier (solution)'],
        [worlds + 'slalom.json', 'Slalom'],
        ['/src/worlds/blank.json', 'Canevas graphique'],
    ];

    RUR.custom_world_select.make(contents);
};

},{"./storage.js":46,"./translator.js":48,"./world_select.js":67}],4:[function(require,module,exports){
/* Dialog used by the Interactive world editor to add objects to the world.
*/

require("./../rur.js");
require("./../world_set/add_object.js");
require("./../visible_world.js");
require("./../state.js");


exports.dialog_add_object = dialog_add_object = $("#dialog-add-object").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        OK: function () {
            add_object();
        },
        Cancel: function() {
            dialog_add_object.dialog("close");
        }
    },
    close: function() {
        add_object_form[0].reset();
    }
});

function add_object () {
    "use strict";
    var query;
    input_add_number_result = parseInt($("#input-add-number").val(), 10);
    input_maximum_result = parseInt($("#maximum-number").val(), 10);
    if (input_maximum_result > input_add_number_result){
        query =  input_add_number_result + "-" + input_maximum_result;
    } else {
        query = input_add_number_result;
    }
    RUR.add_object_at_position(RUR.state.specific_object, RUR.state.x, RUR.state.y, query);
    RUR.vis_world.refresh_world_edited();
    dialog_add_object.dialog("close");
    return true;
}

add_object_form = dialog_add_object.find("form").on("submit", function( event ) {
    event.preventDefault();
    add_object();
});

},{"./../rur.js":43,"./../state.js":45,"./../visible_world.js":58,"./../world_set/add_object.js":70}],5:[function(require,module,exports){

require("./../libs/jquery.ui.dialog.minmax.js");
require("./../rur.js");


RUR.create_and_activate_dialogs = function(button, element, add_options, special_fn) {
    var options = {
    minimize: true,
    maximize: false,
    autoOpen: false,
    width: 800,
    height: 600,
    position: {my: "center", at: "center", of: window},
    beforeClose: function( event, ui ) {
            button.addClass("blue-gradient").removeClass("reverse-blue-gradient");
            if (special_fn !== undefined){
                special_fn();
            }
        }
    };
    for (var attrname in add_options) {
        options[attrname] = add_options[attrname];
    }

    button.on("click", function(evt) {
        element.dialog(options);
        button.toggleClass("blue-gradient");
        button.toggleClass("reverse-blue-gradient");
        if (button.hasClass("reverse-blue-gradient")) {
            element.dialog("open");
        } else {
            element.dialog("close");
        }
        if (special_fn !== undefined && element.dialog("isOpen")){
            special_fn();
        }
    });
};


RUR.create_and_activate_dialogs($("#about-button"), $("#about-div"), {});
RUR.create_and_activate_dialogs($("#more-menus-button"), $("#more-menus"), {height:700});
RUR.create_and_activate_dialogs($("#special-keyboard-button"), $("#special-keyboard"),
        {autoOpen:false, width:600,  height:350, maximize: false, position:"left"});


$("#Reeborg-concludes").dialog({minimize: false, maximize: false, autoOpen:false, width:500, dialogClass: "concludes",
                                position:{my: "center", at: "center", of: $("#robot-canvas")}});
$("#Reeborg-shouts").dialog({minimize: false, maximize: false, autoOpen:false, width:500, dialogClass: "alert",
                                position:{my: "center", at: "center", of: $("#robot-canvas")}});
$("#Reeborg-writes").dialog({minimize: false, maximize: false, autoOpen:false, width:600, height:250,
                                position:{my: "bottom", at: "bottom-20", of: window}});
$("#Reeborg-explores").dialog({minimize: false, maximize: false, autoOpen:false, width:600,
                                position:{my: "center", at: "center", of: $("#robot-canvas")}});
$("#Reeborg-proclaims").dialog({minimize: false, maximize: false, autoOpen:false, width:800, dialogClass: "proclaims",
                                position:{my: "bottom", at: "bottom-80", of: window}});
$("#Reeborg-watches").dialog({minimize: false, maximize: false, autoOpen:false, width:600, height:400, dialogClass: "watches",
                                position:{my: "bottom", at: "bottom-140", of: window}});

},{"./../libs/jquery.ui.dialog.minmax.js":17,"./../rur.js":43}],6:[function(require,module,exports){

require("./../world_set.js");
require("./../visible_world.js");
require("./../world_set/give_object_to_robot.js");
require("./../state.js");
require("./../rur.js");


exports.dialog_give_object = dialog_give_object = $("#dialog-give-object").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        OK: function () {
            give_object();
        },
        Cancel: function() {
            dialog_give_object.dialog("close");
        }
    },
    close: function() {
        give_object_form[0].reset();
    }
});
give_object = function () {
    "use strict";
    var query;
    give_number_result = parseInt($("#input-give-number").val(), 10);
    unlimited_number_result = $("#unlimited-number").prop("checked");
    if (unlimited_number_result){
        query = Infinity;
    } else {
        query = give_number_result;
    }
    RUR.give_object_to_robot(RUR.state.specific_object, query);
    RUR.vis_world.refresh_world_edited();
    dialog_give_object.dialog("close");
    return true;
};
give_object_form = dialog_give_object.find("form").on("submit", function( event ) {
    event.preventDefault();
    give_object();
});

},{"./../rur.js":43,"./../state.js":45,"./../visible_world.js":58,"./../world_set.js":68,"./../world_set/give_object_to_robot.js":72}],7:[function(require,module,exports){
require("./../visible_world.js");
require("./../world_set/give_object_to_robot.js");
require("./../state.js");
;
// require("jquery-ui");

exports.dialog_goal_object = dialog_goal_object = $("#dialog-goal-object").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        OK: function () {
            goal_objects();
        },
        Cancel: function() {
            dialog_goal_object.dialog("close");
        }
    },
    close: function() {
        goal_objects_form[0].reset();
    }
});
goal_objects = function () {
    "use strict";
    var query;
    input_goal_number_result = parseInt($("#input-goal-number").val(), 10);
    all_objects_result = $("#all-objects").prop("checked");
    if (all_objects_result){
        query =  "all";
    } else {
        query = input_goal_number_result;
    }
    RUR.add_goal_object_at_position(RUR.state.specific_object, RUR.state.x, RUR.state.y, query);
    RUR.vis_world.refresh_world_edited();
    dialog_goal_object.dialog("close");
    return true;
};
goal_objects_form = dialog_goal_object.find("form").on("submit", function( event ) {
    event.preventDefault();
    goal_objects();
});

},{"./../state.js":45,"./../visible_world.js":58,"./../world_set/give_object_to_robot.js":72}],8:[function(require,module,exports){
require("./../visible_world.js");
;
// require("jquery-ui");

exports.dialog_select_colour = dialog_select_colour = $("#dialog-select-colour").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        OK: function () {
            select_colour();
        },
        Cancel: function() {
            dialog_select_colour.dialog("close");
        }
    }
});

dialog_select_colour.find("form").on("submit", function( event ) {
    event.preventDefault();
    select_colour();
});

select_colour = function () {
    var colour = $("#colour-selection").val();
    if (!colour) {
        colour = false;
    }
    dialog_select_colour.dialog("close");
    RUR._CALLBACK_FN(colour);
    RUR.vis_world.draw_all();
};

},{"./../visible_world.js":58}],9:[function(require,module,exports){
require("./../visible_world.js");
;
// require("jquery-ui");

exports.dialog_set_background_image = dialog = $("#dialog-set-background-image").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        OK: function () {
            set_background_image();
        },
        Cancel: function() {
            dialog.dialog("close");
        }
    }
});
dialog.find("form").on("submit",
    function( event ) {
        event.preventDefault();
        set_background_image();
});
set_background_image = function () {
    var url = $("#image-url").val();
    if (!url) {
        url = '';
    }
    RUR.CURRENT_WORLD.background_image = url;
    RUR.BACKGROUND_IMAGE.src = url;
    RUR.BACKGROUND_IMAGE.onload = RUR.vis_world.draw_all;
    dialog.dialog("close");
};

},{"./../visible_world.js":58}],10:[function(require,module,exports){

require("./rur.js");

RUR.ReeborgError = function (message) {
    if (RUR.state.programming_language == "python"){
        return ReeborgError(message);
    }
    this.name = "ReeborgError";
    this.message = message;
    this.reeborg_shouts = message;
};

RUR.WallCollisionError = function (message) {
    if (RUR.state.programming_language == "python"){
        return WallCollisionError(message);
    }
    this.name = "WallCollisionError";
    this.message = message;
    this.reeborg_shouts = message;
};

},{"./rur.js":43}],11:[function(require,module,exports){
require("./../rur.js");


require("./../visible_world.js");
require("./../state.js");

/** @function add_new_object_type
 * @memberof RUR
 * @instance
 * @summary This function makes it possible to add new objects. If the name
 *    of an existing object is specified again, the images for that object are
 *    replaced.  Two images must be provided: one for the object itself, and
 *    another when this object is specified as a goal. N.B. existing names
 *    are the English ones.
 *
 * @desc Cette fonction permet l'ajout de nouveaux objets.  Si le nom d'un
 *   objet existant est spécifié, les images pour cet objet seront remplacées
 *   par les nouvelles images fournies.  N.B. les noms d'objets par défaut sont
 *   des noms anglais (par exemple "token" plutôt que "jeton").
 *
 * @param {string} specific_object The name of the object type ; e.g. "mouse" <br>
 *                        _Le nom du type de l'objet; par exemple, "souris"._
 * @param {string} url - URL where the image can be found.
 *                    <br> _URL où l'image peut être trouvée_
 * @param {string} url_goal - URL where the image as a goal can be found.
 *                    <br> _URL où l'image comme but peut être trouvée_
 *
 */
RUR.OBJECTS = {};

RUR.add_new_object_type = function (name, url, url_goal) {
    var obj = RUR.OBJECTS;
    obj[name] = {};
    obj[name].image = new Image();
    obj[name].image_goal = new Image();
    obj[name].image.src = url;
    obj[name].image_goal.src = url_goal;
    if (RUR.state.ready) {
        obj[name].image.onload = RUR.vis_world.refresh;
        obj[name].image_goal.onload = RUR.vis_world.draw_goal;
    } else {
        obj[name].image.onload = RUR.INCREMENT_LOADED_FN;
        obj[name].image_goal.onload = RUR.INCREMENT_LOADED_FN;
    }
    if (RUR.KNOWN_OBJECTS.indexOf(name) === -1) {
        RUR.KNOWN_OBJECTS.push(name);
    }
    RUR._NB_IMAGES_TO_LOAD += 2;
};

// supporting worlds created previously.
RUR.add_object_image = RUR.add_new_object_type;

},{"./../rur.js":43,"./../state.js":45,"./../visible_world.js":58}],12:[function(require,module,exports){
require("./../rur.js");

/** @function add_new_tile_type
 * @memberof RUR
 * @instance
 * @summary This function makes it possible to add new objects. If the name
 *    of an existing object is specified again, the images for that object are
 *    replaced.  Two images must be provided: one for the object itself, and
 *    another when this object is specified as a goal. N.B. existing names
 *    are the English ones.
 *
 * @desc Cette fonction permet l'ajout de nouveaux objets.  Si le nom d'un
 *   objet existant est spécifié, les images pour cet objet seront remplacées
 *   par les nouvelles images fournies.  N.B. les noms d'objets par défaut sont
 *   des noms anglais (par exemple "token" plutôt que "jeton").
 *
 * @param {string} specific_object The name of the object type ; e.g. "mouse" <br>
 *                        _Le nom du type de l'objet; par exemple, "souris"._
 * @param {string} url - URL where the image can be found.
 *                    <br> _URL où l'image peut être trouvée_
 * @param {string} url_goal - URL where the image as a goal can be found.
 *                    <br> _URL où l'image comme but peut être trouvée_
 *
 */
RUR.TILES = {};

RUR.add_new_tile_type = function (tile) {
    var i, tiles = RUR.TILES;
    name = tile.name;
    tiles[name] = {};
    tiles[name].name = tile.name;
    if (tile.public_name) {
        tiles[name].name = tile.public_name;
    }
    if (tile.url) {
        tiles[name].image = new Image();
        tiles[name].image.src = tile.url;
        RUR._NB_IMAGES_TO_LOAD += 1;
        tiles[name].image.onload = RUR.INCREMENT_LOADED_FN;
    } else if (tile.images) {
        for (i=0; i < tile.images.length; i++){
            tiles[name]["image"+i] = new Image();
            tiles[name]["image"+i].src = tile.images[i];
            tiles[name]["image"+i].onload = RUR.INCREMENT_LOADED_FN;
        }
        RUR._NB_IMAGES_TO_LOAD += tile.images.length;
        if (tile.selection_method === "sync") {
            tiles[name].choose_image = function (coords) {
                return _sync(tiles[name], tile.images.length, coords);
            };
        } else if (tile.selection_method === "ordered") {
            tiles[name].choose_image = function (coords) {
                return _ordered(tiles[name], tile.images.length, coords);
            };
        } else {
            tiles[name].choose_image = function (coords) {
                return _random(tiles[name], tile.images.length);
            };
        }

    } else {
        alert("Fatal error: need either tile.url or a list: tile.images");
    }

    tiles[name].info = tile.info;
    if (tile.home) {
        tiles[name].detectable = true;
    } else {
        tiles[name].fatal = tile.fatal;
        tiles[name].detectable = tile.detectable;
        tiles[name].message = tile.message;
        tiles[name].slippery = tile.slippery;
        tiles[name].solid = tile.solid;
    }

    RUR.KNOWN_TILES.push(name);
};

_random = function (tile, nb) {
    // each tile is given a random value at all iteration
    var choice = Math.floor(Math.random() * nb);
    return tile["image" + choice];
};
_ordered = function (tile, nb, coords) {
    // each tile is given a random initial value but then goes in order

    if (RUR._ORDERED_TILES[tile.name] === undefined) {
        RUR._ORDERED_TILES[tile.name] = {};
        RUR._ORDERED_TILES[tile.name][coords] = Math.floor(Math.random() * nb);
    } else if (Object.keys(RUR._ORDERED_TILES[tile.name]).indexOf(coords) === -1) {
        RUR._ORDERED_TILES[tile.name][coords] = Math.floor(Math.random() * nb);
    } else {
        RUR._ORDERED_TILES[tile.name][coords] += 1;
        RUR._ORDERED_TILES[tile.name][coords] %= nb;
    }
    return tile["image" + RUR._ORDERED_TILES[tile.name][coords]];
};
_sync = function (tile, nb, coords) {
    // every tile of this type is kept in sync
    if (RUR._SYNC_TILES[tile.name] === undefined) {
        RUR._SYNC_TILES[tile.name] = [];
        RUR._SYNC_TILES_VALUE[tile.name] = 1;
    } else if (RUR._SYNC_TILES[tile.name].indexOf(coords) !== -1) {
        // see a same tile present: we are starting a new sequence
        RUR._SYNC_TILES[tile.name] = [];
        RUR._SYNC_TILES_VALUE[tile.name] += 1;
        RUR._SYNC_TILES_VALUE[tile.name] %= nb;
    }
    RUR._SYNC_TILES[tile.name].push(coords);
    return tile["image" + RUR._SYNC_TILES_VALUE[tile.name]];
};

},{"./../rur.js":43}],13:[function(require,module,exports){
require("./../rur.js");

/** @function add_new_home_tile
 * @memberof RUR
 * @instance
 * @summary This function makes it possible to add a new image to use as
 *    a home tile. If the name of an existing home tile is specified again,
 *    the image for that object is replaced; we suggest you do not do this.

 *
 * @desc Cette fonction permet l'ajout de nouvelles images à utiliser comme
 *   but à atteindre pour le robot.  Si le nom d'un but existant est spécifié,
 *   l'image pour ce but est remplacée par la nouvelle image; nous vous suggérons
 *   de ne pas faire ceci.
 *
 * @param {string} name The name to be used for this tile<br>
 *                        _Le nom à utiliser pour cet objet._
 * @param {string} url - URL where the image can be found.
 *                    <br> _URL où l'image peut être trouvée_
 * @param {string} info - A sentence to be displayed when the user queries information
 *                       about the world; something like "goal: Reeborg can detect
 *                       this tile using at\_goal()." <br> *Une phrase décrivant ce but lorsqu
 *                       l'usager consulte la description du monde; quelque chosen
 *                       comme "but: Reeborg peut détecter ceci en utilisant au\_but()".*
 *
 */

RUR.HOME_IMAGES = {};

RUR.add_new_home_tile = function (name, url, info) {
    var home = RUR.HOME_IMAGES;
    home[name] = {};
    home[name].detectable = true;
    home[name].info = info;
    home[name].image = new Image();
    home[name].image.src = url;
    home[name].image.onload = RUR.INCREMENT_LOADED_FN;
    RUR._NB_IMAGES_TO_LOAD += 1;
};

},{"./../rur.js":43}],14:[function(require,module,exports){

require("./output.js");
require("./recorder.js");
require("./world.js");
require("./world/import_world.js");
require("./world_select.js");
require("./permalink.js");
require("./translator.js");
require("./exceptions.js");
require("./listeners/stop.js");



RUR.file_io = {};

RUR.file_io.load_world_from_program = function (url, shortname) {
    /*  Loads a world or permalink from a user's program using World()

    Possible choices:
        World(shortname)  where shortname is an existing name in html select
            example:  World ("Home 1")

            Another case is where a world in saved in local storage;
            in this case, the url must be modified by the user as in
            World("user_world:My World")

        World(url)  where url is a world or permalink located elsewhere
            example: World("http://personnel.usainteanne.ca/aroberge/reeborg/token.json")
            In this case, the url will be used as a shortname to appear in the menu

        World(url, shortname) where url is a world or permalink located elsewhere
            and shortname is the name to appear in the html select.

        If "url" already exists and is the selected world BUT shortname is
        different than the existing name, a call
        World(url, shortname)
        will result in the shortname being updated.
    */
    "use strict";
    var selected, possible_url, new_world=false, new_selection=false;
    RUR.file_io.status = undefined;

    if (url === undefined) {
        RUR.output.write(RUR.translate("World() needs an argument."));
        return;
    }

    if (shortname === undefined) {
        shortname = url;
        possible_url = RUR.world_select.url_from_shortname(shortname);
        if (possible_url !== undefined){
            url = possible_url;
        }
    }

    selected = RUR.world_select.get_selected();

    if (selected.shortname.toLowerCase() === shortname.toLowerCase()) {
        return "no world change";
    } else if (selected.url === url && shortname != selected.shortname) {
        RUR.world_select.replace_shortname(url, shortname);
        return;
    } else if (RUR.world_select.url_from_shortname(shortname)!==undefined){
        url = RUR.world_select.url_from_shortname(shortname);
        new_selection = shortname;
    }  else {
        new_world = shortname;
    }

    RUR.file_io.load_world_file(url, shortname);

    if (RUR.file_io.status !== undefined) {
        RUR.frames = [];
        RUR.stop();
        RUR.state.prevent_playback = true;
    }
    if (RUR.file_io.status === "no link") {
        RUR.show_feedback("#Reeborg-shouts",
                RUR.translate("Could not find link: ") + url);
        throw new RUR.ReeborgError("no link");
    } else if (RUR.file_io.status === "success") {
        if (new_world) {
            RUR.world_select.append_world({url:url, shortname:new_world});
        }
        RUR.world_select.set_url(url);
        RUR.show_feedback("#Reeborg-shouts",
            RUR.translate("World selected").supplant({world: shortname}));
        throw new RUR.ReeborgError("success");
    }
};

RUR.file_io.last_url_loaded = undefined;
RUR.file_io.last_shortname_loaded = undefined;

RUR.file_io.load_world_file = function (url, shortname) {
    /** Loads a bare world file (json) or more complex permalink */
    "use strict";
    var data;

    if (RUR.file_io.last_url_loaded == url &&
        RUR.file_io.last_shortname_loaded == shortname) {
            return;
    } else {
        RUR.file_io.last_url_loaded = url;
        RUR.file_io.last_shortname_loaded = shortname;
    }

    if (url.substring(0,11) === "user_world:"){
        data = localStorage.getItem(url);
        if (data === null) {
            RUR.file_io.status = "no link";
            return;
        }
        RUR.world.import_world(data);
        RUR.file_io.status = "success";
        RUR.frames = [];
    } else {
        $.ajax({url: url,
            async: false,
            error: function(e){
                RUR.file_io.status = "no link";
            },
            success: function(data){
                if (typeof data == "string" && data.substring(0,4) == "http"){
                    RUR.permalink.update(data, shortname);
                    RUR.reload();
                } else {
                    RUR.world.import_world(data);
                }
                RUR.file_io.status = "success";
            }
        });
    }
};

},{"./exceptions.js":10,"./listeners/stop.js":28,"./output.js":32,"./permalink.js":33,"./recorder.js":38,"./translator.js":48,"./world.js":59,"./world/import_world.js":63,"./world_select.js":67}],15:[function(require,module,exports){

require("./../lang/msg.js");
require("./../lang/en.js");
require("./../lang/fr.js");
require("./../lang/ko.js");
require("./utils/key_exist.js");

/* require two modules that will automatically modify two global objects */
require("./utils/cors.js");
require("./utils/supplant.js");

require("./listeners/add_listeners.js");

require("./playback/reverse_step.js"); /* only invoked from the html file - for now */

require("./z_commands.js");
require("./zzz_doc_ready.js");
require("./start_session.js");

// we reset the programming mode only at the end; this helps prevent
// the CodeMirror editors from being improperly sized if the initial
// mode is such that they would be hidden.
//$("#programming-mode").change();

},{"./../lang/en.js":79,"./../lang/fr.js":80,"./../lang/ko.js":81,"./../lang/msg.js":82,"./listeners/add_listeners.js":18,"./playback/reverse_step.js":36,"./start_session.js":44,"./utils/cors.js":51,"./utils/key_exist.js":54,"./utils/supplant.js":56,"./z_commands.js":74,"./zzz_doc_ready.js":78}],16:[function(require,module,exports){
/*  Handler of special on-screen keyboard
*/

require("./state.js");

RUR.kbd = {};

RUR.kbd.set_programming_language = function (lang) {
    $("#kbd-python-btn").hide();
    $("#kbd-py-console-btn").hide();
    $("#kbd-javascript-btn").hide();
    switch (lang) {
        case "python":
            if (RUR.state.input_method==="py-repl"){
                $("#kbd-py-console-btn").show();
            } else {
                $("#kbd-python-btn").show();
            }
            break;
        case "javascript":
            $("#kbd-javascript-btn").show();
            break;
    }
    RUR.kbd.select();
};

RUR.kbd.insert2 = function (txt){
    if (RUR.state.programming_language == "javascript") {
        RUR.kbd.insert(txt + ";");
    } else {
        RUR.kbd.insert(txt);
    }
};

RUR.kbd.insert_in_console = function (txt) {
    var console = $("#py-console");
    console.val(console.val() + txt);
    console.focus();
};

RUR.kbd.insert = function (txt){
    "use strict";
    var doc, cursor, line, pos;
    if (RUR.state.input_method==="py-repl") {
        RUR.kbd.insert_in_console(txt);
        return;
    }
    if (txt === undefined) {
        txt = "'";
    }

    if ($("#tabs").tabs('option', 'active') === 0) {
        doc = editor;
    } else {
        doc = library;
    }
    cursor = doc.getCursor();
    line = doc.getLine(cursor.line);
    pos = { // create a new object to avoid mutation of the original selection
       line: cursor.line,
       ch: cursor.ch // set the character position to the end of the line
   };
    doc.replaceRange(txt, pos); // adds a new line
    doc.focus();
};

RUR.kbd.undo = function () {
    "use strict";
    var doc;
    if ($("#tabs").tabs('option', 'active') === 0) {
        doc = editor;
    } else {
        doc = library;
    }
    doc.undo();
    doc.focus();
};

RUR.kbd.redo = function () {
    "use strict";
    var doc;
    if ($("#tabs").tabs('option', 'active') === 0) {
        doc = editor;
    } else {
        doc = library;
    }
    doc.redo();
    doc.focus();
};

RUR.kbd.enter = function () {
    "use strict";
    var doc, ev;
    if (RUR.state.input_method==="py-repl") {
        ev = {};
        ev.keyCode = 13;
        ev.preventDefault = function () {};
        myKeyPress(ev);
        return;
    }
    if ($("#tabs").tabs('option', 'active') === 0) {
        doc = editor;
    } else {
        doc = library;
    }
    doc.execCommand("newlineAndIndent");
    doc.focus();
};

RUR.kbd.tab = function () {
    "use strict";
    var doc;
    if (RUR.state.input_method==="py-repl") {
        RUR.kbd.insert_in_console('    ');
        return;
    }

    if ($("#tabs").tabs('option', 'active') === 0) {
        doc = editor;
    } else {
        doc = library;
    }
    doc.execCommand("indentMore");
    doc.focus();
};

RUR.kbd.shift_tab = function () {
    "use strict";
    var doc;
    if ($("#tabs").tabs('option', 'active') === 0) {
        doc = editor;
    } else {
        doc = library;
    }
    doc.execCommand("indentLess");
    doc.focus();
};

RUR.kbd.select = function (choice) {
    "use strict";
    $(".kbd-command").hide();
    $(".kbd-condition").hide();
    $(".kbd-objects").hide();
    $(".kbd-python").hide();
    $(".kbd-py-console").hide();
    $(".kbd-javascript").hide();
    $(".kbd-special").hide();
    $(".no-console").hide();
    if ($("#kbd-command-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-command-btn").removeClass("reverse-blue-gradient");
        $("#kbd-command-btn").addClass("blue-gradient");
    } else if ($("#kbd-condition-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-condition-btn").removeClass("reverse-blue-gradient");
        $("#kbd-condition-btn").addClass("blue-gradient");
    } else if ($("#kbd-python-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-python-btn").removeClass("reverse-blue-gradient");
        $("#kbd-python-btn").addClass("blue-gradient");
    } else if ($("#kbd-py-console-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-py-console-btn").removeClass("reverse-blue-gradient");
        $("#kbd-py-console-btn").addClass("blue-gradient");
    } else if ($("#kbd-javascript-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-javascript-btn").removeClass("reverse-blue-gradient");
        $("#kbd-javascript-btn").addClass("blue-gradient");
    } else if ($("#kbd-objects-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-objects-btn").removeClass("reverse-blue-gradient");
        $("#kbd-objects-btn").addClass("blue-gradient");
    } else if ($("#kbd-special-btn").hasClass("reverse-blue-gradient")) {
        $("#kbd-special-btn").removeClass("reverse-blue-gradient");
        $("#kbd-special-btn").addClass("blue-gradient");
    }
    switch (choice) {
        case "kbd-condition":
            $(".kbd-condition").show();
            $("#kbd-condition-btn").removeClass("blue-gradient");
            $("#kbd-condition-btn").addClass("reverse-blue-gradient");
            break;
        case "kbd-objects":
            $(".kbd-objects").show();
            $("#kbd-objects-btn").removeClass("blue-gradient");
            $("#kbd-objects-btn").addClass("reverse-blue-gradient");
            break;
        case "kbd-python":
            $(".kbd-python").show();
            $("#kbd-python-btn").removeClass("blue-gradient");
            $("#kbd-python-btn").addClass("reverse-blue-gradient");
            break;
        case "kbd-py-console":
            $(".kbd-py-console").show();
            $("#kbd-py-console-btn").removeClass("blue-gradient");
            $("#kbd-py-console-btn").addClass("reverse-blue-gradient");
            break;
        case "kbd-javascript":
            $(".kbd-javascript").show();
            $("#kbd-javascript-btn").removeClass("blue-gradient");
            $("#kbd-javascript-btn").addClass("reverse-blue-gradient");
            break;
        case "kbd-special":
            $(".kbd-special").show();
            $("#kbd-special-btn").removeClass("blue-gradient");
            $("#kbd-special-btn").addClass("reverse-blue-gradient");
            break;
        case "kbd-command":  // jshint ignore:line
        default:
            $(".kbd-command").show();
            $("#kbd-command-btn").removeClass("blue-gradient");
            $("#kbd-command-btn").addClass("reverse-blue-gradient");
    }

    if (RUR.state.programming_language == "python") {
        $(".only_py").show();
        if (RUR.state.input_method==="py-repl") {
            $(".no-console").hide();
        }
        $(".only_js").hide();
    } else {
        $(".only_js").show();
        $(".only_py").hide();
    }
};

},{"./state.js":45}],17:[function(require,module,exports){
/*
 * jQuery UI Dialog 1.8.16
 * w/ Minimize & Maximize Support
 * by Elijah Horton (fieryprophet@yahoo.com)
 *
 * Copyright 2011, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/Dialog
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 *  jquery.ui.button.js
 *	jquery.ui.draggable.js
 *	jquery.ui.mouse.js
 *	jquery.ui.position.js
 *	jquery.ui.resizable.js
 *
 * Modified by André Roberge to remove some IE support which is irrelevant for me.
 */
(function( $, undefined ) {

var uiDialogClasses =
		'ui-dialog ' +
		'ui-widget ' +
		'ui-widget-content ' +
		'ui-corner-all ',
	sizeRelatedOptions = {
		buttons: true,
		height: true,
		maxHeight: true,
		maxWidth: true,
		minHeight: true,
		minWidth: true,
		width: true
	},
	resizableRelatedOptions = {
		maxHeight: true,
		maxWidth: true,
		minHeight: true,
		minWidth: true
	},
	// support for jQuery 1.3.2 - handle common attrFn methods for dialog
	attrFn = $.attrFn || {
		val: true,
		css: true,
		html: true,
		text: true,
		data: true,
		width: true,
		height: true,
		offset: true,
		click: true
	};

$.widget("ui.dialog", {
	options: {
		autoOpen: true,
		buttons: {},
		closeOnEscape: true,
		closeText: 'close',
		dialogClass: '',
		draggable: true,
		hide: null,
		height: 'auto',
		maxHeight: false,
		maxWidth: false,
		minHeight: 150,
		minWidth: 300,
		minimizeText: 'minimize',
		maximizeText: 'maximize',
		minimize: true,
		maximize: true,
		modal: false,
		position: {
			my: 'center',
			at: 'center',
			collision: 'fit',
			// ensure that the titlebar is never outside the document
			using: function(pos) {
				var topOffset = $(this).css(pos).offset().top;
				if (topOffset < 0) {
					$(this).css('top', pos.top - topOffset);
				}
			}
		},
		resizable: true,
		show: null,
		stack: true,
		title: '',
		width: 300,
		zIndex: 1000
	},

	_create: function() {
		this.originalTitle = this.element.attr('title');
		// #5742 - .attr() might return a DOMElement
		if ( typeof this.originalTitle !== "string" ) {
			this.originalTitle = "";
		}

		this.options.title = this.options.title || this.originalTitle;
		var self = this,
			options = self.options,

			title = options.title || '&#160;',
			titleId = $.ui.dialog.getTitleId(self.element),

			uiDialog = (self.uiDialog = $('<div></div>'))
				.appendTo(document.body)
				.hide()
				.addClass(uiDialogClasses + options.dialogClass)
				.css({
					zIndex: options.zIndex
				})
				// setting tabIndex makes the div focusable
				// setting outline to 0 prevents a border on focus in Mozilla
				.attr('tabIndex', -1).css('outline', 0).keydown(function(event) {
					if (options.closeOnEscape && !event.isDefaultPrevented() && event.keyCode &&
						event.keyCode === $.ui.keyCode.ESCAPE) {

						self.close(event);
						event.preventDefault();
					}
				})
				.attr({
					role: 'dialog',
					'aria-labelledby': titleId
				})
				.mousedown(function(event) {
					self.moveToTop(false, event);
				}),

			uiDialogContent = self.element
				.show()
				.removeAttr('title')
				.addClass(
					'ui-dialog-content ' +
					'ui-widget-content')
				.appendTo(uiDialog),

			uiDialogTitlebar = (self.uiDialogTitlebar = $('<div></div>'))
				.addClass(
					'ui-dialog-titlebar ' +
					'ui-widget-header ' +
					'ui-corner-all ' +
					'ui-helper-clearfix'
				)
				.prependTo(uiDialog);
			if(options.minimize && !options.modal){ //cannot use this option with modal
				var uiDialogTitlebarMinimize = $('<a href="#"></a>')
					.addClass(
						'ui-dialog-titlebar-minimize ' +
						'ui-corner-all'
					)
					.attr('role', 'button')
					.hover(
						function() {
							uiDialogTitlebarMinimize.addClass('ui-state-hover');
						},
						function() {
							uiDialogTitlebarMinimize.removeClass('ui-state-hover');
						}
					)
					.focus(function() {
						uiDialogTitlebarMinimize.addClass('ui-state-focus');
					})
					.blur(function() {
						uiDialogTitlebarMinimize.removeClass('ui-state-focus');
					})
					.click(function(event) {
						self.minimize(event);
						return false;
					})
					.appendTo(uiDialogTitlebar),

				uiDialogTitlebarMinimizeText = (self.uiDialogTitlebarMinimizeText = $('<span></span>'))
					.addClass(
						'ui-icon ' +
						'ui-icon-minusthick'
					)
					.text(options.minimizeText)
					.appendTo(uiDialogTitlebarMinimize);
			}
			if(options.maximize && !options.modal){ //cannot use this option with modal
				var uiDialogTitlebarMaximize = $('<a href="#"></a>')
					.addClass(
						'ui-dialog-titlebar-maximize ' +
						'ui-corner-all'
					)
					.attr('role', 'button')
					.hover(
						function() {
							uiDialogTitlebarMaximize.addClass('ui-state-hover');
						},
						function() {
							uiDialogTitlebarMaximize.removeClass('ui-state-hover');
						}
					)
					.focus(function() {
						uiDialogTitlebarMaximize.addClass('ui-state-focus');
					})
					.blur(function() {
						uiDialogTitlebarMaximize.removeClass('ui-state-focus');
					})
					.click(function(event) {
						self.maximize(event);
						return false;
					})
					.appendTo(uiDialogTitlebar),

				uiDialogTitlebarMaximizeText = (self.uiDialogTitlebarMaximizeText = $('<span></span>'))
					.addClass(
						'ui-icon ' +
						'ui-icon-plusthick'
					)
					.text(options.maximizeText)
					.appendTo(uiDialogTitlebarMaximize);
					$(uiDialogTitlebar).dblclick(function(event) {
						self.maximize(event);
						return false;
					});
			}
			if(options.close !== false){
				var uiDialogTitlebarClose = $('<a href="#"></a>')
					.addClass(
						'ui-dialog-titlebar-close ' +
						'ui-corner-all'
					)
					.attr('role', 'button')
					.hover(
						function() {
							uiDialogTitlebarClose.addClass('ui-state-hover');
						},
						function() {
							uiDialogTitlebarClose.removeClass('ui-state-hover');
						}
					)
					.focus(function() {
						uiDialogTitlebarClose.addClass('ui-state-focus');
					})
					.blur(function() {
						uiDialogTitlebarClose.removeClass('ui-state-focus');
					})
					.click(function(event) {
						self.close(event);
						return false;
					})
					.appendTo(uiDialogTitlebar),

				uiDialogTitlebarCloseText = (self.uiDialogTitlebarCloseText = $('<span></span>'))
					.addClass(
						'ui-icon ' +
						'ui-icon-closethick'
					)
					.text(options.closeText)
					.appendTo(uiDialogTitlebarClose);
			}

			uiDialogTitle = $('<span></span>')
				.addClass('ui-dialog-title')
				.attr('id', titleId)
				.html(title)
				.prependTo(uiDialogTitlebar);

		//handling of deprecated beforeclose (vs beforeClose) option
		//Ticket #4669 http://dev.jqueryui.com/ticket/4669
		//TODO: remove in 1.9pre
		if ($.isFunction(options.beforeclose) && !$.isFunction(options.beforeClose)) {
			options.beforeClose = options.beforeclose;
		}

		uiDialogTitlebar.find("*").add(uiDialogTitlebar).disableSelection();

		if (options.draggable && $.fn.draggable) {
			self._makeDraggable();
		}
		if (options.resizable && $.fn.resizable) {
			self._makeResizable();
		}

		self._createButtons(options.buttons);
		self._isOpen = false;
		self._min = false;

		if ($.fn.bgiframe) {
			uiDialog.bgiframe();
		}
	},

	_init: function() {
		if ( this.options.autoOpen ) {
			this.open();
		}
	},

	destroy: function() {
		var self = this;

		if (self.overlay) {
			self.overlay.destroy();
		}
		self.uiDialog.hide();
		self.element
			.unbind('.dialog')
			.removeData('dialog')
			.removeClass('ui-dialog-content ui-widget-content')
			.hide().appendTo('body');
		self.uiDialog.remove();

		if (self.originalTitle) {
			self.element.attr('title', self.originalTitle);
		}

		return self;
	},

	widget: function() {
		return this.uiDialog;
	},

	minimize: function(event) {
		var self = this,
			ui = self.uiDialog;
		if(false === self._trigger('beforeMinimize', event)) {
			return;
		}
		if(!ui.data('is-minimized')){
			if(self.options.minimize && typeof self.options.minimize !== "boolean" && $(self.options.minimize).length > 0){
				self._min = $('<a>' + (ui.find('span.ui-dialog-title').html().replace(/&nbsp;/, '') || 'Untitled Dialog') + '</a>')
					.attr('title', 'Click to restore dialog').addClass('ui-corner-all ui-button').click(function(event){self.unminimize(event);});
				$(self.options.minimize).append(self._min);
				ui.data('is-minimized', true).hide();
			} else {
				if(ui.is( ":data(resizable)" )) {
					ui.data('was-resizable', true).resizable('destroy');
				} else {
					ui.data('was-resizable', false)
				}
				ui.data('minimized-height', ui.height());
				ui.find('.ui-dialog-content').hide();
				ui.find('.ui-dialog-titlebar-maximize').hide();
				ui.find('.ui-dialog-titlebar-minimize').css('right', '1.8em').removeClass('ui-icon-minusthick').addClass('ui-icon-arrowthickstop-1-s')
					.find('span').removeClass('ui-icon-minusthick').addClass('ui-icon-arrowthickstop-1-s').click(function(event){self.unminimize(event); return false;});;
				ui.data('is-minimized', true).height('auto');
			}
		}
		return self;
	},

	unminimize: function(event) {
		var self = this,
			ui = self.uiDialog;
		if(false === self._trigger('beforeUnminimize', event)) {
			return;
		}
		if(ui.data('is-minimized')){
			if(self._min){
				self._min.unbind().remove();
				self._min = false;
				ui.data('is-minimized', false).show();
				self.moveToTop();
			} else {
				ui.height(ui.data('minimized-height')).data('is-minimized', false).removeData('minimized-height').find('.ui-dialog-content').show();
				ui.find('.ui-dialog-titlebar-maximize').show();
				ui.find('.ui-dialog-titlebar-minimize').css('right', '3.3em').removeClass('ui-icon-arrowthickstop-1-s').addClass('ui-icon-minusthick')
					.find('span').removeClass('ui-icon-arrowthickstop-1-s').addClass('ui-icon-minusthick').click(function(event){self.minimize(event); return false;});
				if(ui.data('was-resizable') == true) {
					self._makeResizable(true);
				}
			}
		}
		return self;
	},

	maximize: function(event) {
		var self = this,
			ui = self.uiDialog;

		if(false === self._trigger('beforeMaximize', event)) {
			return;
		}
		if(!ui.data('is-maximized')){
			if(ui.is( ":data(draggable)" )) {
				ui.data('was-draggable', true).draggable('destroy');
			} else {
				ui.data('was-draggable', false)
			}
			if(ui.is( ":data(resizable)" )) {
				ui.data('was-resizable', true).resizable('destroy');
			} else {
				ui.data('was-resizable', false)
			}
			ui.data('maximized-height', ui.height()).data('maximized-width', ui.width()).data('maximized-top', ui.css('top')).data('maximized-left', ui.css('left'))
				.data('is-maximized', true).height($(window).height()-8).width($(window).width()+9).css({"top":0, "left": 0}).find('.ui-dialog-titlebar-minimize').hide();
			ui.find('.ui-dialog-titlebar-maximize').removeClass('ui-icon-plusthick').addClass('ui-icon-arrowthick-1-sw')
				.find('span').removeClass('ui-icon-plusthick').addClass('ui-icon-arrowthick-1-sw').click(function(event){self.unmaximize(event); return false;});
			ui.find('.ui-dialog-titlebar').dblclick(function(event){self.unmaximize(event); return false;});
		}
		return self;
	},

	unmaximize: function(event) {
		var self = this,
			ui = self.uiDialog;

		if(false === self._trigger('beforeUnmaximize', event)) {
			return;
		}
		if(ui.data('is-maximized')){
			ui.height(ui.data('maximized-height')).width(ui.data('maximized-width')).css({"top":ui.data('maximized-top'), "left":ui.data('maximized-left')})
				.data('is-maximized', false).removeData('maximized-height').removeData('maximized-width').removeData('maximized-top').removeData('maximized-left').find('.ui-dialog-titlebar-minimize').show();
			ui.find('.ui-dialog-titlebar-maximize').removeClass('ui-icon-arrowthick-1-sw').addClass('ui-icon-plusthick')
				.find('span').removeClass('ui-icon-arrowthick-1-sw').addClass('ui-icon-plusthick').click(function(){self.maximize(event); return false;});
			ui.find('.ui-dialog-titlebar').dblclick(function(event){self.maximize(event); return false;});
			if(ui.data('was-draggable') == true) {
				self._makeDraggable(true);
			}
			if(ui.data('was-resizable') == true) {
				self._makeResizable(true);
			}
		}
		return self;
	},

	close: function(event) {
		var self = this,
			maxZ, thisZ;

		if (false === self._trigger('beforeClose', event)) {
			return;
		}
		if (self.overlay) {
			self.overlay.destroy();
		}
		self.uiDialog.unbind('keypress.ui-dialog');

		self._isOpen = false;

		if (self.options.hide) {
			self.uiDialog.hide(self.options.hide, function() {
				self._trigger('close', event);
			});
		} else {
			self.uiDialog.hide();
			self._trigger('close', event);
		}

		$.ui.dialog.overlay.resize();

		// adjust the maxZ to allow other modal dialogs to continue to work (see #4309)
		if (self.options.modal) {
			maxZ = 0;
			$('.ui-dialog').each(function() {
				if (this !== self.uiDialog[0]) {
					thisZ = $(this).css('z-index');
					if(!isNaN(thisZ)) {
						maxZ = Math.max(maxZ, thisZ);
					}
				}
			});
			$.ui.dialog.maxZ = maxZ;
		}
		return self;
	},

	isOpen: function() {
		return this._isOpen;
	},

	// the force parameter allows us to move modal dialogs to their correct
	// position on open
	moveToTop: function(force, event) {
		var self = this,
			options = self.options,
			saveScroll;

		if ((options.modal && !force) ||
			(!options.stack && !options.modal)) {
			return self._trigger('focus', event);
		}

		if (options.zIndex > $.ui.dialog.maxZ) {
			$.ui.dialog.maxZ = options.zIndex;
		}
		if (self.overlay) {
			$.ui.dialog.maxZ += 1;
			self.overlay.$el.css('z-index', $.ui.dialog.overlay.maxZ = $.ui.dialog.maxZ);
		}

		//Save and then restore scroll since Opera 9.5+ resets when parent z-Index is changed.
		//  http://ui.jquery.com/bugs/ticket/3193
		saveScroll = { scrollTop: self.element.scrollTop(), scrollLeft: self.element.scrollLeft() };
		$.ui.dialog.maxZ += 1;
		self.uiDialog.css('z-index', $.ui.dialog.maxZ);
		self.element.attr(saveScroll);
		self._trigger('focus', event);

		return self;
	},

	open: function() {
		if (this._isOpen) { return; }

		var self = this,
			options = self.options,
			uiDialog = self.uiDialog;

		self.overlay = options.modal ? new $.ui.dialog.overlay(self) : null;
		self._size();
		self._position(options.position);
		uiDialog.show(options.show);
		self.moveToTop(true);

		// prevent tabbing out of modal dialogs
		if (options.modal) {
			uiDialog.bind('keypress.ui-dialog', function(event) {
				if (event.keyCode !== $.ui.keyCode.TAB) {
					return;
				}

				var tabbables = $(':tabbable', this),
					first = tabbables.filter(':first'),
					last  = tabbables.filter(':last');

				if (event.target === last[0] && !event.shiftKey) {
					first.focus(1);
					return false;
				} else if (event.target === first[0] && event.shiftKey) {
					last.focus(1);
					return false;
				}
			});
		}

		// set focus to the first tabbable element in the content area or the first button
		// if there are no tabbable elements, set focus on the dialog itself
		$(self.element.find(':tabbable').get().concat(
			uiDialog.find('.ui-dialog-buttonpane :tabbable').get().concat(
				uiDialog.get()))).eq(0).focus();

		self._isOpen = true;
		self._trigger('open');

		return self;
	},

	_createButtons: function(buttons) {
		var self = this,
			hasButtons = false,
			uiDialogButtonPane = $('<div></div>')
				.addClass(
					'ui-dialog-buttonpane ' +
					'ui-widget-content ' +
					'ui-helper-clearfix'
				),
			uiButtonSet = $( "<div></div>" )
				.addClass( "ui-dialog-buttonset" )
				.appendTo( uiDialogButtonPane );

		// if we already have a button pane, remove it
		self.uiDialog.find('.ui-dialog-buttonpane').remove();

		if (typeof buttons === 'object' && buttons !== null) {
			$.each(buttons, function() {
				return !(hasButtons = true);
			});
		}
		if (hasButtons) {
			$.each(buttons, function(name, props) {
				props = $.isFunction( props ) ?
					{ click: props, text: name } :
					props;
				var button = $('<button type="button"></button>')
					.click(function() {
						props.click.apply(self.element[0], arguments);
					})
					.appendTo(uiButtonSet);
				// can't use .attr( props, true ) with jQuery 1.3.2.
				$.each( props, function( key, value ) {
					if ( key === "click" ) {
						return;
					}
					if ( key in attrFn ) {
						button[ key ]( value );
					} else {
						button.attr( key, value );
					}
				});
				if ($.fn.button) {
					button.button();
				}
			});
			uiDialogButtonPane.appendTo(self.uiDialog);
		}
	},

	_makeDraggable: function() {
		var self = this,
			options = self.options,
			doc = $(document),
			heightBeforeDrag;

		function filteredUi(ui) {
			return {
				position: ui.position,
				offset: ui.offset
			};
		}

		self.uiDialog.draggable({
			cancel: '.ui-dialog-content, .ui-dialog-titlebar-close',
			handle: '.ui-dialog-titlebar',
			containment: 'document',
			start: function(event, ui) {
				heightBeforeDrag = options.height === "auto" ? "auto" : $(this).height();
				$(this).height($(this).height()).addClass("ui-dialog-dragging");
				self._trigger('dragStart', event, filteredUi(ui));
			},
			drag: function(event, ui) {
				self._trigger('drag', event, filteredUi(ui));
			},
			stop: function(event, ui) {
				options.position = [ui.position.left - doc.scrollLeft(),
					ui.position.top - doc.scrollTop()];
				$(this).removeClass("ui-dialog-dragging").height(heightBeforeDrag);
				self._trigger('dragStop', event, filteredUi(ui));
				$.ui.dialog.overlay.resize();
			}
		});
	},

	_makeResizable: function(handles) {
		handles = (handles === undefined ? this.options.resizable : handles);
		var self = this,
			options = self.options,
			// .ui-resizable has position: relative defined in the stylesheet
			// but dialogs have to use absolute or fixed positioning
			position = self.uiDialog.css('position'),
			resizeHandles = (typeof handles === 'string' ?
				handles	:
				'n,e,s,w,se,sw,ne,nw'
			);

		function filteredUi(ui) {
			return {
				originalPosition: ui.originalPosition,
				originalSize: ui.originalSize,
				position: ui.position,
				size: ui.size
			};
		}
		self.uiDialog.resizable({
			cancel: '.ui-dialog-content',
			containment: 'document',
			alsoResize: self.element,
			maxWidth: options.maxWidth,
			maxHeight: options.maxHeight,
			minWidth: options.minWidth,
			minHeight: self._minHeight(),
			handles: resizeHandles,
			start: function(event, ui) {
				$(this).addClass("ui-dialog-resizing");
				self._trigger('resizeStart', event, filteredUi(ui));
			},
			resize: function(event, ui){
				self._trigger('resize', event, filteredUi(ui));
			},
			stop: function(event, ui) {
				$(this).removeClass("ui-dialog-resizing");
				options.height = $(this).height();
				options.width = $(this).width();
				self._trigger('resizeStop', event, filteredUi(ui));
				$.ui.dialog.overlay.resize();
			}
		})
		.css('position', position)
		.find('.ui-resizable-se').addClass('ui-icon ui-icon-grip-diagonal-se');
	},

	_minHeight: function() {
		var options = this.options;

		if (options.height === 'auto') {
			return options.minHeight;
		} else {
			return Math.min(options.minHeight, options.height);
		}
	},

	_position: function(position) {
		var myAt = [],
			offset = [0, 0],
			isVisible;

		if (position) {
			// deep extending converts arrays to objects in jQuery <= 1.3.2 :-(
	//		if (typeof position == 'string' || $.isArray(position)) {
	//			myAt = $.isArray(position) ? position : position.split(' ');

			if (typeof position === 'string' || (typeof position === 'object' && '0' in position)) {
				myAt = position.split ? position.split(' ') : [position[0], position[1]];
				if (myAt.length === 1) {
					myAt[1] = myAt[0];
				}

				$.each(['left', 'top'], function(i, offsetPosition) {
					if (+myAt[i] === myAt[i]) {
						offset[i] = myAt[i];
						myAt[i] = offsetPosition;
					}
				});

				position = {
					my: myAt.join(" "),
					at: myAt.join(" "),
					offset: offset.join(" ")
				};
			}

			position = $.extend({}, $.ui.dialog.prototype.options.position, position);
		} else {
			position = $.ui.dialog.prototype.options.position;
		}

		// need to show the dialog to get the actual offset in the position plugin
		isVisible = this.uiDialog.is(':visible');
		if (!isVisible) {
			this.uiDialog.show();
		}
		this.uiDialog
			// workaround for jQuery bug #5781 http://dev.jquery.com/ticket/5781
			//.css({ top: 0, left: 0 })
			.position($.extend({ of: window }, position));
		if (!isVisible) {
			this.uiDialog.hide();
		}
	},

	_setOptions: function( options ) {
		var self = this,
			resizableOptions = {},
			resize = false;

		$.each( options, function( key, value ) {
			self._setOption( key, value );

			if ( key in sizeRelatedOptions ) {
				resize = true;
			}
			if ( key in resizableRelatedOptions ) {
				resizableOptions[ key ] = value;
			}
		});

		if ( resize ) {
			this._size();
		}
		if ( this.uiDialog.is( ":data(resizable)" ) ) {
			this.uiDialog.resizable( "option", resizableOptions );
		}
	},

	_setOption: function(key, value){
		var self = this,
			uiDialog = self.uiDialog;

		switch (key) {
			//handling of deprecated beforeclose (vs beforeClose) option
			//Ticket #4669 http://dev.jqueryui.com/ticket/4669
			//TODO: remove in 1.9pre
			case "beforeclose":
				key = "beforeClose";
				break;
			case "buttons":
				self._createButtons(value);
				break;
			case "closeText":
				// ensure that we always pass a string
				self.uiDialogTitlebarCloseText.text("" + value);
				break;
			case "dialogClass":
				uiDialog
					.removeClass(self.options.dialogClass)
					.addClass(uiDialogClasses + value);
				break;
			case "disabled":
				if (value) {
					uiDialog.addClass('ui-dialog-disabled');
				} else {
					uiDialog.removeClass('ui-dialog-disabled');
				}
				break;
			case "draggable":
				var isDraggable = uiDialog.is( ":data(draggable)" );
				if ( isDraggable && !value ) {
					uiDialog.draggable( "destroy" );
				}

				if ( !isDraggable && value ) {
					self._makeDraggable();
				}
				break;
			case "position":
				self._position(value);
				break;
			case "resizable":
				// currently resizable, becoming non-resizable
				var isResizable = uiDialog.is( ":data(resizable)" );
				if (isResizable && !value) {
					uiDialog.resizable('destroy');
				}

				// currently resizable, changing handles
				if (isResizable && typeof value === 'string') {
					uiDialog.resizable('option', 'handles', value);
				}

				// currently non-resizable, becoming resizable
				if (!isResizable && value !== false) {
					self._makeResizable(value);
				}
				break;
			case "title":
				// convert whatever was passed in o a string, for html() to not throw up
				$(".ui-dialog-title", self.uiDialogTitlebar).html("" + (value || '&#160;'));
				break;
		}

		$.Widget.prototype._setOption.apply(self, arguments);
	},

	_size: function() {
		/* If the user has resized the dialog, the .ui-dialog and .ui-dialog-content
		 * divs will both have width and height set, so we need to reset them
		 */
		var options = this.options,
			nonContentHeight,
			minContentHeight,
			isVisible = this.uiDialog.is( ":visible" );

		// reset content sizing
		this.element.show().css({
			width: 'auto',
			minHeight: 0,
			height: 0
		});

		if (options.minWidth > options.width) {
			options.width = options.minWidth;
		}

		// reset wrapper sizing
		// determine the height of all the non-content elements
		nonContentHeight = this.uiDialog.css({
				height: 'auto',
				width: options.width
			})
			.height();
		minContentHeight = Math.max( 0, options.minHeight - nonContentHeight );

		if ( options.height === "auto" ) {
			// only needed for IE6 support
			if ( $.support.minHeight ) {
				this.element.css({
					minHeight: minContentHeight,
					height: "auto"
				});
			} else {
				this.uiDialog.show();
				var autoHeight = this.element.css( "height", "auto" ).height();
				if ( !isVisible ) {
					this.uiDialog.hide();
				}
				this.element.height( Math.max( autoHeight, minContentHeight ) );
			}
		} else {
			this.element.height( Math.max( options.height - nonContentHeight, 0 ) );
		}

		if (this.uiDialog.is(':data(resizable)')) {
			this.uiDialog.resizable('option', 'minHeight', this._minHeight());
		}
	}
});

$.extend($.ui.dialog, {
	version: "1.8.16",

	uuid: 0,
	maxZ: 0,

	getTitleId: function($el) {
		var id = $el.attr('id');
		if (!id) {
			this.uuid += 1;
			id = this.uuid;
		}
		return 'ui-dialog-title-' + id;
	},

	overlay: function(dialog) {
		this.$el = $.ui.dialog.overlay.create(dialog);
	}
});

$.extend($.ui.dialog.overlay, {
	instances: [],
	// reuse old instances due to IE memory leak with alpha transparency (see #5185)
	oldInstances: [],
	maxZ: 0,
	events: $.map('focus,mousedown,mouseup,keydown,keypress,click'.split(','),
		function(event) { return event + '.dialog-overlay'; }).join(' '),
	create: function(dialog) {
		if (this.instances.length === 0) {
			// prevent use of anchors and inputs
			// we use a setTimeout in case the overlay is created from an
			// event that we're going to be cancelling (see #2804)
			setTimeout(function() {
				// handle $(el).dialog().dialog('close') (see #4065)
				if ($.ui.dialog.overlay.instances.length) {
					$(document).bind($.ui.dialog.overlay.events, function(event) {
						// stop events if the z-index of the target is < the z-index of the overlay
						// we cannot return true when we don't want to cancel the event (#3523)
						if ($(event.target).zIndex() < $.ui.dialog.overlay.maxZ) {
							return false;
						}
					});
				}
			}, 1);

			// allow closing by pressing the escape key
			$(document).bind('keydown.dialog-overlay', function(event) {
				if (dialog.options.closeOnEscape && !event.isDefaultPrevented() && event.keyCode &&
					event.keyCode === $.ui.keyCode.ESCAPE) {

					dialog.close(event);
					event.preventDefault();
				}
			});

			// handle window resize
			$(window).bind('resize.dialog-overlay', $.ui.dialog.overlay.resize);
		}

		var $el = (this.oldInstances.pop() || $('<div></div>').addClass('ui-widget-overlay'))
			.appendTo(document.body)
			.css({
				width: this.width(),
				height: this.height()
			});

		if ($.fn.bgiframe) {
			$el.bgiframe();
		}

		this.instances.push($el);
		return $el;
	},

	destroy: function($el) {
		var indexOf = $.inArray($el, this.instances);
		if (indexOf != -1){
			this.oldInstances.push(this.instances.splice(indexOf, 1)[0]);
		}

		if (this.instances.length === 0) {
			$([document, window]).unbind('.dialog-overlay');
		}

		$el.remove();

		// adjust the maxZ to allow other modal dialogs to continue to work (see #4309)
		var maxZ = 0;
		$.each(this.instances, function() {
			maxZ = Math.max(maxZ, this.css('z-index'));
		});
		this.maxZ = maxZ;
	},

	height: function() {
		return $(document).height() + 'px';
	},

	width: function() {
		return $(document).width() + 'px';
	},

	resize: function() {
		/* If the dialog is draggable and the user drags it past the
		 * right edge of the window, the document becomes wider so we
		 * need to stretch the overlay. If the user then drags the
		 * dialog back to the left, the document will become narrower,
		 * so we need to shrink the overlay to the appropriate size.
		 * This is handled by shrinking the overlay before setting it
		 * to the full document size.
		 */
		var $overlays = $([]);
		$.each($.ui.dialog.overlay.instances, function() {
			$overlays = $overlays.add(this);
		});

		$overlays.css({
			width: 0,
			height: 0
		}).css({
			width: $.ui.dialog.overlay.width(),
			height: $.ui.dialog.overlay.height()
		});
	}
});

$.extend($.ui.dialog.overlay.prototype, {
	destroy: function() {
		$.ui.dialog.overlay.destroy(this.$el);
	}
});

}(jQuery));
},{}],18:[function(require,module,exports){
require("./human_language.js");
require("./memorize_world.js");
require("./pause.js");
require("./run.js");
require("./programming_mode.js");
require("./reload.js");
require("./robot_model.js");
require("./select_world_change.js");
require("./step.js");
require("./stop.js");
require("./toggle_highlight.js");
require("./toggle_watch.js");

},{"./human_language.js":19,"./memorize_world.js":20,"./pause.js":21,"./programming_mode.js":22,"./reload.js":23,"./robot_model.js":24,"./run.js":25,"./select_world_change.js":26,"./step.js":27,"./stop.js":28,"./toggle_highlight.js":29,"./toggle_watch.js":30}],19:[function(require,module,exports){
require("./../state.js");
require("./../../lang/reeborg_en.js");
require("./../../lang/reeborg_fr.js");
require("./../custom_world_select.js");
var msg = require("./../../lang/msg.js");


msg.record_id("human-language");

function update_translations(lang) {
    var msg, dict;
    dict = RUR[lang];
    for (msg in dict) {
        if (dict.hasOwnProperty(msg)) {
            RUR.translation[msg] = dict[msg];
        }
    }
}

function update_commands (lang) {
    switch(lang) {
        case "fr":
            RUR.reset_definitions = RUR.reset_definitions_fr;
            RUR.library_name = "biblio";
            RUR.from_import = "from reeborg_fr import *";
            break;
        case "en":
            RUR.reset_definitions = RUR.reset_definitions_en;
            RUR.library_name = "library";
            RUR.from_import = "from reeborg_en import *";
            break;
        default:
            RUR.library_name = "library";
            RUR.from_import = "from reeborg_en import *";
            RUR.reset_definitions = RUR.reset_definitions_en;
    }
    RUR.reset_definitions();
}

function update_home_url (lang) {
    switch(lang) {
        case "fr":
            $("#logo").prop("href", "index_fr.html");
            break;
        case "en":
            $("#logo").prop("href", "index_en.html");
            break;
        default:
            $("#logo").prop("href", "index_en.html");
    }
}

$("#human-language").change(function() {
    var lang = $(this).val();
    RUR.state.human_language = lang;
    update_translations(lang);
    msg.update_ui(lang);
    update_commands(lang);
    update_home_url(lang);
    RUR.make_default_menu(lang);
    // TODO update selectors text
    //TODO update blockly display
    if (RUR.state.input_method == "py-repl") {
        try {
            restart_repl();
        } catch (e) {
            console.log("human-language change: can not re/start repl", e);
        }
    }
    localStorage.setItem("human_language", lang);
    RUR.permalink.update_live();
});

},{"./../../lang/msg.js":82,"./../../lang/reeborg_en.js":83,"./../../lang/reeborg_fr.js":84,"./../custom_world_select.js":3,"./../state.js":45}],20:[function(require,module,exports){

require("./../state.js");
require("./../storage.js");
var record_id = require("./../../lang/msg.js").record_id;
var clone_world = require("./../world/clone_world.js").clone_world;

var memorize_button = document.getElementById("memorize-world");
record_id("memorize-world", "Save world in browser");

memorize_world = function () {
    var existing_names, i, key, response;

    existing_names = '';
    for (i = 0; i <= localStorage.length - 1; i++) {
        key = localStorage.key(i);
        if (key.slice(0, 11) === "user_world:") {
            if (!existing_names) {
                existing_names = "Existing names: " + key.substring(11);
            } else {
                existing_names += "," + key.substring(11);
            }
        }
    }

    if (existing_names) {
        $("#existing-world-names").html(existing_names);
    }
    dialog.dialog("open");
};
memorize_button.addEventListener("click", memorize_world, false);

dialog = $("#dialog-save-world").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        OK: function () {
            save_world();
        },
        Cancel: function() {
            dialog.dialog("close");
        }
    }
});

dialog.find("form").on("submit", function( event ) {
    event.preventDefault();
    save_world();
});

save_world = function () {
    RUR.storage._save_world($("#world-name").val().trim());
    RUR._SAVED_WORLD = clone_world();
    dialog.dialog("close");
    $('#delete-world').show();
};

},{"./../../lang/msg.js":82,"./../state.js":45,"./../storage.js":46,"./../world/clone_world.js":60}],21:[function(require,module,exports){
require("./../state.js");
;
require("./../playback/play.js");
var record_id = require("./../../lang/msg.js").record_id;

var pause_button = document.getElementById("step");
record_id("pause");

RUR.pause = function (ms) {
    RUR.state.playback = false;
    clearTimeout(RUR._TIMER);
    $("#pause").attr("disabled", "true");
    if (ms !== undefined){      // pause called via a program instruction
        RUR._TIMER = setTimeout(RUR.play, ms);  // will reset RUR.state.playback to true
    } else {
        $("#run").removeAttr("disabled");
        $("#step").removeAttr("disabled");
        $("#reverse-step").removeAttr("disabled");
    }
};
pause_button.addEventListener("click", pause, false);

},{"./../../lang/msg.js":82,"./../playback/play.js":34,"./../state.js":45}],22:[function(require,module,exports){
require("./../state.js");
require("./../listeners/reload.js");
require("./../keyboard.js");
var record_id = require("./../../lang/msg.js").record_id;

record_id("programming-mode");

$("#programming-mode").change(function() {
    "use strict";
    var choice = $(this).val();
    RUR.state.input_method = choice;
    localStorage.setItem("programming-mode", choice);
    hide_everything();

    switch(choice) {
        case "python":
            RUR.state.programming_language = "python";
            show_editor("python");
            editor.setOption("readOnly", false);
            editor.setOption("theme", "reeborg-dark");
            break;
        case "javascript":
            RUR.state.programming_language = "javascript";
            show_editor("javascript");
            editor.setOption("readOnly", false);
            editor.setOption("theme", "reeborg-dark");
            break;
        case "blockly-py":
            RUR.state.programming_language = "python";
            show_blockly();
            editor.setOption("readOnly", true);
            editor.setOption("theme", "reeborg-readonly");
            break;
        case "blockly-js":
            RUR.state.programming_language = "javascript";
            show_blockly();
            editor.setOption("readOnly", true);
            editor.setOption("theme", "reeborg-readonly");
            break;
        case "py-repl":
            RUR.state.programming_language = "python";
            show_console();
            break;
        default:
            RUR.state.programming_language = "python";
            show_editor("python");
            editor.setOption("readOnly", false);
            editor.setOption("theme", "reeborg-dark");
        console.log("Problem? Default value used in programming-mode select.");
    }

    RUR.kbd.set_programming_language(RUR.state.programming_language);
    RUR.permalink.update_live();    
});


record_id("editor-visible-blockly");
$('#editor-visible-blockly').change(function() {
    if ($('#editor-visible-blockly')[0].checked) {
        show_editor(RUR.state.programming_language);
    } else {
        hide_editors();
    }
});


function hide_everything () {
    /* By default, we start with a situation where everything is hidden
       and only show later the relevant choices for a given option */
    hide_blockly();
    hide_editors();
    hide_console();
    if ($("#special-keyboard-button").hasClass("reverse-blue-gradient")) {
        $("#special-keyboard-button").click();
    }
    $("#special-keyboard-button").hide();
    // Python specific
    $("#python-additional-menu p button").attr("disabled", "true");
    $("#library-tab").parent().hide();
    $("#highlight").hide();
    $("#watch-variables-btn").hide();
    $("#Reeborg-watches").dialog("close");
}

function show_blockly () {
    $("#blockly-wrapper").show();
    $("#visible-blockly").show();
    $("#editor-visible-blockly").show();
    if ($('#editor-visible-blockly')[0].checked) {
        show_editor(RUR.state.programming_language);
    }
    window.dispatchEvent(new Event('resize')); // important to ensure that blockly is visible
}

function hide_blockly () {
    $("#blockly-wrapper").hide();
    window.dispatchEvent(new Event('resize'));
    $("#visible-blockly").hide();
    $("#editor-visible-blockly").hide();
    $("#special-keyboard-button").show();
}

function show_editor(lang) {
    if (lang == "python") {
        show_python_editor();
    } else {
        show_javascript_editor();
    }
    $("#editor-panel").addClass("active");
    $("#editor-tab").click();
    RUR.reload();
    editor.refresh();
    if (RUR.state.editing_world) {
        $("#pre-code-link").parent().show();
        $("#post-code-link").parent().show();
        $("#description-link").parent().show();
        $("#onload-editor-link").parent().show();
    }
}

function show_javascript_editor () {
    $("#editor-tab").html(RUR.translate("Javascript Code"));
    editor.setOption("mode", "javascript");
    pre_code_editor.setOption("mode", "javascript");
    post_code_editor.setOption("mode", "javascript");
}

function show_python_editor () {
    $("#editor-tab").html(RUR.translate("Python Code"));
    editor.setOption("mode", {name: "python", version: 3});
    pre_code_editor.setOption("mode", {name: "python", version: 3});
    post_code_editor.setOption("mode", {name: "python", version: 3});

    RUR.state.highlight = RUR.state.highlight || RUR.state._saved_highlight_value;
    $("#library-tab").parent().show();
    $("#highlight").show();
    $("#watch-variables-btn").show();
    $("#python-additional-menu p button").removeAttr("disabled");
}


function hide_editors() {
    if (RUR.state.programming_language == "python") {
        RUR.state._saved_highlight_value = RUR.state.highlight;
        RUR.state.highlight = false;
    }
    $("#editor-panel").removeClass("active");
    // extra editors
    $("#pre-code-link").parent().hide();
    $("#post-code-link").parent().hide();
    $("#description-link").parent().hide();
    $("#onload-editor-link").parent().hide();
}

function show_console() {
    $("#py-console").show();
    $("#stop").hide();
    $("#pause").hide();
    $("#run").hide();
    $("#step").hide();
    $("#reverse-step").hide();
    $("#reload").hide();
    $("#reload2").show();
    $("#reload2").removeAttr("disabled");
    _start_repl();
}

function _start_repl() {
    try {
        restart_repl();
    } catch (e) {
        console.log("_start_repl: failure", e);
        window.setTimeout(_start_repl, 500);
    }
}

function hide_console() {
    $("#py-console").hide();
    $("#stop").show();
    $("#pause").show();
    $("#run").show();
    $("#step").show();
    $("#reverse-step").show();
    $("#reload").show();
    $("#reload2").hide();
}

/* Ensure that CodeMirror editors are set up properly
   even if not to be used initially
*/
show_editor("python");
// see start_session.js for initialization.

},{"./../../lang/msg.js":82,"./../keyboard.js":16,"./../listeners/reload.js":23,"./../state.js":45}],23:[function(require,module,exports){

require("./../utils/key_exist.js");
require("./../state.js");
var set_ready_to_run = require("./../ui/set_ready_to_run.js").set_ready_to_run;
var rec_reset = require("./../recorder/reset.js").reset;
var reset_world = require("./../world_set/reset_world.js").reset_world;
var record_id = require("./../../lang/msg.js").record_id;

var reload_button = document.getElementById("reload");
record_id("reload");
var reload2_button = document.getElementById("reload2");
record_id("reload2");

RUR.reload = function() {
    set_ready_to_run();
    RUR.reload2();
    $("#highlight-impossible").hide();
    RUR.state.code_evaluated = false;
    RUR.state.sound_on = false;
};

RUR.reload2 = function() {
    $("#stdout").html("");
    $(".view_source").remove();
    $("#print-html").html("");
    $("#Reeborg-concludes").dialog("close");
    $("#Reeborg-shouts").dialog("close");
    $("#watch-variables").html("");
    // reset the options in case the user has dragged the dialogs as it would
    // then open at the top left of the window
    $("#Reeborg-concludes").dialog("option", {minimize: false, maximize: false, autoOpen:false, width:500, dialogClass: "concludes", position:{my: "center", at: "center", of: $("#robot-canvas")}});
    $("#Reeborg-shouts").dialog("option", {minimize: false, maximize: false, autoOpen:false, width:500, dialogClass: "alert", position:{my: "center", at: "center", of: $("#robot-canvas")}});
    reset_world();
    rec_reset();
    if (RUR.state.input_method == "py-repl") {
        try {
            restart_repl();
        } catch (e) {
            console.log("RUR.reload2: can not re/start repl", e);
        }
    }
};

reload_button.addEventListener("click", RUR.reload, false);
reload2_button.addEventListener("click", RUR.reload2, false);

},{"./../../lang/msg.js":82,"./../recorder/reset.js":40,"./../state.js":45,"./../ui/set_ready_to_run.js":50,"./../utils/key_exist.js":54,"./../world_set/reset_world.js":73}],24:[function(require,module,exports){
require("./../visible_robot.js");
;
require("./../state.js");
var record_id = require("./../../lang/msg.js").record_id;

record_id("robot0");
record_id("robot1");
record_id("robot2");
record_id("robot3");

$("#robot0").on("click", function (evt) {
    RUR.select_default_robot_model(0);
});

$("#robot1").on("click", function (evt) {
    RUR.select_default_robot_model(1);
});

$("#robot2").on("click", function (evt) {
    RUR.select_default_robot_model(2);
});

$("#robot3").on("click", function (evt) {
    RUR.select_default_robot_model(3);
});


RUR.vis_robot.new_robot_images = function (images) {
    var model;
    if (images.model !== undefined) {
        switch (images.model) {
            case 0:
            case 1:
            case 2:
            case 3:
                model = images.model;
                break;
            default:
                model = 0;
        }
    } else {
        model = 0;
    }

    if (images.east !== undefined) {
        RUR.vis_robot.images[model].robot_e_img.src = images.east;
    }
    if (images.west !== undefined) {
        RUR.vis_robot.images[model].robot_w_img.src = images.west;
    }
    if (images.north !== undefined) {
        RUR.vis_robot.images[model].robot_n_img.src = images.north;
    }
    if (images.south !== undefined) {
        RUR.vis_robot.images[model].robot_s_img.src = images.south;
    }
    if (images.random !== undefined) {
        RUR.vis_robot.images[model].robot_random_img.src = images.random;
    }

    // change the image displayed in the html file.
    switch (model) {
        case 0:
            $("#robot0 img").attr("src", images.east);
            break;
        case 1:
            $("#robot1 img").attr("src", images.east);
            break;
        case 2:
            $("#robot2 img").attr("src", images.east);
            break;
        case 3:
            $("#robot3 img").attr("src", images.east);
            break;
    }

    RUR.select_default_robot_model(model);
};

},{"./../../lang/msg.js":82,"./../state.js":45,"./../visible_robot.js":57}],25:[function(require,module,exports){
;
require("./../state.js");
require("./reload.js");
require("./../runner.js");
require("./../playback/play.js");
var record_id = require("./../../lang/msg.js").record_id;

var run_button = document.getElementById("run");
record_id("run");

function run () {
    if (RUR.state.stop_called){
        RUR.state.stop_called = false;
        RUR.reload();
    }
    $("#stop").removeAttr("disabled");
    $("#pause").removeAttr("disabled");
    $("#run").attr("disabled", "true");
    $("#step").attr("disabled", "true");
    $("#reverse-step").attr("disabled", "true");
    $("#reload").attr("disabled", "true");

    clearTimeout(RUR._TIMER);
    RUR.runner.run(RUR.play);
}
run_button.addEventListener("click", run, false);

},{"./../../lang/msg.js":82,"./../playback/play.js":34,"./../runner.js":42,"./../state.js":45,"./reload.js":23}],26:[function(require,module,exports){
require("./../file_io.js");
require("./../storage.js");

var record_id = require("./../../lang/msg.js").record_id;
record_id("select-world");

$("#select-world").change(function() {
    if (RUR.state.creating_menu){
        return;
    }
    if ($(this).val() !== null) {
        RUR.file_io.load_world_file($(this).val());
    }
    try {
        localStorage.setItem("world", $(this).find(':selected').text());
    } catch (e) {}
});

},{"./../../lang/msg.js":82,"./../file_io.js":14,"./../storage.js":46}],27:[function(require,module,exports){

require("./../state.js");
require("./reload.js");
require("./../runner.js");
require("./../playback/play.js");
var record_id = require("./../../lang/msg.js").record_id;

var step_button = document.getElementById("step");
record_id("step");

step = function () {
    RUR.runner.run(RUR.rec.display_frame);
    RUR.state.stop_called = false;
    $("#stop").removeAttr("disabled");
    $("#reverse-step").removeAttr("disabled");
    clearTimeout(RUR._TIMER);
};
step_button.addEventListener("click", step, false);

},{"./../../lang/msg.js":82,"./../playback/play.js":34,"./../runner.js":42,"./../state.js":45,"./reload.js":23}],28:[function(require,module,exports){

require("./../state.js");
var record_id = require("./../../lang/msg.js").record_id;

var stop_button = document.getElementById("stop");
record_id("stop");

RUR.stop = function () {
    clearTimeout(RUR._TIMER);
    $("#stop").attr("disabled", "true");
    $("#pause").attr("disabled", "true");
    $("#run").removeAttr("disabled");
    $("#step").attr("disabled", "true");
    $("#reverse-step").attr("disabled", "true");
    $("#reload").removeAttr("disabled");
    RUR.state.stop_called = true;
};
stop_button.addEventListener("click", RUR.stop, false);

},{"./../../lang/msg.js":82,"./../state.js":45}],29:[function(require,module,exports){
;
require("./../state.js");
var record_id = require("./../../lang/msg.js").record_id;

var highlight_button = document.getElementById("highlight");
record_id("highlight");

RUR.toggle_highlight = function () {  // keep part of RUR for Python
    if (RUR.state.highlight) {
        RUR.state.highlight = false;
        $("#highlight").addClass("blue-gradient");
        $("#highlight").removeClass("reverse-blue-gradient");
    } else {
        RUR.state.highlight = true;
        $("#highlight").addClass("reverse-blue-gradient");
        $("#highlight").removeClass("blue-gradient");
    }
};
highlight_button.addEventListener("click", RUR.toggle_highlight, false);

},{"./../../lang/msg.js":82,"./../state.js":45}],30:[function(require,module,exports){
;
require("./../state.js");
var record_id = require("./../../lang/msg.js").record_id;

var watch_button = document.getElementById("watch-variables-btn");
record_id("watch-variables-btn");

toggle_watch_variables = function () {
    if (RUR.state.watch_vars) {
        RUR.state.watch_vars = false;
        $("#watch-variables-btn").addClass("blue-gradient");
        $("#watch-variables-btn").removeClass("reverse-blue-gradient");
        $("#watch-variables").html("");
        $("#Reeborg-watches").dialog("close");
    } else {
        RUR.state.watch_vars = true;
        $("#watch-variables-btn").addClass("reverse-blue-gradient");
        $("#watch-variables-btn").removeClass("blue-gradient");
        $("#watch-variables").html("");
        $("#Reeborg-watches").dialog("open");
    }
};
watch_button.addEventListener("click", toggle_watch_variables, false);

},{"./../../lang/msg.js":82,"./../state.js":45}],31:[function(require,module,exports){
require("./rur.js");
require("./extend/add_object_type.js");
require("./extend/add_tile_type.js");
require("./extend/new_home_tile.js");

_add_new_object_type = function (name) {
    "use strict";
    var url, url_goal;
    url = RUR._BASE_URL + '/src/images/' + name + '.png';
    url_goal = RUR._BASE_URL + '/src/images/' + name + '_goal.png';
    RUR.add_new_object_type(name, url, url_goal);
};

_add_new_object_type("token");
_add_new_object_type("star");
_add_new_object_type("triangle");
_add_new_object_type("square");
_add_new_object_type("strawberry");
_add_new_object_type("banana");
_add_new_object_type("apple");
_add_new_object_type("leaf");
_add_new_object_type("carrot");
_add_new_object_type("dandelion");
_add_new_object_type("orange");
_add_new_object_type("daisy");
_add_new_object_type("tulip");

_add_new_object_type("box");
RUR.OBJECTS.box.name = "box";
RUR.OBJECTS.box.pushable = true;
RUR.OBJECTS.box.in_water = "bridge";
RUR.OBJECTS.box.ctx = RUR.ROBOT_CTX;


RUR._add_new_tile_type = function (name, url) {
    var tiles = RUR.TILES;
    tiles[name] = {};
    tiles[name].name = name;
    tiles[name].image = new Image();
    if (url===undefined) {
        tiles[name].image.src = RUR._BASE_URL + '/src/images/' + name + '.png';
    } else {
        tiles[name].image.src = url;
    }
    tiles[name].image.onload = RUR.INCREMENT_LOADED_FN;
    RUR.KNOWN_TILES.push(name);
    RUR._NB_IMAGES_TO_LOAD += 1;
};


tile = {name: "mud",
    url: RUR._BASE_URL + '/src/images/mud.png',
    message: "I'm stuck in mud.",
    fatal: true,
    info: "Mud: Reeborg <b>cannot</b> detect this and will get stuck if it moves to this location."
};
RUR.add_new_tile_type(tile);

tile = {name: "ice",
    url: RUR._BASE_URL + '/src/images/ice.png',
    message: "I'm slipping on ice!",
    slippery: true,
    info: "Ice: Reeborg <b>cannot</b> detect this and will slide and move to the next location if it moves to this location."
};
RUR.add_new_tile_type(tile);

tile = {name: "grass",
    url: RUR._BASE_URL + '/src/images/grass.png',
    info: "Grass: usually safe."
};
RUR.add_new_tile_type(tile);

tile = {name: "pale_grass",
    url: RUR._BASE_URL + '/src/images/pale_grass.png',
    info: "Grass: usually safe.",
    public_name: "grass"
};
RUR.add_new_tile_type(tile);


tile = {name: "gravel",
    url: RUR._BASE_URL + '/src/images/gravel.png',
    info: "Gravel: usually safe."
};
RUR.add_new_tile_type(tile);

tile = {
    name:"water",
    images: [RUR._BASE_URL + '/src/images/water.png',
        RUR._BASE_URL + '/src/images/water2.png',
        RUR._BASE_URL + '/src/images/water3.png',
        RUR._BASE_URL + '/src/images/water4.png',
        RUR._BASE_URL + '/src/images/water5.png',
        RUR._BASE_URL + '/src/images/water6.png'],
    info: "Water: Reeborg <b>can</b> detect this but will get damaged if it moves to this location.",
    fatal: true,
    detectable: true,
    message: "I'm in water!"
};

RUR.add_new_tile_type(tile);

RUR._add_new_tile_type("bricks");
RUR.TILES.bricks.name = "brick wall"; // replace
RUR.TILES.bricks.fatal = true;
RUR.TILES.bricks.solid = true;
RUR.TILES.bricks.detectable = true;
RUR.TILES.bricks.message = "Crash!";
RUR.TILES.bricks.info = "brick wall: Reeborg <b>can</b> detect this but will hurt himself if he attemps to move through it.";

_add_new_home_tile = function (name, info) {
    info = info + "Reeborg <b>can</b> detect this tile using at_goal().";
    url = RUR._BASE_URL + '/src/images/' + name + '.png';
    RUR.add_new_home_tile(name, url, info);
};

_add_new_home_tile("green_home_tile", "green home tile:");
_add_new_home_tile("house", "house:");
_add_new_home_tile("racing_flag", "racing flag:");


RUR.SOLID_OBJECTS = {};
RUR.add_new_solid_object_type = function (name, url, nickname) {
    var obj = RUR.SOLID_OBJECTS;
    obj[name] = {};
    if (nickname === undefined) {
        obj[name].name = name;
    } else {
        obj[name].name = nickname;
        obj[name].fatal = true;
        obj[name].solid = true;
        obj[name].detectable = true;
    }
    obj[name].ctx = RUR.SECOND_LAYER_CTX;
    obj[name].image = new Image();
    if (!url) {
        obj[name].image.src = RUR._BASE_URL + '/src/images/' + name + '.png';
    } else {
        obj[name].image.src = url;
    }
    obj[name].image.onload = RUR.INCREMENT_LOADED_FN;
    RUR._NB_IMAGES_TO_LOAD += 1;
};

RUR.add_new_solid_object_type("bridge");
RUR.SOLID_OBJECTS.bridge.info = "Bridge:Reeborg <b>can</b> detect this and will know that it allows safe passage over water.";

RUR.add_new_solid_object_type("fence_right", false, "fence");
RUR.SOLID_OBJECTS.fence_right.message = "I hit a fence!";
RUR.SOLID_OBJECTS.fence_right.info = "Fence: Reeborg <b>can</b> detect this but will be stopped by it.";
RUR.SOLID_OBJECTS.fence4 = RUR.SOLID_OBJECTS.fence_right;  // compatibility with old worlds

RUR.add_new_solid_object_type("fence_left", false, "fence");
RUR.SOLID_OBJECTS.fence_left.message = RUR.SOLID_OBJECTS.fence_right.message;
RUR.SOLID_OBJECTS.fence_left.info = RUR.SOLID_OBJECTS.fence_right.info;
RUR.SOLID_OBJECTS.fence5 = RUR.SOLID_OBJECTS.fence_left;  // compatibility with old worlds

RUR.add_new_solid_object_type("fence_double", false, "fence");
RUR.SOLID_OBJECTS.fence_double.message = RUR.SOLID_OBJECTS.fence_right.message;
RUR.SOLID_OBJECTS.fence_double.info = RUR.SOLID_OBJECTS.fence_right.info;
RUR.SOLID_OBJECTS.fence6 = RUR.SOLID_OBJECTS.fence_double;  // compatibility with old worlds

RUR.add_new_solid_object_type("fence_vertical", false, "fence");
RUR.SOLID_OBJECTS.fence_vertical.message = RUR.SOLID_OBJECTS.fence_right.message;
RUR.SOLID_OBJECTS.fence_vertical.info = RUR.SOLID_OBJECTS.fence_right.info;
RUR.SOLID_OBJECTS.fence7 = RUR.SOLID_OBJECTS.fence_vertical;  // compatibility with old worlds

},{"./extend/add_object_type.js":11,"./extend/add_tile_type.js":12,"./extend/new_home_tile.js":13,"./rur.js":43}],32:[function(require,module,exports){


require("./recorder.js");
require("./state.js");

RUR.output = {};

RUR.output.write = function () {
    var output_string = '';
    RUR.state.sound_id = "#write-sound";
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] == "string") {
            output_string += arguments[i];
        } else {
            output_string += JSON.stringify(arguments[i]);
        }
    }
    output_string = output_string.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    RUR.record_frame("stdout", {"element": "#stdout", "message": output_string});
};

RUR.output._write = function () {
    var output_string = '';
    for (var i = 0; i < arguments.length; i++) {
        if (typeof arguments[i] == "string") {
            output_string += arguments[i];
        } else {
            output_string += JSON.stringify(arguments[i]);
        }
    }
    RUR.record_frame("stdout", {"element": "#stdout", "message": output_string});
};

RUR.output.clear_print = function () {
    RUR.record_frame("stdout", {"element": "#stdout", "clear": true});
};

RUR.output.print_html = function (arg, append) {
    if (append) {
        RUR.record_frame("print_html", {"element": "#print-html", "message": arg, "append": true});
    } else {
        RUR.record_frame("print_html", {"element": "#print-html", "message": arg});
    }
};

RUR.output.watch_variables = function (arg) {
    RUR.record_frame("watch_variables", {"element": "#watch-variables", "message": arg});
};


RUR.output.view_source_js = function(fn) {
    $("#Reeborg-explores").dialog("open");
    RUR.show_feedback("#Reeborg-explores", "<pre class='view_source'>" + fn + "</pre>" );
    $('.view_source').each(function() {
        var $this = $(this), $code = $this.text();
        $this.empty();
        var myCodeMirror = CodeMirror(this, {
            value: $code,
            mode: 'javascript',
            lineNumbers: !$this.is('.inline'),
            readOnly: true,
            theme: 'reeborg-readonly'
        });
    });
};

},{"./recorder.js":38,"./state.js":45}],33:[function(require,module,exports){

require("./state.js");
require("./storage.js");
require("./world.js");
require("./translator.js");
require("./listeners/programming_mode.js");
require("./utils/parseuri.js");

var export_world = require("./world/export_world.js").export_world;


RUR.permalink = {};

RUR.permalink.update_live = function () {
    /* Used to maintain information about human language used and
       input mode.
    */
    "use strict";
    var proglang, url_query, permalink;
    url_query = parseUri(window.location.href);
    permalink = url_query.protocol + "://" + url_query.host;
    if (url_query.port){
        permalink += ":" + url_query.port;
    }
    permalink += url_query.path;
    permalink += "?lang=" + RUR.state.human_language + "&mode=" + RUR.state.input_method;
    window.history.pushState("dummy", "dummy", permalink);
};

RUR.permalink.__create = function () {
    "use strict";
    var proglang, world, _editor, _library, url_query, permalink;
    url_query = parseUri(window.location.href);

    permalink = url_query.protocol + "://" + url_query.host;
    if (url_query.port){
        permalink += ":" + url_query.port;
    }
    permalink += url_query.path;
    proglang = RUR.state.programming_language + "-" + RUR.state.human_language;
    world = encodeURIComponent(export_world());
    _editor = encodeURIComponent(editor.getValue());
    if (RUR.state.programming_language == "python") {
        _library = encodeURIComponent(library.getValue());
        permalink += "?proglang=" + proglang + "&world=" + world + "&editor=" + _editor + "&library=" + _library;
    } else {
        permalink += "?proglang=" + proglang + "&world=" + world + "&editor=" + _editor;
    }
    return permalink;
};


RUR.permalink.create = function () {
    var permalink;

    permalink = RUR.permalink.__create();

    $("#url-input-textarea").val(permalink);
    $("#url-input").toggle();
    $("#ok-permalink").removeAttr("disabled");
    $("#cancel-permalink").removeAttr("disabled");

    return false;
};


RUR.permalink.update = function (arg, shortname) {
    "use strict";
    var url_query, name;

	if (RUR.permalink_update_previous_arg === undefined) {
		RUR.permalink_update_previous_arg = arg;
	} else if (RUR.permalink_update_previous_arg === arg) {
		return;
	} else {
		RUR.permalink_update_previous_arg = arg;
	}

    if (arg !== undefined) {
        url_query = parseUri(arg);
    } else {
        url_query = parseUri($("#url-input-textarea").val());
    }
    if (url_query.queryKey.proglang !== undefined &&
       url_query.queryKey.world !== undefined &&
       url_query.queryKey.editor !== undefined) {
        var prog_lang = url_query.queryKey.proglang;
        $('input[type=radio][name=programming_language]').val([prog_lang]);
		//FIXME this doesn't work anymore ....
        RUR.reset_programming_language(prog_lang);
        RUR.world.import_world(decodeURIComponent(url_query.queryKey.world));
        if (shortname !== undefined) {
            RUR.storage.save_world(shortname);
        } else {
            RUR.storage.save_world(RUR.translate("PERMALINK"));
        }
        editor.setValue(decodeURIComponent(url_query.queryKey.editor));
    }

    if (RUR.state.programming_language == "python" &&
       url_query.queryKey.library !== undefined) {
        library.setValue(decodeURIComponent(url_query.queryKey.library));
    }

    $("#url-input").hide();
    $("#permalink").removeClass('reverse-blue-gradient');
    $("#permalink").addClass('blue-gradient');
};

RUR.permalink.cancel = function () {
    $('#url-input').hide();
    $("#permalink").removeClass('reverse-blue-gradient');
    $("#permalink").addClass('blue-gradient');
};

},{"./listeners/programming_mode.js":22,"./state.js":45,"./storage.js":46,"./translator.js":48,"./utils/parseuri.js":55,"./world.js":59,"./world/export_world.js":62}],34:[function(require,module,exports){
require("./../state.js");
require("./../listeners/stop.js");

RUR.play = function () {
    "use strict";
    if (RUR.state.playback){            // RUR.visible_world.running
        RUR.state.playback = false;
        return;
    }
    RUR.state.playback = true;
    loop();
};

function loop () {
    "use strict";
    var frame_info;

    if (!RUR.state.playback){
        return;
    }
    frame_info = RUR.rec.display_frame();

    if (frame_info === "pause") {
        return;
    } else if (frame_info === "stopped") {
        RUR.stop();
        return;
    }
    RUR._TIMER = setTimeout(loop, RUR.playback_delay);
}

},{"./../listeners/stop.js":28,"./../state.js":45}],35:[function(require,module,exports){

RUR._play_sound = function (sound_id) {
    "use strict";
    var current_sound;
    current_sound = $(sound_id)[0];
    current_sound.load();
    current_sound.play();
};

},{}],36:[function(require,module,exports){
;
require("./../state.js");
require("./../recorder.js");


RUR.reverse_step = function () {
    RUR.current_frame_no -= 2;
    if (RUR.current_frame_no < 0){
        $("#reverse-step").attr("disabled", "true");
    }
    RUR.rec.display_frame();
    RUR.state.stop_called = false;
    $("#stop").removeAttr("disabled");
    clearTimeout(RUR._TIMER);
};

},{"./../recorder.js":38,"./../state.js":45}],37:[function(require,module,exports){

require("./../visible_world.js");
require("./../exceptions.js");
/* if the REPL is active, we do not record anything, and show immediately
   the updated world */

RUR._show_immediate = function (name, obj) {
    RUR.vis_world.refresh();
    // TODO: confirm that watching variables work.
    if (name !== undefined && name == "print_html") {
        if (obj.append){
            $(obj.element).append(obj.message);
        } else {
            $(obj.element).html(obj.message);
        }
        $("#Reeborg-proclaims").dialog("open");
    }
};

},{"./../exceptions.js":10,"./../visible_world.js":58}],38:[function(require,module,exports){

require("./state.js");
require("./visible_world.js");
require("./world_get.js");
require("./constants.js");
require("./translator.js");
require("./exceptions.js");
require("./listeners/pause.js");
require("./listeners/stop.js");
require("./playback/play_sound.js");

var identical = require("./utils/identical.js").identical;
var clone_world = require("./world/clone_world.js").clone_world;

RUR.rec = {};

RUR.set_lineno_highlight = function(lineno, frame) {
    RUR.current_line_no = lineno;
    if (frame) {
        RUR.record_frame();
        return true;
    }
};

RUR.rec.display_frame = function () {
    // set current world to frame being played.
    "use strict";
    var frame, goal_status, i, next_frame_line_numbers;

    if (RUR.current_frame_no >= RUR.nb_frames) {
        return RUR.rec.conclude();
    }

    //track line number and highlight line to be executed
    if (RUR.state.programming_language === "python" && RUR.state.highlight) {
        try {
            for (i = 0; i < RUR.rec_previous_lines.length; i++){
                editor.removeLineClass(RUR.rec_previous_lines[i], 'background', 'editor-highlight');
            }
        }catch (e) {console.log("diagnostic: error was raised while trying to removeLineClass", e);}
        if (RUR.rec_line_numbers [RUR.current_frame_no+1] !== undefined){
            next_frame_line_numbers = RUR.rec_line_numbers [RUR.current_frame_no+1];
            for(i = 0; i < next_frame_line_numbers.length; i++){
                editor.addLineClass(next_frame_line_numbers[i], 'background', 'editor-highlight');
            }
            i = next_frame_line_numbers.length - 1;
            if (RUR._max_lineno_highlighted < next_frame_line_numbers[i]) {
                RUR._max_lineno_highlighted = next_frame_line_numbers[i];
            }
            RUR.rec_previous_lines = RUR.rec_line_numbers [RUR.current_frame_no+1];
        } else {
            try {  // try adding back to capture last line of program
                for (i=0; i < RUR.rec_previous_lines.length; i++){
                    editor.addLineClass(RUR.rec_previous_lines[i], 'background', 'editor-highlight');
                }
            }catch (e) {console.log("diagnostic: error was raised while trying to addLineClass", e);}
        }
    }

    frame = RUR.frames[RUR.current_frame_no];
    RUR.current_frame_no++;

    if (frame === undefined){
        //RUR.CURRENT_WORLD = RUR._SAVED_WORLD;  // useful when ...
        RUR.vis_world.refresh();                    // ... reversing step
        return;
    }

    if (RUR.__debug && frame.debug) {
        console.log("debug: ", frame.debug);
    }

    // many of these are exlusive of others ... but to give more flexibility
    // in adding options (and prevent bugs!!), we do not use an
    // if/else if/... structure, but rather a series of if clauses.


    if (frame.delay !== undefined){
        RUR.playback_delay = frame.delay;
    }

    if (frame.pause) {
        RUR.pause(frame.pause.pause_time);
        return "pause";
    }

    if (frame.error !== undefined) {
        return RUR.rec.handle_error(frame);
    }

    if (frame.stdout !== undefined) {
        if (frame.stdout.clear) { // for clearprint
            $(frame.stdout.element).html('');
        } else {
            $(frame.stdout.element).append(frame.stdout.message);
        }
        $("#Reeborg-writes").dialog("open");
    }

    if (frame.print_html !== undefined) {
        if (frame.print_html.append){
            $(frame.print_html.element).append(frame.print_html.message);
        } else {
            $(frame.print_html.element).html(frame.print_html.message);
        }
        $("#Reeborg-proclaims").dialog("open");
    }

    if (frame.watch_variables !== undefined) {
        $(frame.watch_variables.element).html(frame.watch_variables.message);
        $("#Reeborg-watches").dialog("open");
    }

    RUR.CURRENT_WORLD = frame.world;
    if (frame.sound_id !== undefined){
        RUR._play_sound(frame.sound_id);
    }
    RUR.vis_world.refresh();
};

RUR.rec.conclude = function () {
    var frame, goal_status;

    if (RUR.nb_frames > 0) {
        frame = RUR.frames[RUR.nb_frames-1];
    }
    if (frame === undefined) {
        frame = {};
        frame.world = clone_world();
    }
    if (frame.world.goal !== undefined){
        goal_status = RUR.rec.check_goal(frame);
        if (goal_status.success) {
            if (RUR.state.sound_on) {
                RUR._play_sound("#success-sound");
            }
            RUR.show_feedback("#Reeborg-concludes", goal_status.message);
        } else {
            if (RUR.state.sound_on) {
                RUR._play_sound("#error-sound");
            }
            RUR.show_feedback("#Reeborg-shouts", goal_status.message);
        }
    } else {
        if (RUR.state.sound_on) {
            RUR._play_sound("#success-sound");
        }
        RUR.show_feedback("#Reeborg-concludes",
                             "<p class='center'>" +
                             RUR.translate("Last instruction completed!") +
                             "</p>");
    }
    RUR.stop();
    return "stopped";
};

RUR.rec.handle_error = function (frame) {
    var goal_status;
    if (frame.error.reeborg_shouts === RUR.translate("Done!")){
        if (frame.world.goal !== undefined){
            return RUR.rec.conclude();
        } else {
            if (RUR.state.sound_on) {
                RUR._play_sound("#success-sound");
            }
            RUR.show_feedback("#Reeborg-concludes",
                RUR.translate("<p class='center'>Instruction <code>done()</code> executed.</p>"));
        }
    } else {
        if (RUR.state.sound_on) {
            RUR._play_sound("#error-sound");
        }
        RUR.show_feedback("#Reeborg-shouts", frame.error.message);
    }
    RUR.stop();
    return "stopped";
};

RUR.rec.check_current_world_status = function() {
    // this function is to check goals from the Python console.
    frame = {};
    frame.world = RUR.CURRENT_WORLD;
    if (frame.world.goal === undefined){
        RUR.show_feedback("#Reeborg-concludes",
                             "<p class='center'>" +
                             RUR.translate("Last instruction completed!") +
                             "</p>");
    } else {
        goal_status = RUR.rec.check_goal(frame);
        if (goal_status.success) {
            RUR.show_feedback("#Reeborg-concludes", goal_status.message);
        } else {
            RUR.show_feedback("#Reeborg-shouts", goal_status.message);
        }
    }
};

RUR.rec.check_goal = function (frame) {
    var g, world, goal_status = {}, result;
    g = frame.world.goal;
    world = frame.world;
    goal_status.message = "<ul>";
    goal_status.success = true;
    if (g.position !== undefined){
        if (g.position.x === world.robots[0].x){
            goal_status.message += RUR.translate("<li class='success'>Reeborg is at the correct x position.</li>");
        } else {
            goal_status.message += RUR.translate("<li class='failure'>Reeborg is at the wrong x position.</li>");
            goal_status.success = false;
        }
        if (g.position.y === world.robots[0].y){
            goal_status.message += RUR.translate("<li class='success'>Reeborg is at the correct y position.</li>");
        } else {
            goal_status.message += RUR.translate("<li class='failure'>Reeborg is at the wrong y position.</li>");
            goal_status.success = false;
        }
    }
    if (g.objects !== undefined) {
        result = identical(g.objects, world.objects, true);
        if (result){
            goal_status.message += RUR.translate("<li class='success'>All objects are at the correct location.</li>");
        } else {
            goal_status.message += RUR.translate("<li class='failure'>One or more objects are not at the correct location.</li>");
            goal_status.success = false;
        }
    }
    if (g.walls !== undefined) {
        result = true;
        loop:
        for(var w in g.walls){
            for(var i=0; i < g.walls[w].length; i++){
                if ( !(world.walls !== undefined &&
                       world.walls[w] !== undefined &&
                       world.walls[w].indexOf(g.walls[w][i]) !== -1)){
                    result = false;
                    break loop;
                }
            }
        }
        if (result){
            goal_status.message += RUR.translate("<li class='success'>All walls have been built correctly.</li>");
        } else {
            goal_status.message += RUR.translate("<li class='failure'>One or more walls missing or built at wrong location.</li>");
            goal_status.success = false;
        }
    }
    goal_status.message += "</u>";
    return goal_status;
};

// A sneaky programmer could teleport a robot on a forbidden tile
// to perform an action; we catch any such potential problem here
RUR.rec.check_robots_on_tiles = function(frame){
    var tile, robots, robot, coords;
    if (frame.world.robots === undefined){
        return;
    }
    for (robot=0; robot < frame.world.robots.length; robot++){
        tile = RUR.world_get.tile_at_position(frame.world.robots[robot]);
        if (tile) {
            if (tile.fatal){
                throw new RUR.ReeborgError(RUR.translate(tile.message));
            }
        }
    }
};

},{"./constants.js":1,"./exceptions.js":10,"./listeners/pause.js":21,"./listeners/stop.js":28,"./playback/play_sound.js":35,"./state.js":45,"./translator.js":48,"./utils/identical.js":53,"./visible_world.js":58,"./world/clone_world.js":60,"./world_get.js":65}],39:[function(require,module,exports){

require("./../state.js");
require("./../exceptions.js");
require("./../playback/show_immediate.js");
var clone_world = require("./../world/clone_world.js").clone_world;

RUR.record_frame = function (name, obj) {
    "use strict";
    var frame = {};

    if (RUR.state.do_not_record) {
        return;
    }
    if (RUR.state.prevent_playback){  // TODO see if this can be replaced by do_not_record
        return;
    }

    /* if the REPL is active, we do not record anything, and show immediately
       the updated world */
    if (RUR.state.input_method==="py-repl") {
        return RUR._show_immediate(name, obj);
    }

    // // Used mainly to add watch variables to previous frame
    // if (name !== undefined && name == "output" &&
    //     obj.element == "#print-html" && obj.append == undefined &&
    //     RUR.nb_frames > 1) {
    //     RUR.frames[RUR.nb_frames-1]["output"] = obj;
    //     return;
    // }


    frame.world = clone_world();
    if (name !== undefined) {
        frame[name] = obj;
    }

    frame.delay = RUR.playback_delay;
    if (RUR.state.sound_id && RUR.state.sound_on && frame.delay >= RUR.MIN_TIME_SOUND) {
        frame.sound_id = RUR.state.sound_id;
    }

   if (RUR.state.programming_language === "python" && RUR.state.highlight) {
       if (RUR.current_line_no !== undefined) {
           RUR.rec_line_numbers [RUR.nb_frames] = RUR.current_line_no;
       } else{
           RUR.rec_line_numbers [RUR.nb_frames] = [0];
       }
   }

    RUR.previous_lineno = RUR.current_line_no;

    RUR.frames[RUR.nb_frames] = frame;
    RUR.nb_frames++;

    RUR.state.sound_id = undefined;
    if (name === "error"){
        return;
    }

    // catch any robot that teleported itself to a forbidden tile
    // to try to do a sneaky action
    RUR.rec.check_robots_on_tiles(frame);

    if (RUR.nb_frames > RUR.MAX_STEPS + RUR.nb_extra_highlighting_frames) {
        throw new RUR.ReeborgError(RUR.translate("Too many steps:").supplant({max_steps: RUR.MAX_STEPS}));
    }
};

},{"./../exceptions.js":10,"./../playback/show_immediate.js":37,"./../state.js":45,"./../world/clone_world.js":60}],40:[function(require,module,exports){
require("./../state.js");

exports.reset = reset = function() {
    RUR.nb_frames = 0;
    RUR.current_frame_no = 0;
    RUR.nb_extra_highlighting_frames = 0;  // TODO: see if we can eliminate this
    // by inserting highlighting info in previous frame instead of separate frames.
    RUR.current_line_no = undefined;
    RUR.frames = [];
    RUR.rec_line_numbers = [];
    RUR.state.playback = false;
    RUR.playback_delay = 300;
    RUR.state.do_not_record = false;
    RUR.watched_expressions = [];
    clearTimeout(RUR._TIMER);
    if (RUR.state.programming_language === "python" &&
        RUR.state.highlight &&
        RUR._max_lineno_highlighted !== undefined) {
        for (var i=0; i <= RUR._max_lineno_highlighted; i++){
            try {
                editor.removeLineClass(i, 'background', 'editor-highlight');
            }catch (e) {console.log("diagnostic: error was raised while trying to removeLineClass", e);}
        }
    }
    RUR.rec_previous_lines = [];
    RUR._max_lineno_highlighted = 0;
};

reset();

},{"./../state.js":45}],41:[function(require,module,exports){

require("./constants.js");
require("./translator.js");
require("./exceptions.js");
var filterInt = require("./utils/filterint.js").filterInt;

RUR.robot = {};

RUR.robot.create_robot = function (x, y, orientation, tokens) {
    "use strict";
    var robot = {};
    robot.x = x || 1;
    robot.y = y || 1;
    robot.objects = {};
    if (tokens !== undefined){
        tokens = filterInt(tokens);
        if (tokens > 0) {
            robot.objects.token = tokens;
        }
    }

    if (orientation === undefined){
        robot._orientation = RUR.EAST;
    } else {
        switch (orientation.toLowerCase()){
        case "e":
        case RUR.translation.east:  /*TODO: see if we can get rid of this
                                            and have incoming in English */
            robot._orientation = RUR.EAST;
            break;
        case "n":
        case RUR.translation.north:
            robot._orientation = RUR.NORTH;
            break;
        case "w":
        case RUR.translation.west:
            robot._orientation = RUR.WEST;
            break;
        case "s":
        case RUR.translation.south:
            robot._orientation = RUR.SOUTH;
            break;
        default:
            throw new RUR.ReeborgError(RUR.translate("Unknown orientation for robot."));
        }
    }

    // private variables that should not be set directly in user programs.
    robot._is_leaky = true;
    robot._prev_x = robot.x;
    robot._prev_y = robot.y;
    robot._prev_orientation = robot._orientation;

    return robot;
};

RUR.robot.cleanup_objects = function (robot) {
    "use strict";
    var obj_name, objects_carried = {};
    for (obj_name in robot.objects) {
        if (robot.objects.hasOwnProperty(obj_name)){
             if (robot.objects[obj_name] == "infinite") {
                objects_carried[obj_name] = Infinity;
            } else if (robot.objects[obj_name] > 0){
                objects_carried[obj_name] = robot.objects[obj_name];
            }
        }
    }
    robot.objects = objects_carried;
    // handling legacy notation
    if (robot.orientation !== undefined){
        robot._orientation = robot.orientation;
        delete robot.orientation;
    }
};

},{"./constants.js":1,"./exceptions.js":10,"./translator.js":48,"./utils/filterint.js":52}],42:[function(require,module,exports){

require("./rur.js");
require("./translator.js");
require("./visible_world.js");
require("./world.js");
require("./state.js");
require("./zz_dr_blockly.js");
require("./recorder.js");
require("./world_init.js");
var clone_world = require("./world/clone_world.js").clone_world;

RUR.runner = {};

RUR.state.code_evaluated = false;

RUR.runner.run = function (playback) {
    var src, fatal_error_found = false;
    if (RUR.state.editing_world && !RUR.state.code_evaluated) {
        RUR._SAVED_WORLD = clone_world(RUR.CURRENT_WORLD);
    }
    if (!RUR.state.code_evaluated) {
        RUR.CURRENT_WORLD = clone_world(RUR._SAVED_WORLD);
        RUR.world_init.set();
        if (RUR.state.input_method === "blockly-py") {
                editor.setValue(Blockly.Python.workspaceToCode(RUR.blockly.workspace));
        } else if (RUR.state.input_method === "blockly-js") {
            editor.setValue(Blockly.JavaScript.workspaceToCode(RUR.blockly.workspace));
        }
        src = editor.getValue();
        fatal_error_found = RUR.runner.eval(src); // jshint ignore:line
    }
    if (!fatal_error_found) {
        try {
            localStorage.setItem("editor", src);
            localStorage.setItem("library", library.getValue());
        } catch (e) {}
        // "playback" is a function called to play back the code in a sequence of frames
        // or a "null function", f(){} can be passed if the code is not
        // dependent on the robot world.
        if (RUR.state.prevent_playback) {
            return;
        }
        playback();
    }
};

RUR.runner.eval = function(src) {  // jshint ignore:line
    var error_name, message, response, other_info, from_python, error;
    other_info = '';

    /* At some point around version 3.2.0, Brython changed the way it
       handled uncaught errors, and no longer pass a "nice" object
       to the surrounding Javascript environment - since this is not
       the way Brython programmers normally do things.   While this
       has been changed back some time after version 3.2.3, we nonetheless
       guard against any future changes by doing our own handling. */

    RUR.__python_error = false;
    try {
        if (RUR.state.programming_language === "javascript") {
            RUR.runner.eval_javascript(src);
        } else if (RUR.state.programming_language === "python") {
            RUR.runner.eval_python(src);
            if (RUR.__python_error) {
                throw RUR.__python_error;
            }
        } else {
            alert("FATAL ERROR: Unrecognized programming language.");
            return true;
        }
    } catch (e) {
        if (RUR.__debug){
            console.dir(e);
        }
        error = {};
        if (RUR.state.programming_language === "python") {
            error.reeborg_shouts = e.reeborg_shouts;
            response = RUR.runner.simplify_python_traceback(e);
            message = response.message;
            other_info = response.other_info;
            error_name = response.error_name;
            error.message = "<h3>" + error_name + "</h3><h4>" +
                                    message + "</h4><p>" + other_info + '</p>';
        } else {
            error_name = e.name;
            message = e.message;
            other_info = '';
            if (e.reeborg_shouts !== undefined) {
                error.message = e.reeborg_shouts;
                error.reeborg_shouts = e.reeborg_shouts;
            }
        }

        if (e.reeborg_shouts !== undefined){
            RUR.record_frame("error", error);
        } else {
            RUR.show_feedback("#Reeborg-shouts",
                                    "<h3>" + error_name + "</h3><h4>" +
                                    message + "</h4><p>" + other_info + '</p>');
            return true;
        }
    }
    RUR.state.code_evaluated = true;
    return false;
};


RUR.runner.eval_javascript = function (src) {
    // do not "use strict"
    var pre_code, post_code;
    pre_code = pre_code_editor.getValue();
    post_code = post_code_editor.getValue();
    RUR.reset_definitions();
    src = pre_code + "\n" + src + "\n" + post_code;
    eval(src); // jshint ignore:line
};


RUR.runner.eval_python = function (src) {
    // do not  "use strict"
    var pre_code, post_code, highlight;
    RUR.reset_definitions();
    pre_code = pre_code_editor.getValue();
    post_code = post_code_editor.getValue();
    translate_python(src, RUR.state.highlight, RUR.state.watch_vars, pre_code, post_code);
};

RUR.runner.simplify_python_traceback = function(e) {
    "use strict";
    var message, error_name, other_info, diagnostic;
    other_info = '';
    if (e.reeborg_shouts === undefined) {
        message = e.$message;
        error_name = e.__name__;
        diagnostic = '';
        switch (error_name) {
            case "SyntaxError":
                try {
                    other_info = RUR.runner.find_line_number(e.args[1][3]);
                    if (RUR.runner.check_colons(e.args[1][3])) {
                        other_info += RUR.translate("<br>Perhaps a missing colon is the cause.");
                    } else if (RUR.runner.check_func_parentheses(e.args[1][3])){
                        other_info += RUR.translate("<br>Perhaps you forgot to add parentheses ().");
                    }
                } catch (e) { // jshint ignore:line
                    other_info = "I could not analyze this error; you might want to contact my programmer with a description of this problem.";
                }
                break;
            case "IndentationError":
                message = RUR.translate("The code is not indented correctly.");
                try {
                    other_info = RUR.runner.find_line_number(e.args[1][3]);
                    if (e.args[1][3].indexOf("RUR.set_lineno_highlight([") == -1){
                        other_info += "<br><code>" + e.args[1][3] + "</code>";
                    }
                } catch (e) {  // jshint ignore:line
                    other_info = "I could not analyze this error; you might want to contact my programmer with a description of this problem.";
                }
                break;
            case "NameError":
                try {
                    other_info = RUR.runner.find_line_number(message);
                    other_info += RUR.translate("<br>Perhaps you misspelled a word or forgot to define a function or a variable.");
                } catch (e) {  // jshint ignore:line
                    other_info = "I could not analyze this error; you might want to contact my programmer.";
                }
                break;
            case "Internal Javascript error: SyntaxError":
            case "Internal Javascript error: TypeError":
                error_name = "Invalid Python Code";
                message = '';
                other_info = RUR.translate("I cannot help you with this problem.");
                break;
            default:
                other_info = "";
        }
    } else {
        message = e.reeborg_shouts;
        if (e.__name__ === undefined) {
            error_name = "ReeborgError";
        } else {
            error_name = e.__name__;
        }
    }
    return {message:message, other_info:other_info, error_name:error_name};
};


RUR.runner.find_line_number = function(bad_code) {
    /** With the possibility of having code inserted by the highlighting routine,
        with some pre-code, and with Brython not counting empty lines at the
        beginning of a program, it is more reliable to scan the source code
        for the offending code as identified by Brython and see if it occurs
        only once in the user's program */
    var lines, found, i, lineno;
    if (bad_code.indexOf("RUR.set_lineno_highlight([") != -1){
        bad_code = bad_code.replace("RUR.set_lineno_highlight([", "");
        lines = bad_code.split("]");
        lineno = lines[0] + 1;
        return RUR.translate("Error found at or near line {number}.").supplant({number: lineno.toString()});
    }
    lines = editor.getValue().split("\n");
    found = false;
    lineno = false;
    for (i=0; i<lines.length; i++) {
        try {
        } catch (e) {
            return '';
        }
         if(lines[i].indexOf(bad_code) != -1){
            if (found){
                return '';   // found the offending code twice; can not rely on this
            } else {
                found = true;
                lineno = i+1;
            }
        }
    }
    if (lineno) {
        return RUR.translate("Error found at or near line {number}.").supplant({number: lineno.toString()});
    }
    return '';
};


RUR.runner.check_colons = function(line_of_code) {
    var tokens, line, nb_token;
    tokens = ['if ', 'if(', 'else', 'elif ','elif(','while ','while(',
              'for ','for(', 'def '];
    for (nb_token=0; nb_token < tokens.length; nb_token++){
        if (line_of_code.indexOf(tokens[nb_token]) != -1){
            if (line_of_code.indexOf(":") == -1){
                return true;    // missing colon
            }
        }
    }
    return false;  // no missing colon
};

RUR.runner.check_func_parentheses = function(line_of_code) {
    if (line_of_code.indexOf('def') != -1){
        if (line_of_code.indexOf("(") == -1){
            return true;    // missing parentheses
        }
    }
    return false;  // no missing parentheses
};

},{"./recorder.js":38,"./rur.js":43,"./state.js":45,"./translator.js":48,"./visible_world.js":58,"./world.js":59,"./world/clone_world.js":60,"./world_init.js":66,"./zz_dr_blockly.js":75}],43:[function(require,module,exports){
/** @namespace RUR */         // for jsdoc
window.RUR = RUR || {}; // RUR could be already be defined in the html file

RUR.BACKGROUND_IMAGE = new Image();
RUR.BACKGROUND_IMAGE.src = '';

RUR._NB_IMAGES_TO_LOAD = 0;
RUR._NB_IMAGES_LOADED = 0;
RUR._BASE_URL = '';
RUR.INCREMENT_LOADED_FN = function () {
    RUR._NB_IMAGES_LOADED += 1;
};

RUR.show_feedback = function (element, content) {
    $(element).html(content).dialog("open");
};

},{}],44:[function(require,module,exports){
/* Once everything is loaded, we need to decide which UI to show.
   The priority is determined by:

   1. information encoded in the URL.
   2. any previously saved state.
   3. site defaults
*/

require("./listeners/add_listeners.js");
require("./utils/parseuri.js");
require("./world/import_world.js");
require("./storage.js");
require("./state.js");

function start_session () {
    "use strict";
    RUR.state.session_initialized = false;
    var url_query = parseUri(window.location.href);
    set_language(url_query);
    set_mode(url_query);
    set_editor();
    set_library();
    // The world can include some content for the editor and/or the library
    set_world(url_query);
    RUR.state.session_initialized = true;
}
start_session();

function set_language (url_query) {
    "use strict";
    var lang;
    if (url_query.queryKey.lang !== undefined) {
        lang = url_query.queryKey.lang;
    } else if (localStorage.getItem("human_language")) {
        lang = localStorage.getItem("human_language");
    } else {
        lang = 'en';
    }

    document.getElementById('human-language').value = lang;
    $("#human-language").change();
}

function set_mode (url_query) {
    "use strict";
    var mode;
    if (url_query.queryKey.mode !== undefined) {
        mode = url_query.queryKey.mode;
    } else if (localStorage.getItem("programming-mode")) {
        mode = localStorage.getItem("programming-mode");
    } else {
        mode = 'python';
    }

    document.getElementById('programming-mode').value = mode;
    $("#programming-mode").change();
}

function set_editor() {
    if (localStorage.getItem("editor")){
        editor.setValue(localStorage.getItem("editor"));
    } else {
        editor.setValue(RUR.translate("move") + "()");
    }
}

function set_library() {
    if (localStorage.getItem("library")){
        library.setValue(localStorage.getItem("library"));
    } else {
        library.setValue(RUR.translate("# from library import *"));
    }
}

function set_world(url_query) {
    if (url_query.queryKey.world !== undefined) {
        RUR.world.import_world(decodeURIComponent(url_query.queryKey.world));
        RUR.storage.save_world(RUR.translate("PERMALINK"));
    } else if (localStorage.getItem("world")) {
        try {
            RUR.world_select.set_url(
                RUR.world_select.url_from_shortname(
                    localStorage.getItem("world"))
                );
        } catch (e) {
            RUR.world_select.set_default();
        }
    }
}

},{"./listeners/add_listeners.js":18,"./state.js":45,"./storage.js":46,"./utils/parseuri.js":55,"./world/import_world.js":63}],45:[function(require,module,exports){
/* Yes, I know, global variables are a terrible thing.
   And, in a sense, the following are global variables recording a given
   state.  However, by using this convention and documentating them in a
   single place, it helps in avoiding the creation of inconsistent states.*/

require("./rur.js");
require("./translator.js");

RUR.state = {};
RUR.state.code_evaluated = false;
RUR.state.do_not_record = false;
RUR.state.editing_world = false;
RUR.state.highlight = true;
RUR.state.human_language = "en";
RUR.state.input_method = "python";
RUR.state.programming_language = "javascript"; // default for testing
RUR.state.playback = false;
RUR.state.prevent_playback = false;
RUR.state.ready = false;
RUR.state.session_initialized = false;
RUR.state.sound_id = undefined;
RUR.state.sound_on = false;
RUR.state.specific_object = undefined;
RUR.state.stop_called = false;
RUR.state.watch_vars = false;
RUR.state.x = undefined;
RUR.state.y = undefined;


// TODO: create RUR.state.do_highlight()
// this would be to combine all the flags required to have highlighting on

// TODO: after simplifying the permalink, see if RUR.state.prevent_playback
// is still needed.

},{"./rur.js":43,"./translator.js":48}],46:[function(require,module,exports){

require("./rur.js");
require("./translator.js");
require("./world_select.js");


var export_world = require("./world/export_world.js").export_world;
var clone_world = require("./world/clone_world.js").clone_world;


RUR.storage = {};

RUR.storage._save_world = function (name){
    "use strict";
    if (localStorage.getItem("user_world:" + name) !== null){
        if (!window.confirm(RUR.translate("Name already exist; confirm that you want to replace its content."))){
            return;
        }
        // replace existing
        localStorage.setItem("user_world:"+ name, export_world(RUR.CURRENT_WORLD));
    } else {
        RUR.storage.save_world(name);
    }
    RUR._SAVED_WORLD = clone_world();
};

RUR.storage.save_world = function (name){
    "use strict";
    var url = "user_world:"+ name;
    localStorage.setItem(url, export_world(RUR.CURRENT_WORLD));
    RUR.storage.append_world_name(name);
};

RUR.storage.append_world_name = function (name){
    "use strict";
    var url = "user_world:"+ name;
    RUR.storage.appending_world_name_flag = true;
    RUR.world_select.append_world({url:url, shortname:name, local_storage:true});
    RUR.world_select.set_url(url);  // reload as updating select choices blanks the world.

    /* appends name to world selector and to list of possible worlds to delete */
    $('#delete-world h3').append(
        '<button class="blue-gradient inline-block" onclick="RUR.storage.delete_world(' +
            "'"+ name + "'" + ');$(this).remove()"">' + RUR.translate('Delete ') + name + '</button>');
    $('#delete-world').show();
};

RUR.storage.delete_world = function (name){
    "use strict";
    var i, key;
    localStorage.removeItem("user_world:" + name);
    $("select option[value='" + "user_world:" + name +"']").remove();

    try {
        RUR.world_select.set_url(
            RUR.world_select.url_from_shortname(
                localStorage.getItem("world"))
            );
    } catch (e) {
        RUR.world_select.set_default();
    }

    for (i = localStorage.length - 1; i >= 0; i--) {
        key = localStorage.key(i);
        if (key.slice(0, 11) === "user_world:") {
            return;
        }
    }
    $('#delete-world').hide();
};

},{"./rur.js":43,"./translator.js":48,"./world/clone_world.js":60,"./world/export_world.js":62,"./world_select.js":67}],47:[function(require,module,exports){
/* Intended to provide information about objects carried by robot */
require("./rur.js");
require("./world_editor.js");

RUR.tooltip = {};

RUR.tooltip.init = function () {  // call in zzz.doc_ready.js
    RUR.tooltip.canvas = document.getElementById("tooltip");
    RUR.tooltip.ctx = RUR.tooltip.canvas.getContext("2d");

    // request mousemove events
    $("#robot-canvas").mousemove(function (evt) {
        RUR.mouse_x = evt.pageX;
        RUR.mouse_y = evt.pageY;
        RUR.tooltip.handleMouseMove(evt);
    });
};


RUR.tooltip.handleMouseMove = function handleMouseMove(evt) {
    var x, y, hit, position, world, robot, mouse_above_robot, image, nb_obj;
    var size = 40, objects_carried;

    world = RUR.CURRENT_WORLD;
    x = evt.pageX - $("#robot-canvas").offset().left;
    y = evt.pageY - $("#robot-canvas").offset().top;
    position = RUR.we.calculate_grid_position();
    RUR.tooltip.canvas.style.left = "-200px";
    if (!RUR.we.mouse_contained_flag) {
        return;
    }

    //mouse_above_robot = false;
    if (world.robots !== undefined) {
        for (i=0; i < world.robots.length; i++) {
            robot = world.robots[i];
            if (robot.start_positions === undefined) {
                robot.start_positions = [[robot.x, robot.y]];
            }
            for (j=0; j < robot.start_positions.length; j++){
                pos = robot.start_positions[j];
                if(pos[0]==position[0] && pos[1]==position[1]){
                    mouse_above_robot = true;
                    if (robot.objects !== undefined){
                        objects_carried = Object.keys(robot.objects);
                        break;
                    }
                }
            }
            if (mouse_above_robot) {
                break;
            }
        }
    }

    RUR.tooltip.canvas.height = size;
    if (objects_carried !== undefined) {
        RUR.tooltip.canvas.width = size*Math.max(objects_carried.length, 1);
    } else {
        RUR.tooltip.canvas.width = size;
        objects_carried = [];
    }
    if (mouse_above_robot){
        RUR.tooltip.canvas.style.left = x+20 + "px";
        RUR.tooltip.canvas.style.top = y + "px";
        RUR.tooltip.ctx.clearRect(0, 0, RUR.tooltip.canvas.width, RUR.tooltip.canvas.height);
        for (i=0; i < objects_carried.length; i++){
            image = RUR.OBJECTS[objects_carried[i]].image;
            nb_obj = robot.objects[objects_carried[i]];
            if (nb_obj == "infinite" || nb_obj == Infinity) {
                nb_obj = "∞";
            }
            RUR.tooltip.ctx.drawImage(image, i*size, 0, image.width, image.height);
            RUR.tooltip.ctx.fillText(nb_obj, i*size+1, size-1);
        }
    }
};

},{"./rur.js":43,"./world_editor.js":64}],48:[function(require,module,exports){
require("./rur.js");
require("./utils/supplant.js");

RUR.translate = function (s) {
    if (RUR.translation !== undefined && RUR.translation[s] !== undefined) {
        return RUR.translation[s];
    } else {
        console.log("Translation needed for");
        console.log("%c" + s, "color:blue;font-weight:bold;");
        return s;
    }
};

RUR.translate_to_english = function (s) {
    if (RUR.translation_to_english[s] !== undefined) {
        return RUR.translation_to_english[s];
    } else {
        console.log("Translation to English needed for");
        console.log("%c" + s, "color:green;font-weight:bold;");
        return s;
    }
};

},{"./rur.js":43,"./utils/supplant.js":56}],49:[function(require,module,exports){

require("./../rur.js");

exports.toggle = function () {
    if ("robots" in RUR.CURRENT_WORLD &&
        RUR.CURRENT_WORLD.robots.length > 0) {
        $(".robot-absent").hide();
        $(".robot-present").show();
    } else {
        $(".robot-absent").show();
        $(".robot-present").hide();
    }
};

},{"./../rur.js":43}],50:[function(require,module,exports){

require("./../state.js");

exports.set_ready_to_run = set_ready_to_run = function () {
    RUR.state.prevent_playback = false;
    $("#stop").attr("disabled", "true");
    $("#pause").attr("disabled", "true");
    $("#run").removeAttr("disabled");
    $("#step").removeAttr("disabled");
    $("#reverse-step").attr("disabled", "true");
    $("#reload").attr("disabled", "true");
};

set_ready_to_run();

},{"./../state.js":45}],51:[function(require,module,exports){
;
// from http://stackoverflow.com/questions/15005500/loading-cross-domain-html-page-with-jquery-ajax

// will modify a global object - no need to export anything.
$.ajaxPrefilter( function (options) {
  if (options.crossDomain && jQuery.support.cors) {
    var http = (window.location.protocol === 'http:' ? 'http:' : 'https:');
    options.url = http + '//cors-anywhere.herokuapp.com/' + options.url;
  }
});

},{}],52:[function(require,module,exports){
/* filterInt adapted from
https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/parseInt
*/

exports.filterInt = function (value) {
  if(/^(\-|\+)?([0-9]+|Infinity)$/.test(value))
    return Number(value);
  return undefined;
};

},{}],53:[function(require,module,exports){
/*
    Original script title: "Object.identical.js"; version 1.12
    Copyright (c) 2011, Chris O'Brien, prettycode.org
    http://github.com/prettycode/Object.identical.js

    Modified to assume that order of arrays is irrelevant
    (which it should be since this is meant to be used to
    compare worlds.)  Also adapted to ignore empty objects
    when doing comparison; for worlds, only non-empty objects
    are meaningful and can be compared.
*/

exports.identical = function (a, b) {

    function sort(object) {
        if (Array.isArray(object)) {
            return object.sort();
        }
        else if (typeof object !== "object" || object === null) {
            return object;
        } else if (Object.keys(object).length === 0){
            return undefined;
        }

        return Object.keys(object).sort().map(function(key) {
            return {
                key: key,
                value: sort(object[key])
            };
        });
    }

    return JSON.stringify(sort(a)) === JSON.stringify(sort(b));
};

},{}],54:[function(require,module,exports){
require("./../rur.js");
RUR._ensure_key_exists = function(obj, key){
    "use strict";
    if (obj[key] === undefined){
        obj[key] = {};
    }
};

},{"./../rur.js":43}],55:[function(require,module,exports){
// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri (str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
}

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

window.parseUri = parseUri;

},{}],56:[function(require,module,exports){
// adapted from http://javascript.crockford.com/remedial.html

// will modify a global object - no need to export anything.

String.prototype.supplant = function (o) {
    return this.replace(
        /\{([^{}]*)\}/g,
        function (a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};

},{}],57:[function(require,module,exports){

require("./constants.js");
require("./state.js");
// TODO: RUR._BASE_URL -> need to change it to state...

RUR.vis_robot = {};
RUR.vis_robot.images = [{}, {}, {}, {}];

// we will keep track if we have loaded all images
RUR.vis_robot.loaded_images = 0;
RUR.vis_robot.nb_images = 0;

RUR._BASE_URL = RUR._BASE_URL || '';  // enable changing defaults for unit tests

// classic
RUR.vis_robot.images[0].robot_e_img = new Image();
RUR.vis_robot.images[0].robot_e_img.src = RUR._BASE_URL + '/src/images/robot_e.png';
RUR.vis_robot.images[0].robot_n_img = new Image();
RUR.vis_robot.images[0].robot_n_img.src = RUR._BASE_URL + '/src/images/robot_n.png';
RUR.vis_robot.images[0].robot_w_img = new Image();
RUR.vis_robot.images[0].robot_w_img.src = RUR._BASE_URL + '/src/images/robot_w.png';
RUR.vis_robot.images[0].robot_s_img = new Image();
RUR.vis_robot.images[0].robot_s_img.src = RUR._BASE_URL + '/src/images/robot_s.png';
RUR.vis_robot.images[0].robot_random_img = new Image();
RUR.vis_robot.images[0].robot_random_img.src = RUR._BASE_URL + '/src/images/robot_random.png';

// rover type
RUR.vis_robot.images[1].robot_e_img = new Image();
RUR.vis_robot.images[1].robot_e_img.src = RUR._BASE_URL + '/src/images/rover_e.png';
RUR.vis_robot.images[1].robot_n_img = new Image();
RUR.vis_robot.images[1].robot_n_img.src = RUR._BASE_URL + '/src/images/rover_n.png';
RUR.vis_robot.images[1].robot_w_img = new Image();
RUR.vis_robot.images[1].robot_w_img.src = RUR._BASE_URL + '/src/images/rover_w.png';
RUR.vis_robot.images[1].robot_s_img = new Image();
RUR.vis_robot.images[1].robot_s_img.src = RUR._BASE_URL + '/src/images/rover_s.png';
RUR.vis_robot.images[1].robot_random_img = new Image();
RUR.vis_robot.images[1].robot_random_img.src = RUR._BASE_URL + '/src/images/rover_random.png';

// 3d red type
RUR.vis_robot.images[2].robot_e_img = new Image();
RUR.vis_robot.images[2].robot_e_img.src = RUR._BASE_URL + '/src/images/plain_e.png';
RUR.vis_robot.images[2].robot_n_img = new Image();
RUR.vis_robot.images[2].robot_n_img.src = RUR._BASE_URL + '/src/images/plain_n.png';
RUR.vis_robot.images[2].robot_w_img = new Image();
RUR.vis_robot.images[2].robot_w_img.src = RUR._BASE_URL + '/src/images/plain_w.png';
RUR.vis_robot.images[2].robot_s_img = new Image();
RUR.vis_robot.images[2].robot_s_img.src = RUR._BASE_URL + '/src/images/plain_s.png';
RUR.vis_robot.images[2].robot_random_img = new Image();
RUR.vis_robot.images[2].robot_random_img.src = RUR._BASE_URL + '/src/images/robot_random.png';

// solar panel type
RUR.vis_robot.images[3].robot_e_img = new Image();
RUR.vis_robot.images[3].robot_e_img.src = RUR._BASE_URL + '/src/images/sp_e.png';
RUR.vis_robot.images[3].robot_n_img = new Image();
RUR.vis_robot.images[3].robot_n_img.src = RUR._BASE_URL + '/src/images/sp_n.png';
RUR.vis_robot.images[3].robot_w_img = new Image();
RUR.vis_robot.images[3].robot_w_img.src = RUR._BASE_URL + '/src/images/sp_w.png';
RUR.vis_robot.images[3].robot_s_img = new Image();
RUR.vis_robot.images[3].robot_s_img.src = RUR._BASE_URL + '/src/images/sp_s.png';
RUR.vis_robot.images[3].robot_random_img = new Image();
RUR.vis_robot.images[3].robot_random_img.src = RUR._BASE_URL + '/src/images/robot_random.png';

RUR.vis_robot.style = 0;

RUR.select_default_robot_model = function (arg) {
    var style;
    style = parseInt(arg, 10);
    if ( !(style ===0 || style==1 || style==2 || style==3)){
        style = 0;
    }
    RUR.vis_robot.style = style;
    RUR.vis_robot.e_img = RUR.vis_robot.images[style].robot_e_img;
    RUR.vis_robot.n_img = RUR.vis_robot.images[style].robot_n_img;
    RUR.vis_robot.w_img = RUR.vis_robot.images[style].robot_w_img;
    RUR.vis_robot.s_img = RUR.vis_robot.images[style].robot_s_img;
    RUR.vis_robot.random_img = RUR.vis_robot.images[style].robot_random_img;
    if (RUR.vis_world !== undefined) {
        RUR.vis_world.refresh();
    }

    localStorage.setItem("robot_default_model", style);
};
RUR.select_default_robot_model(localStorage.getItem("robot_default_model"));

// the following is to try to ensure that the images are loaded before the "final"
// original drawing is made

RUR.vis_robot.e_img.onload = function () {
    RUR.vis_robot.loaded_images += 1;
};
RUR.vis_robot.nb_images += 1;
RUR.vis_robot.w_img.onload = function () {
    RUR.vis_robot.loaded_images += 1;
};
RUR.vis_robot.nb_images += 1;
RUR.vis_robot.n_img.onload = function () {
    RUR.vis_robot.loaded_images += 1;
};
RUR.vis_robot.nb_images += 1;
RUR.vis_robot.s_img.onload = function () {
    RUR.vis_robot.loaded_images += 1;
};
RUR.vis_robot.nb_images += 1;
RUR.vis_robot.random_img.onload = function () {
    RUR.vis_robot.loaded_images += 1;
};
RUR.vis_robot.nb_images += 1;



RUR.vis_robot.draw = function (robot) {
    "use strict";
    var x, y, width, height, image;
    // handling legacy Code
    if (robot.orientation !== undefined) {
        robot._orientation = robot.orientation;
        robot.orientation = null;
    }
    if (!robot) {
        return;
    }
    if (robot.x > RUR.COLS || robot.y > RUR.ROWS) {
        return;
    }

    // all images are taken to be centered on a tile 40x40, which are scaled
    //  appropriately
    width = RUR.TILE_SIZE * RUR.SCALE;
    height = RUR.TILE_SIZE * RUR.SCALE;

    x = robot.x*RUR.WALL_LENGTH + RUR.WALL_THICKNESS/2;
    y = RUR.HEIGHT - (robot.y+1)*RUR.WALL_LENGTH + RUR.WALL_THICKNESS/2;

    switch(robot._orientation){
        case RUR.EAST:
            if (robot.model !== undefined){
                image = RUR.vis_robot.images[robot.model].robot_e_img;
            } else {
                image = RUR.vis_robot.e_img;
            }
            break;
        case RUR.NORTH:
            if (robot.model !== undefined){
                image = RUR.vis_robot.images[robot.model].robot_n_img;
            } else {
                image = RUR.vis_robot.n_img;
            }
            break;
        case RUR.WEST:
            if (robot.model !== undefined){
                image = RUR.vis_robot.images[robot.model].robot_w_img;
            } else {
                image = RUR.vis_robot.w_img;
            }
            break;
        case RUR.SOUTH:
            if (robot.model !== undefined){
                image = RUR.vis_robot.images[robot.model].robot_s_img;
            } else {
                image = RUR.vis_robot.s_img;
            }
            break;
        case -1:
            if (robot.model !== undefined){
                image = RUR.vis_robot.images[robot.model].robot_random_img;
            } else {
                image = RUR.vis_robot.random_img;
            }
            break;
        default:
            image = RUR.vis_robot.e_img;
        }
    RUR.ROBOT_CTX.drawImage(image, x, y, width, height);
    if (RUR.state.editing_world){
        return;
    }
    RUR.vis_robot.draw_trace(robot);
};


RUR.vis_robot.draw_trace = function (robot) {
    "use strict";
    if (robot === undefined || robot._is_leaky === false || robot._orientation === -1) {
        return;
    }
    if (robot.x > RUR.COLS || robot.y > RUR.ROWS) {
        return;
    }
    var ctx = RUR.TRACE_CTX;
    if (robot.trace_color !== undefined){
        ctx.strokeStyle = robot.trace_color;
    } else {
        ctx.strokeStyle = RUR.vis_robot.trace_color;
    }

    // overrides user choice for large world (small grid size)
    if(RUR.CURRENT_WORLD.small_tiles) {
        RUR.vis_robot.trace_offset = [[12, 12], [12, 12], [12, 12], [12, 12]];
        RUR.vis_robot.trace_thickness = 2;
    } else {
        RUR.vis_robot.set_trace_style(RUR.TRACE_STYLE, robot);
    }

    ctx.lineWidth = RUR.vis_robot.trace_thickness;
    ctx.lineCap = "round";

    ctx.beginPath();
    // ensure that _prev_orientation and orientation are within bounds as these could be messed
    // up by a user program and crash the robot program with a message sent to the console and nothing else.
    ctx.moveTo(robot._prev_x* RUR.WALL_LENGTH + RUR.vis_robot.trace_offset[robot._prev_orientation%4][0],
                    RUR.HEIGHT - (robot._prev_y +1) * RUR.WALL_LENGTH + RUR.vis_robot.trace_offset[robot._prev_orientation%4][1]);
    ctx.lineTo(robot.x* RUR.WALL_LENGTH + RUR.vis_robot.trace_offset[robot._orientation%4][0],
                    RUR.HEIGHT - (robot.y +1) * RUR.WALL_LENGTH + RUR.vis_robot.trace_offset[robot._orientation%4][1]);
    ctx.stroke();
};

RUR.vis_robot.set_trace_style = function (choice, robot){
    "use strict";
    if (choice === undefined) {
        return;
    }
    RUR.TRACE_STYLE = choice;
    if (robot !== undefined && robot.trace_style !== undefined){
        choice = robot.trace_style;
    }
    if (choice === "thick") {
        RUR.vis_robot.trace_offset = [[25, 25], [25, 25], [25, 25], [25, 25]];
        RUR.vis_robot.trace_color = RUR.DEFAULT_TRACE_COLOR;
        RUR.vis_robot.trace_thickness = 4;
    } else if (choice === "invisible") {
        RUR.vis_robot.trace_color = "rgba(0,0,0,0)";
    } else if (choice === "default") {
        RUR.vis_robot.trace_offset = [[30, 30], [30, 20], [20, 20], [20, 30]];
        RUR.vis_robot.trace_color = RUR.DEFAULT_TRACE_COLOR;
        RUR.vis_robot.trace_thickness = 1;
    }
};

RUR.vis_robot.set_trace_style("default");

},{"./constants.js":1,"./state.js":45}],58:[function(require,module,exports){

/*jshint  -W002, browser:true, devel:true, indent:4, white:false, plusplus:false */
/*globals RUR*/

require("./translator.js");
require("./constants.js");
require("./state.js");

RUR.vis_world = {};

RUR.vis_world.refresh_world_edited = function () {
    RUR.vis_world.draw_all();
    RUR.world_get.world_info();
};

RUR.vis_world.compute_world_geometry = function (cols, rows) {
    "use strict";
    var height, width;
    if (RUR.CURRENT_WORLD.small_tiles) {
        RUR.WALL_LENGTH = 20;
        RUR.WALL_THICKNESS = 2;
        RUR.SCALE = 0.5;
    } else {
        RUR.WALL_LENGTH = 40;
        RUR.WALL_THICKNESS = 4;
        RUR.SCALE = 1;
    }

    if (cols !== undefined && rows !== undefined) {
        height = (rows + 1.5) * RUR.WALL_LENGTH;
        width = (cols + 1.5) * RUR.WALL_LENGTH;
    } else {
        height = (RUR.ROWS + 1.5) * RUR.WALL_LENGTH;
        width = (RUR.COLS + 1.5) * RUR.WALL_LENGTH;
    }

    if (height !== RUR.HEIGHT || width !== RUR.WIDTH) {
        RUR.BACKGROUND_CANVAS = document.getElementById("background-canvas");
        RUR.BACKGROUND_CANVAS.width = width;
        RUR.BACKGROUND_CANVAS.height = height;
        RUR.SECOND_LAYER_CANVAS = document.getElementById("second-layer-canvas");
        RUR.SECOND_LAYER_CANVAS.width = width;
        RUR.SECOND_LAYER_CANVAS.height = height;
        RUR.GOAL_CANVAS = document.getElementById("goal-canvas");
        RUR.GOAL_CANVAS.width = width;
        RUR.GOAL_CANVAS.height = height;
        RUR.OBJECTS_CANVAS = document.getElementById("objects-canvas");
        RUR.OBJECTS_CANVAS.width = width;
        RUR.OBJECTS_CANVAS.height = height;
        RUR.TRACE_CANVAS = document.getElementById("trace-canvas");
        RUR.TRACE_CANVAS.width = width;
        RUR.TRACE_CANVAS.height = height;
        RUR.ROBOT_CANVAS = document.getElementById("robot-canvas");
        RUR.ROBOT_CANVAS.width = width;
        RUR.ROBOT_CANVAS.height = height;
        RUR.HEIGHT = height;
        RUR.WIDTH = width;
    }

    // background context may have change - hence wait until here
    // to set
    if (RUR.CURRENT_WORLD.small_tiles) {
        RUR.BACKGROUND_CTX.font = "8px sans-serif";
    } else {
        RUR.BACKGROUND_CTX.font = "bold 12px sans-serif";
    }

    RUR.ROWS = Math.floor(RUR.HEIGHT / RUR.WALL_LENGTH) - 1;
    RUR.COLS = Math.floor(RUR.WIDTH / RUR.WALL_LENGTH) - 1;
    RUR.CURRENT_WORLD.rows = RUR.ROWS;
    RUR.CURRENT_WORLD.cols = RUR.COLS;
    RUR.vis_world.draw_all();
};

RUR.vis_world.draw_all = function () {
    "use strict";

    if (RUR.CURRENT_WORLD.blank_canvas) {
        if (RUR.state.editing_world) {
            RUR.show_feedback("#Reeborg-shouts",
                                RUR.translate("Editing of blank canvas is not supported."));
            return;
         }
        clearTimeout(RUR.ANIMATION_FRAME_ID);
        RUR.ANIMATION_FRAME_ID = undefined;
        RUR.BACKGROUND_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        RUR.SECOND_LAYER_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        RUR.GOAL_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        RUR.OBJECTS_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        RUR.TRACE_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        RUR.ROBOT_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        return;
    }

    RUR.BACKGROUND_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
    RUR.animated_tiles = false;

    if (RUR.state.editing_world) {
        if (RUR.BACKGROUND_IMAGE.src) {
            RUR.vis_world.draw_single_object(RUR.BACKGROUND_IMAGE, 1, RUR.ROWS, RUR.BACKGROUND_CTX);
        }
        RUR.vis_world.draw_grid_walls();  // on BACKGROUND_CTX
    } else {
        RUR.vis_world.draw_grid_walls();
        if (RUR.BACKGROUND_IMAGE.src) {
            RUR.vis_world.draw_single_object(RUR.BACKGROUND_IMAGE, 1, RUR.ROWS, RUR.BACKGROUND_CTX);
        }
    }

    RUR.vis_world.draw_coordinates(); // on BACKGROUND_CTX

    RUR.TRACE_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);

    RUR.GOAL_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
    RUR.vis_world.draw_goal();  // on GOAL_CTX

    RUR.vis_world.refresh();
};


RUR.vis_world.refresh = function () {
    "use strict";
    // meant to be called at each step
    // does not draw background (i.e. coordinates and grid walls)
    // does not draw goals - they should not change during a running program
    // does not clear trace

    // start by clearing all the relevant contexts first.
    // some objects are drown on their own contexts.
    RUR.OBJECTS_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
    RUR.ROBOT_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
    RUR.SECOND_LAYER_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);

    // animated tiles are redrawn according to their own schedule
    if (!RUR.animated_tiles) {
        RUR.vis_world.draw_animated_tiles(); // on BACKGROUND_CTX
    }
    RUR.vis_world.draw_tiles(RUR.CURRENT_WORLD.tiles); // on BACKGROUND_CTX

    if (RUR.__debug) {
        RUR.vis_world.sanity_check(0);
    }
    RUR.vis_world.draw_foreground_walls(RUR.CURRENT_WORLD.walls); // on OBJECTS_CTX
    RUR.vis_world.draw_all_objects(RUR.CURRENT_WORLD.decorative_objects);
    RUR.vis_world.draw_all_objects(RUR.CURRENT_WORLD.objects);  // on OBJECTS_CTX
        // RUR.vis_world.draw_all_objects also called by draw_goal, and draws on GOAL_CTX
        // and, draws some objects on ROBOT_CTX

    // objects: goal is false, tile is true
    RUR.vis_world.draw_all_objects(RUR.CURRENT_WORLD.solid_objects, false, true); // likely on RUR.SECOND_LAYER_CTX


    RUR.vis_world.draw_robots(RUR.CURRENT_WORLD.robots);  // on ROBOT_CTX
    RUR.vis_world.compile_info();  // on ROBOT_CTX
    RUR.vis_world.draw_info();     // on ROBOT_CTX
    if (RUR.__debug) {
        RUR.vis_world.sanity_check(100);
    }
};

RUR.vis_world.sanity_check = function(offset) {
    // An intermittent bug sometimes  causes the robot NOT to be drawn.
    // This sanity check is, enabled when the debug option is turned on,
    // is performed so as to see if any unexpected
    // canvas clearing occurs.

    RUR.BACKGROUND_CTX.fillStyle = "red";
    RUR.SECOND_LAYER_CTX.fillStyle = "green";
    RUR.GOAL_CTX.fillStyle = "yellow";
    RUR.OBJECTS_CTX.fillStyle = "blue";
    RUR.TRACE_CTX.fillStyle = "cyan";
    RUR.ROBOT_CTX.fillStyle = "magenta";

    RUR.BACKGROUND_CTX.fillRect(0+offset, 0, 10, 10);
    RUR.SECOND_LAYER_CTX.fillRect(10+offset, 0, 10, 10);
    RUR.GOAL_CTX.fillRect(20+offset, 0, 10, 10);
    RUR.OBJECTS_CTX.fillRect(30+offset, 0, 10, 10);
    RUR.TRACE_CTX.fillRect(40+offset, 0, 10, 10);
    RUR.ROBOT_CTX.fillRect(50+offset, 0, 10, 10);
};


RUR.vis_world.draw_coordinates = function() {
    "use strict";
    var x, y, ctx = RUR.BACKGROUND_CTX;

    ctx.fillStyle = RUR.COORDINATES_COLOR;
    y = RUR.HEIGHT + 5 - RUR.WALL_LENGTH/2;
    for(x=1; x <= RUR.COLS; x++){
        ctx.fillText(x, (x+0.5)*RUR.WALL_LENGTH, y);
    }
    x = RUR.WALL_LENGTH/2 -5;
    for(y=1; y <= RUR.ROWS; y++){
        ctx.fillText(y, x, RUR.HEIGHT - (y+0.3)*RUR.WALL_LENGTH);
    }

    ctx.fillStyle = RUR.AXIS_LABEL_COLOR;
    ctx.fillText("x", RUR.WIDTH/2, RUR.HEIGHT - 10);
    ctx.fillText("y", 5, RUR.HEIGHT/2 );
};


RUR.vis_world.draw_grid_walls = function(){
    var i, j, ctx;
    if (RUR.state.editing_world) {
        ctx = RUR.GOAL_CTX;     // have the appear above the tiles while editing
    } else {
        ctx = RUR.BACKGROUND_CTX;
    }

    ctx.fillStyle = RUR.SHADOW_WALL_COLOR;
    for (i = 1; i <= RUR.COLS; i++) {
        for (j = 1; j <= RUR.ROWS; j++) {
            RUR.vis_world.draw_north_wall(ctx, i, j);
            RUR.vis_world.draw_east_wall(ctx, i, j);
        }
    }
};

RUR.vis_world.draw_foreground_walls = function (walls) {
    "use strict";
    var keys, key, i, j, k, ctx = RUR.OBJECTS_CTX;


    // border walls (x and y axis)
    ctx.fillStyle = RUR.WALL_COLOR;
    for (j = 1; j <= RUR.ROWS; j++) {
        RUR.vis_world.draw_east_wall(ctx, 0, j);
    }
    for (i = 1; i <= RUR.COLS; i++) {
        RUR.vis_world.draw_north_wall(ctx, i, 0);
    }
    for (j = 1; j <= RUR.ROWS; j++) {
        RUR.vis_world.draw_east_wall(ctx, RUR.COLS, j);
    }
    for (i = 1; i <= RUR.COLS; i++) {
        RUR.vis_world.draw_north_wall(ctx, i, RUR.ROWS);
    }


    if (walls === undefined || walls == {}) {
        return;
    }

    // other walls
    keys = Object.keys(walls);
    for (key=0; key < keys.length; key++){
        k = keys[key].split(",");
        i = parseInt(k[0], 10);
        j = parseInt(k[1], 10);
        if ( walls[keys[key]].indexOf("north") !== -1 &&
            i <= RUR.COLS && j <= RUR.ROWS) {
            RUR.vis_world.draw_north_wall(ctx, i, j);
        }
        if (walls[keys[key]].indexOf("east") !== -1 &&
            i <= RUR.COLS && j <= RUR.ROWS) {
            RUR.vis_world.draw_east_wall(ctx, i, j);
        }
    }
};

RUR.vis_world.draw_north_wall = function(ctx, i, j, goal) {
    "use strict";
    if (goal){
        ctx.strokeStyle = RUR.GOAL_WALL_COLOR;
        ctx.beginPath();
        ctx.rect(i*RUR.WALL_LENGTH, RUR.HEIGHT - (j+1)*RUR.WALL_LENGTH,
                      RUR.WALL_LENGTH + RUR.WALL_THICKNESS, RUR.WALL_THICKNESS);
        ctx.stroke();
        return;
    }
    ctx.fillRect(i*RUR.WALL_LENGTH, RUR.HEIGHT - (j+1)*RUR.WALL_LENGTH,
                      RUR.WALL_LENGTH + RUR.WALL_THICKNESS, RUR.WALL_THICKNESS);
};

RUR.vis_world.draw_east_wall = function(ctx, i, j, goal) {
    "use strict";
    if (goal){
        ctx.strokeStyle = RUR.GOAL_WALL_COLOR;
        ctx.beginPath();
        ctx.rect((i+1)*RUR.WALL_LENGTH, RUR.HEIGHT - (j+1)*RUR.WALL_LENGTH,
                      RUR.WALL_THICKNESS, RUR.WALL_LENGTH + RUR.WALL_THICKNESS);
        ctx.stroke();
        return;
    }
    ctx.fillRect((i+1)*RUR.WALL_LENGTH, RUR.HEIGHT - (j+1)*RUR.WALL_LENGTH,
                      RUR.WALL_THICKNESS, RUR.WALL_LENGTH + RUR.WALL_THICKNESS);
};

RUR.vis_world.draw_robots = function (robots) {
    "use strict";
    var robot;
    if (!robots || robots[0] === undefined) {
        return;
    }
    for (robot=0; robot < robots.length; robot++){
        if (robots[robot].start_positions !== undefined && robots[robot].start_positions.length > 1){
            RUR.vis_world.draw_robot_clones(robots[robot]);
        } else {
            RUR.vis_robot.draw(robots[robot]); // draws trace automatically
        }
    }
};

RUR.vis_world.draw_robot_clones = function(robot){
    "use strict";
    var i, clone;
    RUR.ROBOT_CTX.save();
    RUR.ROBOT_CTX.globalAlpha = 0.4;
    for (i=0; i < robot.start_positions.length; i++){
            clone = JSON.parse(JSON.stringify(robot));
            clone.x = robot.start_positions[i][0];
            clone.y = robot.start_positions[i][1];
            clone._prev_x = clone.x;
            clone._prev_y = clone.y;
            RUR.vis_robot.draw(clone);
    }
    RUR.ROBOT_CTX.restore();
};

RUR.vis_world.draw_goal = function () {
    "use strict";
    var goal, ctx = RUR.GOAL_CTX;

    if (RUR.state.editing_world){  // have to appear above tiles;
        RUR.vis_world.draw_grid_walls();  //  so this is a convenient canvas
    }

    if (RUR.CURRENT_WORLD.goal === undefined) {
        return;
    }

    goal = RUR.CURRENT_WORLD.goal;
    if (goal.position !== undefined) {
        RUR.vis_world.draw_goal_position(goal, ctx);
    }
    if (goal.objects !== undefined){
        RUR.vis_world.draw_all_objects(goal.objects, true);
    }

    if (goal.walls !== undefined){
        RUR.vis_world.draw_goal_walls(goal, ctx);
    }
};


RUR.vis_world.draw_goal_position = function (goal, ctx) {
    "use strict";
    var image, i, g;

    if (goal.position.image !== undefined &&
        typeof goal.position.image === 'string' &&
        RUR.HOME_IMAGES[goal.position.image] !== undefined){
        image = RUR.HOME_IMAGES[goal.position.image].image;
    } else {    // For anyone wondering, this step might be needed only when using older world
                // files that were created when there was not a choice
                // of image for indicating the home position.
        image = RUR.HOME_IMAGES.green_home_tile.image;
    }
    if (goal.possible_positions !== undefined && goal.possible_positions.length > 1){
            ctx.save();
            ctx.globalAlpha = 0.5;
            for (i=0; i < goal.possible_positions.length; i++){
                    g = goal.possible_positions[i];
                    RUR.vis_world.draw_single_object(image, g[0], g[1], ctx);
            }
            ctx.restore();
    } else {
        RUR.vis_world.draw_single_object(image, goal.position.x, goal.position.y, ctx);
    }
};

RUR.vis_world.draw_goal_walls = function (goal, ctx) {
    "use strict";
    var key, keys, i, j, k;
    ctx.fillStyle = RUR.WALL_COLOR;
    keys = Object.keys(goal.walls);
    for (key=0; key < keys.length; key++){
        k = keys[key].split(",");
        i = parseInt(k[0], 10);
        j = parseInt(k[1], 10);
        if ( goal.walls[keys[key]].indexOf("north") !== -1 &&
            i <= RUR.COLS && j <= RUR.ROWS) {
            RUR.vis_world.draw_north_wall(ctx, i, j, true);
        }
        if (goal.walls[keys[key]].indexOf("east") !== -1 &&
            i <= RUR.COLS && j <= RUR.ROWS) {
            RUR.vis_world.draw_east_wall(ctx, i, j, true);
        }
    }
};

RUR.vis_world.clear_trace = function(){
    "use strict";
    // potentially useful as it can be called from a user's program.
    RUR.TRACE_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
};

RUR.vis_world.draw_tiles = function (tiles){
    "use strict";
    var i, j, k, keys, key, image, tile, colour;
    if (tiles === undefined) {
        return;
    }
    keys = Object.keys(tiles);
    for (key=0; key < keys.length; key++){
        k = keys[key].split(",");
        i = parseInt(k[0], 10);
        j = parseInt(k[1], 10);
        if (tiles[keys[key]] !== undefined) {
            tile = RUR.TILES[tiles[keys[key]]];
            if (tile === undefined) {
                colour = tiles[keys[key]];
                RUR.vis_world.draw_coloured_tile(colour, i, j, RUR.BACKGROUND_CTX);
                continue;
            }
        }

        if (tile.choose_image === undefined){
            image = tile.image;
            RUR.vis_world.draw_single_object(image, i, j, RUR.BACKGROUND_CTX);
        }
    }
};

RUR.vis_world.draw_animated_tiles = function (){
    "use strict";
    var i, j, i_j, coords, k, image, tile, tiles;

    tiles = RUR.CURRENT_WORLD.tiles;
    if (tiles === undefined) {
        return;
    }

    RUR.animated_tiles = false;
    coords = Object.keys(tiles);
    for (k=0; k < coords.length; k++){
        i_j = coords[k].split(",");
        i = parseInt(i_j[0], 10);
        j = parseInt(i_j[1], 10);
        tile = RUR.TILES[tiles[coords[k]]];
        if (tile === undefined) {
            continue;
        }
        if (tile.choose_image !== undefined){
            image = tile.choose_image(coords[k]);
            RUR.animated_tiles = true;
            RUR.vis_world.draw_single_object(image, i, j, RUR.BACKGROUND_CTX);
        }
    }
    if (RUR.animated_tiles) {
        clearTimeout(RUR.ANIMATION_FRAME_ID);
        RUR.ANIMATION_FRAME_ID = setTimeout(RUR.vis_world.draw_animated_tiles,
            RUR.ANIMATION_TIME);
    }
};

RUR.vis_world.draw_coloured_tile = function (colour, i, j, ctx) {
    var thick = RUR.WALL_THICKNESS;
    var x, y, size;
    if (i > RUR.COLS || j > RUR.ROWS){
        return;
    }
    x = i*RUR.WALL_LENGTH + thick/2;
    y = RUR.HEIGHT - (j+1)*RUR.WALL_LENGTH + thick/2;
    size = RUR.WALL_LENGTH*RUR.SCALE;
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, size, size);
};


RUR.vis_world.draw_all_objects = function (objects, goal, tile){
    "use strict";
    var i, j, image, ctx, coords, specific_object, objects_here, obj_name, grid_pos;
    if (objects === undefined) {
        return;
    }

    for (coords in objects){
        if (objects.hasOwnProperty(coords)){
            objects_here = objects[coords];
            grid_pos = coords.split(",");
            i = parseInt(grid_pos[0], 10);
            j = parseInt(grid_pos[1], 10);
            if (i <= RUR.COLS && j <= RUR.ROWS) {
                for (obj_name in objects_here){
                    if (objects_here.hasOwnProperty(obj_name)){
                        if (tile){
                            specific_object = RUR.SOLID_OBJECTS[obj_name];
                        } else {
                            specific_object = RUR.OBJECTS[obj_name];
                        }
                        if (goal) {
                            ctx = RUR.GOAL_CTX;
                            image = specific_object.image_goal;
                        } else if (specific_object.ctx !== undefined){
                            ctx = specific_object.ctx;
                            image = specific_object.image;
                        } else {
                            ctx = RUR.OBJECTS_CTX;
                            image = specific_object.image;
                        }
                        RUR.vis_world.draw_single_object(image, i, j, ctx);
                    }
                }
            }
        }
    }
};

RUR.vis_world.draw_single_object = function (image, i, j, ctx) {
    var thick = RUR.WALL_THICKNESS;
    var x, y;
    if (i > RUR.COLS || j > RUR.ROWS){
        return;
    }
    x = i*RUR.WALL_LENGTH + thick/2;
    y = RUR.HEIGHT - (j+1)*RUR.WALL_LENGTH + thick/2;
    try{
       ctx.drawImage(image, x, y, image.width*RUR.SCALE, image.height*RUR.SCALE);
   } catch (e) {
       console.log("problem in draw_single_object", image, ctx);
   }
};



RUR.vis_world.compile_info = function() {
    // compiles the information about objects and goal found at each
    // grid location, so that we can determine what should be
    // drown - if anything.
    var coords, obj, quantity;
    RUR.vis_world.information = {};
    RUR.vis_world.goal_information = {};
    RUR.vis_world.goal_present = false;
    if (RUR.CURRENT_WORLD.goal !== undefined &&
        RUR.CURRENT_WORLD.goal.objects !== undefined) {
        RUR.vis_world.compile_partial_info(RUR.CURRENT_WORLD.goal.objects,
            RUR.vis_world.goal_information, 'goal');
            RUR.vis_world.goal_present = true;
    }


    if (RUR.CURRENT_WORLD.objects !== undefined) {
        RUR.vis_world.compile_partial_info(RUR.CURRENT_WORLD.objects,
            RUR.vis_world.information, 'objects');
    }
};

RUR.vis_world.compile_partial_info = function(objects, information, type){
    "use strict";
    var coords, obj, quantity, color, goal_information;
    if (type=="objects") {
        color = "black";
        goal_information = RUR.vis_world.goal_information;
    } else {
        color = "blue";
    }

    for (coords in objects) {
        if (objects.hasOwnProperty(coords)){
            // objects found here
            for(obj in objects[coords]){
                if (objects[coords].hasOwnProperty(obj)){
                    if (information[coords] !== undefined){
                        // already at least one other object there
                        information[coords] = [undefined, "?"];  // assign impossible object
                    } else {
                        quantity = objects[coords][obj];
                        if (quantity.toString().indexOf("-") != -1) {
                            quantity = "?";
                        } else if (quantity == "all") {
                            quantity = "?";
                        } else {
                            try{
                                quantity = parseInt(quantity, 10);
                            } catch (e) {
                                quantity = "?";
                                console.log("WARNING: this should not happen in RUR.vis_world.compile_info");
                            }
                        }
                        if (RUR.vis_world.goal_present && typeof quantity == 'number' && goal_information !== undefined) {
                            if ( goal_information[coords] !== undefined &&  goal_information[coords][1] == objects[coords][obj]) {
                            information[coords] = [obj, objects[coords][obj], 'green'];
                            } else {
                                information[coords] = [obj, objects[coords][obj], 'red'];
                            }
                        } else {
                            information[coords] = [obj, quantity, color];
                        }
                    }
                }
            }
        }
    }
};

RUR.vis_world.draw_info = function() {
    var i, j, coords, keys, key, info, ctx;
    var scale = RUR.WALL_LENGTH, Y = RUR.HEIGHT, text_width;
    if (RUR.vis_world.information === undefined &&
        RUR.vis_world.goal_information === undefined) {
        return;
    }
    // make sure it appears on top of everything (except possibly robots)
    ctx = RUR.ROBOT_CTX;

    if (RUR.vis_world.information !== undefined) {
        keys = Object.keys(RUR.vis_world.information);
        for (key=0; key < keys.length; key++){
            coords = keys[key].split(",");
            i = parseInt(coords[0], 10);
            j = parseInt(coords[1], 10);
            info = RUR.vis_world.information[coords][1];
            if (i <= RUR.COLS && j <= RUR.ROWS){
                text_width = ctx.measureText(info).width/2;
                ctx.font = RUR.BACKGROUND_CTX.font;
                ctx.fillStyle = RUR.vis_world.information[coords][2];
                // information drawn to left side of object
                ctx.fillText(info, (i+0.2)*scale, Y - (j)*scale);
            }
        }
    }

    if (RUR.vis_world.goal_information !== undefined) {
        keys = Object.keys(RUR.vis_world.goal_information);
        for (key=0; key < keys.length; key++){
            coords = keys[key].split(",");
            i = parseInt(coords[0], 10);
            j = parseInt(coords[1], 10);
            info = RUR.vis_world.goal_information[coords][1];
            if (i <= RUR.COLS && j <= RUR.ROWS){
                text_width = ctx.measureText(info).width/2;
                ctx.font = RUR.BACKGROUND_CTX.font;
                ctx.fillStyle = RUR.vis_world.goal_information[coords][2];
                // information drawn to right side of object
                ctx.fillText(info, (i+0.8)*scale, Y - (j)*scale);
            }
        }
    }
};

},{"./constants.js":1,"./state.js":45,"./translator.js":48}],59:[function(require,module,exports){

require("./translator.js");
require("./constants.js");
require("./robot.js");
require("./visible_world.js");
require("./state.js");
require("./exceptions.js");
edit_robot_menu = require("./ui/edit_robot_menu.js");
var clone_world = require("./world/clone_world.js").clone_world;

RUR.world = {};


/* When a world is edited, as we are about to leave the editing mode,
   a comparison of the world before editing and after is performed.
   If the content of the world before and after has changed, including that
   of the editors, this is taken as an indication that the world should
   perhaps be saved.  Some worlds are saved without having some content in
   the extra editors (perhaps because they were created before new editors
   were added, or since the new cleanup procedure was introduced). To avoid
   erroneous indication that the world content has changed, we use the
   following.
*/
RUR.world.editors_default_values = {
    'pre_code': '"pre code"',
    'post_code': '"post code"',
    'description': 'description',
    'onload': '/* Javascript */'
};

RUR.world.editors_set_default_values = function (world) {
    "use strict";
    var edit, editors;
    editors = RUR.world.editors_default_values;
    for (edit in editors){
        if (!world[edit]){
            world[edit] = editors[edit];
        }
    }
    return world;
};

RUR.world.editors_remove_default_values = function (world) {
    "use strict";
    var edit, editors;
    editors = RUR.world.editors_default_values;
    for (edit in editors) {
        if (world[edit] === undefined) {
            continue;
        }
        if (world[edit] == editors[edit] || world[edit].trim().length < 3) {
            try {
                delete world[edit];
            } catch (e) {}
        }
    }
    return world;
};

RUR.world.update_from_editors = function (world) {
    /* When editing a world, new content may be inserted in the additional
       editors.  This function updates the world to include this content,
       while removing the irrelevant, default */
    world.pre_code = pre_code_editor.getValue();
    world.post_code = post_code_editor.getValue();
    world.description = description_editor.getValue();
    world.onload = onload_editor.getValue();
    return RUR.world.editors_remove_default_values(world);
};

RUR.world.update_editors = function (world) {
   pre_code_editor.setValue(world.pre_code);
   post_code_editor.setValue(world.post_code);
   description_editor.setValue(world.description);
   onload_editor.setValue(world.onload);
};

RUR.world.dialog_update_editors_from_world = $("#dialog-update-editors-from-world").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    modal: true,
    buttons: {
        Cancel: function() {
            RUR.world.dialog_update_editors_from_world.dialog("close");
        }
    }
});

$("#update-editor-content-btn").on("click", function(evt) {
    editor.setValue(RUR.CURRENT_WORLD.editor);
    $("#update-editor-content").hide();
    if (! $("#update-library-content").is(":visible")) {
        RUR.world.dialog_update_editors_from_world.dialog("close");
    }
});
$("#update-library-content-btn").on("click", function(evt) {
    library.setValue(RUR.CURRENT_WORLD.library);
    $("#update-library-content").hide();
    if (! $("#update-editor-content").is(":visible")) {
        RUR.world.dialog_update_editors_from_world.dialog("close");
    }
});

},{"./constants.js":1,"./exceptions.js":10,"./robot.js":41,"./state.js":45,"./translator.js":48,"./ui/edit_robot_menu.js":49,"./visible_world.js":58,"./world/clone_world.js":60}],60:[function(require,module,exports){

exports.clone_world = function (world) {
    if (world === undefined) {
        return JSON.parse(JSON.stringify(RUR.CURRENT_WORLD));
    } else {
        return JSON.parse(JSON.stringify(world));
    }
};

},{}],61:[function(require,module,exports){
require("./../constants.js");

exports.create_empty_world = create_empty_world = function (blank_canvas) {
    "use strict";
    var world = {};
    if (blank_canvas) {
        world.blank_canvas = true;
        return world;
    }
    world.robots = [];
    world.walls = {};
    world.objects = {};
    // allow teacher to insert code to be run before and after the
    // code entered by the student
    world.small_tiles = false;
    world.rows = RUR.MAX_Y;
    world.cols = RUR.MAX_X;

    return world;
};
RUR.CURRENT_WORLD = create_empty_world();

},{"./../constants.js":1}],62:[function(require,module,exports){

exports.export_world = function () {
    return JSON.stringify(RUR.CURRENT_WORLD, null, 2);
};

},{}],63:[function(require,module,exports){
require("./../translator.js");
require("./../constants.js");
require("./../robot.js");
require("./../visible_world.js");
require("./../state.js");
require("./../exceptions.js");
edit_robot_menu = require("./../ui/edit_robot_menu.js");
var clone_world = require("./clone_world.js").clone_world;

RUR.world.import_world = function (json_string) {
    "use strict";
    var body, editor_content, library_content;
    if (json_string === undefined){
        console.log("Problem: no argument passed to RUR.world.import_world");
        return {};
    }
    RUR._ORDERED_TILES = {};
    RUR._SYNC_TILES = {};
    RUR._SYNC_TILES_VALUE = {};

    if (typeof json_string == "string"){
        try {
            RUR.CURRENT_WORLD = JSON.parse(json_string) || RUR.world.create_empty_world();
        } catch (e) {
            console.log("Exception caught in import_world.");
            console.log(json_string);
            console.log(e);
            RUR.world.create_empty_world();
            return;
        }
    } else {  // already parsed
        RUR.CURRENT_WORLD = json_string;
    }

    if (RUR.CURRENT_WORLD.robots !== undefined) {
        if (RUR.CURRENT_WORLD.robots[0] !== undefined) {
            RUR.robot.cleanup_objects(RUR.CURRENT_WORLD.robots[0]);
            body = RUR.CURRENT_WORLD.robots[0];
            body._prev_x = body.x;
            body._prev_y = body.y;
            body._prev_orientation = body._orientation;
        }
    }

    // Backward compatibility following change done on Jan 5, 2016
    // top_tiles has been renamed solid_objects; to ensure compatibility of
    // worlds created prior to using solid_objects, we change the old name
    // following http://stackoverflow.com/a/14592469/558799
    // thus ensuring that if a new world is created from an old one,
    // it will have the new syntax.
    if (RUR.CURRENT_WORLD.top_tiles !== undefined) {
        Object.defineProperty(RUR.CURRENT_WORLD, "solid_objects",
            Object.getOwnPropertyDescriptor(RUR.CURRENT_WORLD, "top_tiles"));
        delete RUR.CURRENT_WORLD.top_tiles;
    }

    if (RUR.CURRENT_WORLD.background_image !== undefined) {
        RUR.BACKGROUND_IMAGE.src = RUR.CURRENT_WORLD.background_image;
        RUR.BACKGROUND_IMAGE.onload = function () {
            RUR.vis_world.draw_all();
        };
    } else {
        RUR.BACKGROUND_IMAGE.src = '';
    }

    if (RUR.CURRENT_WORLD.onload !== undefined) {
        eval_onload();
    }

    RUR.CURRENT_WORLD.small_tiles = RUR.CURRENT_WORLD.small_tiles || false;
    RUR.CURRENT_WORLD.rows = RUR.CURRENT_WORLD.rows || RUR.MAX_Y;
    RUR.CURRENT_WORLD.cols = RUR.CURRENT_WORLD.cols || RUR.MAX_X;
    RUR.vis_world.compute_world_geometry(RUR.CURRENT_WORLD.cols, RUR.CURRENT_WORLD.rows);

    $("#add-editor-to-world").prop("checked",
                                   RUR.CURRENT_WORLD.editor !== undefined);
    $("#add-library-to-world").prop("checked",
                                    RUR.CURRENT_WORLD.library !== undefined);

    if (RUR.CURRENT_WORLD.editor !== undefined &&
        RUR.CURRENT_WORLD.editor !== editor.getValue()) {
        RUR.world.dialog_update_editors_from_world.dialog("open");
        $("#update-editor-content").show();
    } else {
        $("#update-editor-content").hide();
    }
    if (RUR.state.programming_language === "python" &&
        RUR.CURRENT_WORLD.library !== undefined &&
        RUR.CURRENT_WORLD.library !== library.getValue()) {
        RUR.world.dialog_update_editors_from_world.dialog("open");
        $("#update-library-content").show();
    } else {
        $("#update-library-content").hide();
    }

    // make a clean (predictable) copy
    RUR.CURRENT_WORLD = RUR.world.editors_remove_default_values(RUR.CURRENT_WORLD);
    RUR._SAVED_WORLD = clone_world();
    // restore defaults everywhere for easier comparison when editing
    RUR.CURRENT_WORLD = RUR.world.editors_set_default_values(RUR.CURRENT_WORLD);
    RUR.world.update_editors(RUR.CURRENT_WORLD);

    if (RUR.state.editing_world) {
        edit_robot_menu.toggle();
    }
};

eval_onload = function () {
    try {
        eval(RUR.CURRENT_WORLD.onload);  // jshint ignore:line
    } catch (e) {
        RUR.show_feedback("#Reeborg-shouts",
            RUR.translate("Problem with onload code.") + "<br><pre>" +
            RUR.CURRENT_WORLD.onload + "</pre>");
        console.log("error in onload:", e);
    }
};

},{"./../constants.js":1,"./../exceptions.js":10,"./../robot.js":41,"./../state.js":45,"./../translator.js":48,"./../ui/edit_robot_menu.js":49,"./../visible_world.js":58,"./clone_world.js":60}],64:[function(require,module,exports){

require("./translator.js");
require("./constants.js");
require("./objects.js");
require("./robot.js");
require("./world.js");
require("./visible_world.js");
require("./exceptions.js");
require("./state.js");
require("./world_get.js");
require("./world_set.js");
require("./dialogs/create.js");

require("./world_set/add_object.js");
require("./world_set/add_goal_object.js");
require("./world_set/add_robot.js");

var edit_robot_menu = require("./ui/edit_robot_menu.js");
var dialog_add_object = require("./dialogs/add_object.js").dialog_add_object;
var dialog_give_object = require("./dialogs/give_object.js").dialog_give_object;
var dialog_goal_object = require("./dialogs/goal_object.js").dialog_goal_object;
var dialog_set_background_image = require("./dialogs/set_background_image.js").dialog_set_background_image;
var dialog_select_colour = require("./dialogs/select_colour.js").dialog_select_colour;


var filterInt = require("./utils/filterint.js").filterInt;
var identical = require("./utils/identical.js").identical;

RUR.we = {};   // we == World Editor

RUR.we.__give_to_robot = false;

RUR.we.edit_world = function  () {
    "use strict";
    // usually triggered when canvas is clicked if editing world;
    // call explicitly if needed.
    var value, split, root;
    split = RUR.we.edit_world_flag.split("-");
    root = split[0];
    value = split[1];
    switch (root) {
        case "robot":
            if (value == "place") {
                RUR.we.place_robot();
            }
            break;
        case "object":
            if (RUR.we.decorative_objects) {
                RUR.toggle_decorative_object_at_position(value);
            } else {
                RUR.we._add_object(value);
            }
            break;
        case "tile":
            RUR.we.toggle_tile(value);
            break;
        case "fill":
            RUR.we.fill_with_tile(value);
            break;
        case "solid_object":
            RUR.we.toggle_solid_object(value);
            break;
        case "world":
            if (value == "walls") {
                RUR.we._toggle_wall();
            }
            break;
        case "position":
            RUR.we.set_goal_position(value);
            break;
        case "goal":
            if (value == "wall") {
                RUR.we.toggle_goal_wall();
            } else {
                RUR.we._add_goal_objects(value);
            }
            break;
        default:
            break;
    }
    RUR.vis_world.refresh_world_edited();
};

RUR.we.alert_1 = function (txt) {
    $("#cmd-result").html(RUR.translate(txt)).effect("highlight", {color: "gold"}, 1500);
};
RUR.we.alert_2 = function (txt, value) {
    $("#cmd-result").html(RUR.translate(txt).supplant({obj: RUR.translate(value)})).effect("highlight", {color: "gold"}, 1500);
};

RUR.we.select = function (choice) {
    "use strict";
    var value, split, root;
    RUR.we.edit_world_flag = choice;
    split = choice.split("-");
    root = split[0];
    value = split[1];
    $(".edit-world-canvas").hide();
    $(".edit-goal-canvas").hide();
    $("#edit-goal-position").hide();
    $("#edit-world-objects").hide();
    $(".not-for-robot").hide();
    switch (root) {
        case "robot":
            switch (value) {
            case "place":
                RUR.we.alert_1("Click on world to move robot.");
                break;
            case "add":
                RUR.we.alert_1("Added robot.");
                RUR._add_robot();
                RUR.we.edit_world();
                edit_robot_menu.toggle();
                break;
            case "orientation":
                RUR.we.alert_1("Click on image to turn robot");
                $("#edit-world-turn").show();
                $("#random-orientation").show();
                break;
            case "objects":
                RUR.we.__give_to_robot = true;
                $("#edit-world-objects").show();
                $(".not-for-robot").hide();
                RUR.we.alert_1("Click on desired object below.");
                break;
            }
            break;
        case "decorative":
            RUR.we.decorative_objects = true;
            $("#edit-world-objects").show();
            RUR.we.__give_to_robot = false;
            RUR.we.alert_1("Click on desired object below.");
            break;
        case "background":
            dialog_set_background_image.dialog("open");
            break;
        case "world":
            switch (value) {
            case "objects":
                RUR.we.decorative_objects = false;
                $("#edit-world-objects").show();
                $(".not-for-robot").show();  // box
                RUR.we.__give_to_robot = false;
                RUR.we.alert_1("Click on desired object below.");
                break;
            case "tiles":
                $("#edit-tile").show();
                RUR.we.alert_1("Click on desired tile below.");
                break;
            case "fill_tiles":
                $("#fill-tile").show();
                RUR.we.alert_1("Click on desired tile below.");
                break;
            case "solid_objects":
                $("#edit-solid-object").show();
                RUR.we.alert_1("Click on desired object below.");
                break;
            case "walls":
                RUR.we.alert_1("Click on world to toggle walls.");
                break;
            }
            break;
        case "object":
            $("#edit-world-objects").show();
            if (RUR.we.__give_to_robot) {
                $(".not-for-robot").hide();
                RUR.we._give_objects_to_robot(value);
                RUR.we.edit_world_flag = '';
            } else {
                if (RUR.we.decorative_objects) {
                    $(".not-for-robot").show();
                }
                if (value == "box"){
                    RUR.we.alert_2("Click on world to add single object.", value);
                } else {
                    RUR.we.alert_2("Click on world to add object.", value);
                }
            }
            break;
        case "tile":
            $("#edit-tile").show();
            RUR.we.alert_2("Click on world to toggle tile.", value);
            break;
        case "fill":
            $("#fill-tile").show();
            RUR.we.alert_2("Click on world to fill with given tile.", value);
            break;
        case "solid_object":
            $("#edit-solid-object").show();
            RUR.we.alert_2("Click on world to toggle object.", value);
            break;
        case "position":
            RUR.we.alert_1("Click on world to set home position for robot.");
            break;
        case "goal":
            switch (value) {
            case "robot":
                $("#edit-goal-position").show();
                RUR.we.alert_1("Click on image desired to indicate the final position of the robot.");
                break;
            case "wall":
                RUR.we.alert_1("Click on world to toggle additional walls to build.");
                break;
            case "objects":
                $("#edit-goal-objects").show();
                RUR.we.alert_1("Click on desired goal object below.");
                break;
            default:
                $("#edit-goal-objects").show();
                if (value == "box"){
                RUR.we.alert_2("Click on world to set number of single goal objects.", value);
                } else {
                RUR.we.alert_2("Click on world to set number of goal objects.", value);
                }
                RUR.we.alert_2("Click on world to set number of goal objects.", value);
                break;
            }
        break;
        case "set":
            RUR.world_set.dialog_set_dimensions.dialog('open');
            break;
    }
};

RUR.we.toggle_editing_mode = function () {
    if (RUR.state.editing_world) {  // done editing
        $("#pre-code-link").parent().hide();
        $("#post-code-link").parent().hide();
        $("#description-link").parent().hide();
        $("#onload-editor-link").parent().hide();

        RUR.state.editing_world = false;
        RUR.state.code_evaluated = false;
        RUR.WALL_COLOR = "brown";
        RUR.SHADOW_WALL_COLOR = "#f0f0f0";
        RUR.vis_world.draw_all();
        try {
            localStorage.setItem("editor", editor.getValue());
            localStorage.setItem("library", library.getValue());
        } catch (e) {}
        RUR.CURRENT_WORLD = RUR.world.update_from_editors(RUR.CURRENT_WORLD);
        if (!identical(RUR.CURRENT_WORLD, RUR._SAVED_WORLD)) {
            $("#memorize-world").trigger('click');
        }
        $("#editor-tab").trigger('click');
    } else {

        $("#pre-code-link").parent().show();
        $("#post-code-link").parent().show();
        $("#description-link").parent().show();
        $("#onload-editor-link").parent().show();

        edit_robot_menu.toggle();
        RUR.state.editing_world = true;
        RUR.WALL_COLOR = "black";
        RUR.SHADOW_WALL_COLOR = "#ccd";
        RUR.vis_world.draw_all();
        // RUR.CURRENT_WORLD = RUR.world.editors_set_default_values(RUR.CURRENT_WORLD);
        $("#highlight").hide();
        $("#watch-variables-btn").hide();
    }
};

RUR.create_and_activate_dialogs( $("#edit-world"), $("#edit-world-panel"),
                                 {}, RUR.we.toggle_editing_mode);

RUR.we.calculate_grid_position = function () {
    var ctx, x, y;
    x = RUR.mouse_x - $("#robot-canvas").offset().left;
    y = RUR.mouse_y - $("#robot-canvas").offset().top;

    x /= RUR.WALL_LENGTH;
    x = Math.floor(x);

    y = RUR.HEIGHT - y + RUR.WALL_THICKNESS;
    y /= RUR.WALL_LENGTH;
    y = Math.floor(y);

    RUR.we.mouse_contained_flag = true;  // used in tooltip.js
    if (x < 1 ) {
        x = 1;
        RUR.we.mouse_contained_flag = false;
    } else if (x > RUR.COLS) {
        x = RUR.COLS;
        RUR.we.mouse_contained_flag = false;
    }
    if (y < 1 ) {
        y = 1;
        RUR.we.mouse_contained_flag = false;
    } else if (y > RUR.ROWS) {
        y = RUR.ROWS;
        RUR.we.mouse_contained_flag = false;
    }
    return [x, y];
};


RUR.we.place_robot = function () {
    "use strict";
    var position, world=RUR.CURRENT_WORLD, robot, arr=[], pos, present=false;
    position = RUR.we.calculate_grid_position();
    if (world.robots !== undefined){
        if (world.robots.length >0) {
            robot = world.robots[0];
            if (!robot.start_positions){
                robot.start_positions = [[robot.x, robot.y]];
            }
        } else {
            RUR._add_robot();
            robot = world.robots[0];
            robot.x = position[0];
            robot.y = position[1];
            robot._prev_x = robot.x;
            robot._prev_y = robot.y;
            robot.start_positions = [[robot.x, robot.y]];
            return;
        }
    }

    for (var i=0; i < robot.start_positions.length; i++){
        pos = robot.start_positions[i];
        if(pos[0]==position[0] && pos[1]==position[1]){
            present = true;
        } else {
            arr.push(pos);
            robot.x = pos[0];
            robot.y = pos[1];
        }
    }
    if (!present){
        arr.push(position);
        robot.x = position[0];
        robot.y = position[1];
    }

    if (arr.length===0){
        RUR.CURRENT_WORLD.robots = [];
        edit_robot_menu.toggle();
        return;
    }

    robot.start_positions = arr;
    robot._prev_x = robot.x;
    robot._prev_y = robot.y;
};


RUR.we._give_objects_to_robot = function (specific_object){
    "use strict";

    RUR.state.specific_object = specific_object;
    $("#give-object-name").html(RUR.translate(specific_object));
    dialog_give_object.dialog("open");
};

RUR.we.turn_robot = function (orientation) {

    RUR.CURRENT_WORLD.robots[0]._orientation = orientation;
    RUR.CURRENT_WORLD.robots[0]._prev_orientation = orientation;
    RUR.vis_world.refresh_world_edited();
};

RUR.we.calculate_wall_position = function () {
    var ctx, x, y, orientation, remain_x, remain_y, del_x, del_y;
    x = RUR.mouse_x - $("#robot-canvas").offset().left;
    y = RUR.mouse_y - $("#robot-canvas").offset().top;

    y = RUR.BACKGROUND_CANVAS.height - y;  // count from bottom

    x /= RUR.WALL_LENGTH;
    y /= RUR.WALL_LENGTH;
    remain_x = x - Math.floor(x);
    remain_y = y - Math.floor(y);

    // del_  denotes the distance to the closest wall
    if (Math.abs(1.0 - remain_x) < remain_x) {
        del_x = Math.abs(1.0 - remain_x);
    } else {
        del_x = remain_x;
    }

    if (Math.abs(1.0 - remain_y) < remain_y) {
        del_y = Math.abs(1.0 - remain_y);
    } else {
        del_y = remain_y;
    }

    x = Math.floor(x);
    y = Math.floor(y);

    if ( del_x < del_y ) {
        orientation = "east";
        if (remain_x < 0.5) {
            x -= 1;
        }
    } else {
        orientation = "north";
        if (remain_y < 0.5) {
            y -= 1;
        }
    }

    if (x < 1 ) {
        x = 1;
    } else if (x > RUR.COLS) {
        x = RUR.COLS;
    }
    if (y < 1 ) {
        y = 1;
    } else if (y > RUR.ROWS) {
        y = RUR.ROWS;
    }

    return [x, y, orientation];
};

RUR.we._toggle_wall = function () {
    var position, x, y, orientation;
    position = RUR.we.calculate_wall_position();
    x = position[0];
    y = position[1];
    orientation = position[2];
    RUR.we.toggle_wall(x, y, orientation);
};

RUR.we.toggle_wall = function (x, y, orientation) {
    var coords, index;
    coords = x + "," + y;

    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "walls");
    if (RUR.CURRENT_WORLD.walls[coords] === undefined){
        RUR.CURRENT_WORLD.walls[coords] = [orientation];
    } else {
        index = RUR.CURRENT_WORLD.walls[coords].indexOf(orientation);
        if (index === -1) {
            RUR.CURRENT_WORLD.walls[coords].push(orientation);
        } else {
            RUR.CURRENT_WORLD.walls[coords].splice(index, 1);
            if (RUR.CURRENT_WORLD.walls[coords].length === 0){
                delete RUR.CURRENT_WORLD.walls[coords];
            }
        }
    }
};



RUR.we.toggle_goal_wall = function () {
    var position, response, x, y, orientation, coords, index;
    position = RUR.we.calculate_wall_position();
    x = position[0];
    y = position[1];
    orientation = position[2];
    coords = x + "," + y;

    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "goal");
    RUR._ensure_key_exists(RUR.CURRENT_WORLD.goal, "walls");
    if (RUR.CURRENT_WORLD.goal.walls[coords] === undefined){
        RUR.CURRENT_WORLD.goal.walls[coords] = [orientation];
    } else {
        index = RUR.CURRENT_WORLD.goal.walls[coords].indexOf(orientation);
        if (index === -1) {
            RUR.CURRENT_WORLD.goal.walls[coords].push(orientation);
        } else {
            RUR.CURRENT_WORLD.goal.walls[coords].splice(index, 1);
            if (Object.keys(RUR.CURRENT_WORLD.goal.walls[coords]).length === 0){
                delete RUR.CURRENT_WORLD.goal.walls[coords];
                if (Object.keys(RUR.CURRENT_WORLD.goal.walls).length === 0) {
                    delete RUR.CURRENT_WORLD.goal.walls;
                    if (Object.keys(RUR.CURRENT_WORLD.goal).length === 0) {
                        delete RUR.CURRENT_WORLD.goal;
                    }
                }
            }
        }
    }
};

RUR.we._add_object = function (specific_object){
    "use strict";
    var position, x, y, query, tmp;
    position = RUR.we.calculate_grid_position();
    x = position[0];
    y = position[1];
    if (specific_object == "box") {
        if (RUR.CURRENT_WORLD.objects !== undefined &&
            RUR.CURRENT_WORLD.objects[x+','+y] !== undefined &&
            RUR.CURRENT_WORLD.objects[x+','+y]["box"] == 1){  // jshint ignore:line
            RUR.add_object_at_position("box", x, y, 0);
        } else {
            RUR.add_object_at_position("box", x, y, 1);
        }
        return;
    }

    RUR.state.specific_object = specific_object;
    RUR.state.x = x;
    RUR.state.y = y;
    $("#add-object-name").html(RUR.translate(specific_object));
    dialog_add_object.dialog("open");
};

RUR.we._add_goal_objects = function (specific_object){
    "use strict";
    var position, x, y, coords, query;
    position = RUR.we.calculate_grid_position();
    x = position[0];
    y = position[1];
    coords = x + "," + y;

    // TODO investigate potential bug; should toggle if box ...
    if (specific_object == "box") {
        if (RUR.CURRENT_WORLD.goal !== undefined &&
            RUR.CURRENT_WORLD.goal.objects !== undefined &&
            RUR.CURRENT_WORLD.goal.objects[coords] !== undefined &&
            RUR.CURRENT_WORLD.goal.objects[coords].box ==1){
                RUR.add_goal_object_at_position("box", x, y, 0);
        } else {
            RUR.add_goal_object_at_position("box", x, y, 1);
        }
        return;
    }

    RUR.state.specific_object = specific_object;
    RUR.state.x = x;
    RUR.state.y = y;
    $("#goal-object-name").html(RUR.translate(specific_object));
    dialog_goal_object.dialog("open");
};




RUR.we.set_goal_position = function (home){
    // will remove the position if clicked again.
    "use strict";
    var position, world=RUR.CURRENT_WORLD, robot, arr=[], pos, present=false, goal;

    $("#cmd-result").html(RUR.translate("Click on world to set home position for robot.")).effect("highlight", {color: "gold"}, 1500);

    RUR._ensure_key_exists(world, "goal");
    goal = world.goal;

    if (goal.possible_positions === undefined) {
        RUR._ensure_key_exists(goal, "possible_positions");
        if (goal.position !== undefined) {
            goal.possible_positions = [[goal.position.x, goal.position.y]];
        } else {
            RUR._ensure_key_exists(goal, "position");
        }
    }

    goal.position.image = home;

    position = RUR.we.calculate_grid_position();
    goal.position.x = position[0];
    goal.position.y = position[1];

    for(var i=0; i<goal.possible_positions.length; i++) {
        pos = goal.possible_positions[i];
        if(pos[0]==position[0] && pos[1]==position[1]){
            present = true;
            break;
        } else {
            arr.push(pos);
            goal.position.x = pos[0];
            goal.position.y = pos[1];
        }
    }

    if (!present){
        arr.push(position);
        goal.position.x = position[0];
        goal.position.y = position[1];
    }
    goal.possible_positions = arr;

    if (arr.length === 0) {
        delete RUR.CURRENT_WORLD.goal.position;
        delete RUR.CURRENT_WORLD.goal.possible_positions;
        if (Object.keys(RUR.CURRENT_WORLD.goal).length === 0) {
            delete RUR.CURRENT_WORLD.goal;
        }
        $("#edit-world-turn").hide();
    }
};

RUR.we.toggle_tile = function (tile){
    // will remove the position if clicked again with tile of same type.
    "use strict";
    var x, y, position, coords, index;

    if (!tile) {  // if we cancel the dialog
        return;
    } else if (tile === "colour") {
        RUR._CALLBACK_FN = RUR.we.toggle_tile;
        dialog_select_colour.dialog("open");
        return;
    }

    position = RUR.we.calculate_grid_position();
    x = position[0];
    y = position[1];
    coords = x + "," + y;

    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "tiles");
    if (RUR.CURRENT_WORLD.tiles[coords] === undefined ||
        RUR.CURRENT_WORLD.tiles[coords] != tile){
        RUR.CURRENT_WORLD.tiles[coords] = tile;
    } else {
        delete RUR.CURRENT_WORLD.tiles[coords];
    }
};

RUR.we.fill_with_tile = function (tile) {
    var x, y, coords;

    if (!tile) {    // if we cancel the dialog
        return;
    } else if (tile === "colour") {
        RUR._CALLBACK_FN = RUR.we.fill_with_tile;
        dialog_select_colour.dialog("open");
        return;
    }

    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "tiles");
    for (x = 1; x <= RUR.COLS; x++) {
        for (y = 1; y <= RUR.ROWS; y++) {
            coords = x + "," + y;
            RUR.CURRENT_WORLD.tiles[coords] = tile;
        }
    }
};


RUR.we.toggle_solid_object = function (obj){
    // will remove the position if clicked again with object of same type.
    "use strict";
    var x, y, position;

    position = RUR.we.calculate_grid_position();
    x = position[0];
    y = position[1];

    if (RUR.world_get.solid_objects_at_position(x, y)[obj] !== undefined) {
        RUR.world_set.add_solid_object(obj, x, y, 0);
    } else {
        RUR.world_set.add_solid_object(obj, x, y, 1);
    }
};



$("#robot-canvas").on("click", function (evt) {
    RUR.mouse_x = evt.pageX;
    RUR.mouse_y = evt.pageY;
    if (RUR.state.editing_world) {
        RUR.we.edit_world();
    }
    RUR.world_get.world_info();
});

},{"./constants.js":1,"./dialogs/add_object.js":4,"./dialogs/create.js":5,"./dialogs/give_object.js":6,"./dialogs/goal_object.js":7,"./dialogs/select_colour.js":8,"./dialogs/set_background_image.js":9,"./exceptions.js":10,"./objects.js":31,"./robot.js":41,"./state.js":45,"./translator.js":48,"./ui/edit_robot_menu.js":49,"./utils/filterint.js":52,"./utils/identical.js":53,"./visible_world.js":58,"./world.js":59,"./world_get.js":65,"./world_set.js":68,"./world_set/add_goal_object.js":69,"./world_set/add_object.js":70,"./world_set/add_robot.js":71}],65:[function(require,module,exports){
/* Obtain specific information about the world, either at a given
   position, or for the world in general.
*/

require("./objects.js");
require("./dialogs/create.js");

RUR.world_get = {};

RUR.world_get.is_wall_at = function (coords, orientation) {
    if (RUR.CURRENT_WORLD.walls === undefined) {
        return false;
    }
    if (RUR.CURRENT_WORLD.walls[coords] !== undefined){
        if (RUR.CURRENT_WORLD.walls[coords].indexOf(orientation) !== -1) {
            return true;
        }
    }
    return false;
};


RUR.world_get.tile_at_position = function (x, y) {
    "use strict";
    var coords = x + "," + y;
    if (RUR.CURRENT_WORLD.tiles === undefined) return false;
    if (RUR.CURRENT_WORLD.tiles[coords] === undefined) return false;
    return RUR.TILES[RUR.CURRENT_WORLD.tiles[coords]];
};

RUR.world_get.pushable_object_at_position = function(x, y) {
    "use strict";
    var objects_here, obj_here, obj_type, coords = x + ',' + y;
    if (RUR.CURRENT_WORLD.objects === undefined) return false;
    if (RUR.CURRENT_WORLD.objects[coords] === undefined) return false;
    objects_here = RUR.CURRENT_WORLD.objects[coords];

    for (obj_type in objects_here) {
        if (objects_here.hasOwnProperty(obj_type)) {
            if (RUR.OBJECTS[obj_type].pushable) {
                return obj_type;
            }
        }
    }
    return false;
};

RUR.world_get.solid_objects_at_position = function (x, y) {
    "use strict";
    var coords = x + "," + y;
    if (RUR.CURRENT_WORLD.solid_objects === undefined) return false;
    if (RUR.CURRENT_WORLD.solid_objects[coords] === undefined) return false;
    return RUR.CURRENT_WORLD.solid_objects[coords];
};

RUR.world_get.object_at_robot_position = function (robot, obj) {
    return object_of_type_here(robot, obj, RUR.CURRENT_WORLD.objects);
};

RUR.world_get.decorative_object_at_robot_position = function (robot, obj) {
    return object_of_type_here(robot, obj, RUR.CURRENT_WORLD.decorative_objects);
};


function object_of_type_here (robot, obj, object_type) {
    // object_type == RUR.CURRENT_WORLD.objects or RUR.CURRENT_WORLD.decorative_objects
    var obj_here, obj_type, all_objects;
    var coords = robot.x + "," + robot.y;

    if (object_type === undefined ||
        object_type[coords] === undefined) {
        return [];
    }

    obj_here =  object_type[coords];
    all_objects = [];

    for (obj_type in obj_here) {
        if (obj_here.hasOwnProperty(obj_type)) {
            if (obj !== undefined && obj_type == RUR.translate_to_english(obj)) {
                return [RUR.translate(obj_type)];
            }
            all_objects.push(RUR.translate(obj_type));
        }
    }

    if (obj !== undefined) {
        return [];
    } else if (all_objects.length === 0){
        return [];
    } else {
        return all_objects;
    }
}

RUR.world_get.world_map = function () {
    return JSON.stringify(RUR.CURRENT_WORLD, null, 2);
};

RUR.world_get.world_info = function (no_grid) {
    "use strict";
    // shows the information about a given grid position
    // when the user clicks on the canvas at that grid position.
    // enabled in zz_dr_onclick.js
    var position, tile, obj, information, x, y, coords, obj_here, obj_type, goals;
    var topic, no_object, r, robot, robots;
    var tiles, tilename, fence_noted = false;

    information = "";

    if (RUR.CURRENT_WORLD.description) {
        information +="<b>" + RUR.translate("Description") + "</b><br>" + RUR.CURRENT_WORLD.description + "<hr>";
    }

    if (!no_grid) {
        position = RUR.we.calculate_grid_position();
        x = position[0];
        y = position[1];
        coords = x + "," + y;
        if (!isNaN(x)){
            information += "x = " + x + ", y = " + y;
        }
    }

    tile = RUR.world_get.tile_at_position(x, y);
    topic = true;
    if (tile){
        if (RUR.translate(tile.info)) {
            if (topic){
                topic = false;
                information += "<br><br><b>" + RUR.translate("Special information about this location:") + "</b>";
            }
            information += "<br>" + RUR.translate(tile.info);
        }
    }

    tiles = RUR.world_get.solid_objects_at_position(x, y);
    if (tiles) {
        for (tilename in tiles) {
            tile = RUR.SOLID_OBJECTS[tilename];
            if (RUR.translate(tile.info)){
                if (topic){
                    topic = false;
                    information += "<br><br><b>" + RUR.translate("Special information about this location:") + "</b>";
                }
                if (tile.name == "fence") {
                    if (!fence_noted) {
                        fence_noted = true;
                        information += "<br>" + RUR.translate(tile.info);
                    }
                } else {
                    information +=  "<br>" + RUR.translate(tile.info);
                }
            }
        }
    }

    obj = RUR.CURRENT_WORLD.objects;
    topic = true;
    if (obj !== undefined && obj[coords] !== undefined){
        obj_here = obj[coords];
        for (obj_type in obj_here) {
            if (obj_here.hasOwnProperty(obj_type)) {
                    if (topic){
                        topic = false;
                        information += "<br><br><b>" + RUR.translate("Objects found here:") + "</b>";
                    }
               information += "<br>" + RUR.translate(obj_type) + ":" + obj_here[obj_type];
            }
        }
    }

    goals = RUR.CURRENT_WORLD.goal;
    if (goals !== undefined){
        obj = goals.objects;
        topic = true;
        if (obj !== undefined && obj[coords] !== undefined){
            obj_here = obj[coords];
            for (obj_type in obj_here) {
                if (obj_here.hasOwnProperty(obj_type)) {
                    if (topic){
                        topic = false;
                        information += "<br><br><b>" + RUR.translate("Goal to achieve:") + "</b>";
                    }
                   information += "<br>" + RUR.translate(obj_type) + ":" + obj_here[obj_type];
                }
            }
        }
    }


    if (goals !== undefined){
        if (goals.walls !== undefined && coords) {
            if (goals.walls[coords] !== undefined){
                if (goals.walls[coords].indexOf("east") != -1) {
                    information += "<br>" + RUR.translate("A wall must be built east of this location.");
                }
                if (goals.walls[coords].indexOf("north") != -1) {
                    information += "<br>" + RUR.translate("A wall must be built north of this location.");
                }
            }
            x -= 1;
            coords = x + "," + y;
            if (goals.walls[coords] !== undefined){
                if (goals.walls[coords].indexOf("east") != -1) {
                    information += "<br>" + RUR.translate("A wall must be built west of this location.");
                }
            }
            x += 1;
            y -= 1;
            coords = x + "," + y;
            if (goals.walls[coords] !== undefined){
                if (goals.walls[coords].indexOf("north") != -1) {
                    information += "<br>" + RUR.translate("A wall must be built south of this location.");
                }
            }
            y += 1;
            coords = x + "," + y;
        }
    }

    robots = RUR.CURRENT_WORLD.robots;
    if (robots !== undefined && robots.length !== undefined){
        for (r=0; r<robots.length; r++){
            robot = robots[r];
            x = robot.x;
            y = robot.y;
            if (robot.start_positions !== undefined && robot.start_positions.length > 1){
                x = RUR.translate("random location");
                y = '';
            }
            no_object = true;
            for (obj in robot.objects){
                if (robot.objects.hasOwnProperty(obj)) {
                    if (no_object) {
                        no_object = false;
                        information += "<br><br><b>" + RUR.translate("A robot located here carries:").supplant({x:x, y:y}) + "</b>";
                    }
                    information += "<br>" + RUR.translate(obj) + ":" + robot.objects[obj];
                }
            }
            if (no_object){
                information += "<br><br><b>" + RUR.translate("A robot located here carries no objects.").supplant({x:x, y:y}) + "</b>";
            }
        }
    }


    goals = RUR.CURRENT_WORLD.goal;
    if (goals !== undefined &&
         (goals.possible_positions !== undefined || goals.position !== undefined)){
        if (topic){
            topic = false;
            information += "<br><br><b>" + RUR.translate("Goal to achieve:") + "</b>";
        }
        if (goals.possible_positions !== undefined && goals.possible_positions.length > 2) {
            information += "<br>" + RUR.translate("The final required position of the robot will be chosen at random.");
        } else {
            information += "<br>" + RUR.translate("The final position of the robot must be (x, y) = ") +
                           "(" + goals.position.x + ", " + goals.position.y + ")";
        }
    }

    $("#World-info").html(information);
};

RUR.create_and_activate_dialogs( $("#world-info-button"), $("#World-info"),
                                 {height:300, width:600}, RUR.world_get.world_info);

},{"./dialogs/create.js":5,"./objects.js":31}],66:[function(require,module,exports){

require("./visible_world.js");
require("./constants.js");

RUR.world_init = {};

// Returns a random integer between min and max (both included)
randint = function (min, max, previous) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};


// assigns initial values
RUR.world_init.set = function () {
    "use strict";
    var coords, obj, objects, objects_here, nb, range, robot;
    var position, goal, total_nb_objects = {};

   // First, deal with objects

    if (RUR.CURRENT_WORLD.objects !== undefined){
        objects = RUR.CURRENT_WORLD.objects;
        for (coords in objects){
            if (objects.hasOwnProperty(coords)){
                objects_here = objects[coords];
                for (obj in objects_here){
                    if (objects_here.hasOwnProperty(obj)){
                        nb = objects_here[obj];
                        if (nb.toString().indexOf("-") != -1){
                            range = nb.split("-");
                            nb = randint(parseInt(range[0], 10), parseInt(range[1], 10));
                            if (nb !== 0){
                                objects_here[obj] = nb;
                            } else {
                                delete objects_here[obj];
                            }
                        }
                        if (total_nb_objects[obj] === undefined){
                            if (parseInt(nb, 10) !== 0) {
                                total_nb_objects[obj] = parseInt(nb, 10);
                            }
                        } else {
                            total_nb_objects[obj] += parseInt(nb, 10);
                        }
                    }
                }
                if (Object.keys(RUR.CURRENT_WORLD.objects[coords]).length === 0){
                    delete RUR.CURRENT_WORLD.objects[coords];
                }
            }
        }
    }

    // then look for "goals" with "all" as value;

    if (RUR.CURRENT_WORLD.goal !== undefined &&
        RUR.CURRENT_WORLD.goal.objects !== undefined){
        objects = RUR.CURRENT_WORLD.goal.objects;
        for (coords in objects){
            if (objects.hasOwnProperty(coords)){
                objects_here = objects[coords];
                for (obj in objects_here){
                    if (objects_here.hasOwnProperty(obj)){
                        nb = objects_here[obj];
                        if (nb == "all") {
                            try {
                                if (total_nb_objects[obj] !== undefined) {
                                    objects_here[obj] = total_nb_objects[obj];
                                } else {
                                    delete objects[coords][obj];
                                }
                            } catch (e) {
                                $("#world-info-button").click();
                                $("#World-info").html("<b>Warning</b> Trying to assign a goal when no corresponding objects are found in the world.");
                            }
                        }
                    }
                }
                if (Object.keys(RUR.CURRENT_WORLD.goal.objects[coords]).length === 0){
                    delete RUR.CURRENT_WORLD.goal.objects[coords];
                }
            }
        }
    }

    // next, initial position for robot
    if (RUR.CURRENT_WORLD.robots !== undefined && RUR.CURRENT_WORLD.robots.length == 1){
        robot = RUR.CURRENT_WORLD.robots[0];
        if (robot.start_positions !== undefined) {
            position = robot.start_positions[randint(0, robot.start_positions.length-1)];
            robot.x = position[0];
            robot.y = position[1];
            robot._prev_x = robot.x;
            robot._prev_y = robot.y;
            delete robot.start_positions;
        }
        if (robot._orientation == -1){
            RUR.CURRENT_WORLD.robots[0]._orientation = randint(0, 3);
            RUR.CURRENT_WORLD.robots[0]._prev_orientation = RUR.CURRENT_WORLD.robots[0]._orientation;
        }
    }

    // then final position for robot

    if (RUR.CURRENT_WORLD.goal !== undefined &&
        RUR.CURRENT_WORLD.goal.possible_positions !== undefined &&
        RUR.CURRENT_WORLD.goal.possible_positions.length > 1) {
        goal = RUR.CURRENT_WORLD.goal;
        position = goal.possible_positions[randint(0, goal.possible_positions.length-1)];
        goal.position.x = position[0];
        goal.position.y = position[1];
        delete goal.possible_positions;
    }
    if (RUR.CURRENT_WORLD.goal !== undefined) {
        RUR.GOAL_CTX.clearRect(0, 0, RUR.WIDTH, RUR.HEIGHT);
        RUR.vis_world.draw_goal();
    }
    RUR.vis_world.refresh();
};

},{"./constants.js":1,"./visible_world.js":58}],67:[function(require,module,exports){

/*  Purpose of this file: abstract handling of menus so that all jQuery
    dependencies (and possibly obscure syntax in some cases) can be pulled
    away from other files.

    The world menu is currently an html select element with
    id = select-world.  Doing a global search for "#select-world" should
    only find items in this file.
*/

RUR.world_select = {};

RUR.world_select.empty_menu = function () {
    $("#select-world").html('');
};

RUR.world_select.set_default = function () {
    document.getElementById("select-world").selectedIndex = 0;
    $("#select-world").change();
};

RUR.world_select.set_url = function (url) {
    $('#select-world').val(url);
    $("#select-world").change();
};

RUR.world_select.get_selected = function () {
    "use strict";
    var select, index, url, shortname;
    select = document.getElementById("select-world");
    index = select.selectedIndex;
    try {
        url = select.options[index].value;
        shortname = select.options[index].text;
    } catch (e) {
        url = select.options[0].value;
        shortname = select.options[0].text;
    }
    return {url:url, shortname:shortname};
};

RUR.world_select.url_from_shortname = function (shortname) {
    // if exists, returns the corresponding url
    "use strict";
    var i, select;
    select = document.getElementById("select-world");
    shortname = shortname.toLowerCase();

    for (i=0; i < select.options.length; i++){
        if (select.options[i].text.toLowerCase() === shortname) {
            return select.options[i].value;
        }
    }
    return undefined;
};

RUR.world_select.replace_shortname = function (url, shortname) {
    "use strict";
    var i, select;
    select = document.getElementById("select-world");
    url = url.toLowerCase();

    for (i=0; i < select.options.length; i++){
        if (select.options[i].value.toLowerCase() === url) {
            select.options[i].text = shortname;
            return true;
        }
    }
    return false;
};

RUR.world_select.append_world = function (arg) {
    "use strict";
    var option_elt, url, shortname;
    url = arg.url;

    if (arg.shortname !== undefined) {
        shortname = arg.shortname;
    } else {
        shortname = url;
    }

    // allow for special styling of any url containing the string "menu".
    if (url.indexOf('menu') != -1) {
        option_elt = '<option class="select-menu"></option>';
    } else if (arg.local_storage !== undefined){
        option_elt = '<option class="select-local-storage"></option>';
    } else {
        option_elt = '<option></option>';
    }
    // Append only if new world.
    if (!RUR.world_select.replace_shortname(url, shortname)) {
        $('#select-world').append( $(option_elt).val(url).html(shortname));
    }
};

},{}],68:[function(require,module,exports){
/* In some ways, this is the counterpart of world_get.js
*/

require("./objects.js");
require("./exceptions.js");
require("./visible_world.js");
require("./recorder.js");

RUR.world_set = {};

var set_dimension_form;




RUR.world_set.add_solid_object = function (specific_object, x, y, nb){
    "use strict";
    var coords, tmp;

    coords = x + "," + y;
    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "solid_objects");
    RUR._ensure_key_exists(RUR.CURRENT_WORLD.solid_objects, coords);

    try {
        tmp = parseInt(nb, 10);
        nb = tmp;
    } catch (e) {}

    if (nb === 0) {
        delete RUR.CURRENT_WORLD.solid_objects[coords][specific_object];
        if (Object.keys(RUR.CURRENT_WORLD.solid_objects[coords]).length === 0){
            delete RUR.CURRENT_WORLD.solid_objects[coords];
        }
        if (Object.keys(RUR.CURRENT_WORLD.solid_objects).length === 0){
            delete RUR.CURRENT_WORLD.solid_objects;
        }
    } else {
        RUR.CURRENT_WORLD.solid_objects[coords][specific_object] = nb;
    }
};



RUR.world_set.remove_all = function () {
    RUR.CURRENT_WORLD.robots = [];
    trim_world(0,0, RUR.COLS, RUR.ROWS);
};

function trim_world (min_x, min_y, max_x, max_y) {
    var x, y, coords;

    for (x = min_x+1; x <= max_x; x++) {
        for (y = 1; y <= max_y; y++) {
            coords = x + "," + y;
            remove_all_at_location(coords);
        }
    }
    for (x = 1; x <= max_x; x++) {
        for (y = min_y+1; y <= max_y; y++) {
            coords = x + "," + y;
            remove_all_at_location(coords);
        }
    }
    if (RUR.CURRENT_WORLD.goal !== undefined) {
        if (RUR.CURRENT_WORLD.goal.possible_positions !== undefined) {
            delete RUR.CURRENT_WORLD.goal.possible_positions;
            delete RUR.CURRENT_WORLD.goal.position;
            RUR.show_feedback("#Reeborg-shouts",
                                 RUR.translate("WARNING: deleted final positions choices while resizing world!"));
        }
    }
}

function remove_all_at_location (coords) {
    // trading efficiency for clarity
    if (RUR.CURRENT_WORLD.tiles !== undefined) {
        if (RUR.CURRENT_WORLD.tiles[coords] !== undefined){
            delete RUR.CURRENT_WORLD.tiles[coords];
        }
    }
    if (RUR.CURRENT_WORLD.solid_objects !== undefined) {
        if (RUR.CURRENT_WORLD.solid_objects[coords] !== undefined){
            delete RUR.CURRENT_WORLD.solid_objects[coords];
        }
    }
    if (RUR.CURRENT_WORLD.objects !== undefined) {
        if (RUR.CURRENT_WORLD.objects[coords] !== undefined){
            delete RUR.CURRENT_WORLD.objects[coords];
        }
    }
    if (RUR.CURRENT_WORLD.walls !== undefined) {
        if (RUR.CURRENT_WORLD.walls[coords] !== undefined){
            delete RUR.CURRENT_WORLD.walls[coords];
        }
    }
    if (RUR.CURRENT_WORLD.goal !== undefined) {
        if (RUR.CURRENT_WORLD.goal.objects !== undefined) {
            if (RUR.CURRENT_WORLD.goal.objects[coords] !== undefined){
                delete RUR.CURRENT_WORLD.goal.objects[coords];
            }
        }
    }
    if (RUR.CURRENT_WORLD.goal !== undefined) {
        if (RUR.CURRENT_WORLD.goal.walls !== undefined) {
            if (RUR.CURRENT_WORLD.goal.walls[coords] !== undefined){
                delete RUR.CURRENT_WORLD.goal.walls[coords];
            }
        }
    }
}

RUR.world_set.dialog_set_dimensions = $("#dialog-set-dimensions").dialog({
    autoOpen: false,
    height: 400,
    width: 500,
    //modal: true,
    buttons: {
        OK: function () {
            set_dimension();
        },
        Cancel: function() {
            RUR.world_set.dialog_set_dimensions.dialog("close");
        }
    },
    close: function() {
        set_dimension_form[0].reset();
    }
});
function set_dimension () {
    "use strict";
    var max_x, max_y;
    max_x = parseInt($("#input-max-x").val(), 10);
    max_y = parseInt($("#input-max-y").val(), 10);
    RUR.CURRENT_WORLD.small_tiles = $("#use-small-tiles").prop("checked");

    trim_world(max_x, max_y, RUR.COLS, RUR.ROWS);   // remove extra objects
    RUR.vis_world.compute_world_geometry(max_x, max_y);
    RUR.world_set.dialog_set_dimensions.dialog("close");
    return true;
}
set_dimension_form = RUR.world_set.dialog_set_dimensions.find("form").on("submit", function( event ) {
    event.preventDefault();
    set_dimension();
});

},{"./exceptions.js":10,"./objects.js":31,"./recorder.js":38,"./visible_world.js":58}],69:[function(require,module,exports){
require("./../exceptions.js");
require("./../utils/key_exist.js");
require("./../translator.js");

/** @function add_goal_object
* @memberof RUR
* @instance
* @summary This function sets a specified quantity of a given object
* as a goal at a certain location.
* By "object" we mean a type of object that can be taken or put down by Reeborg.
*
* @desc Cette fonction spécifie la quantité d'un certain type d'objet qui doit être
* mis comme but à un endroit donné.
* Par "objet", on entend ici un objet qui peut être transporté ou déposé par Reeborg.
*
* @param {string} specific_object The name of the object type ; e.g. "token" <br>
*                        _Le nom du type de l'objet; par exemple, "jeton"._
* @param {integer} x - Position of the object
*                    <br> _position de l'objet_
* @param {integer} y - Position of the object
*                    <br> _position de l'objet_
* @param {integer} nb - Number of desired objects at that location;
*           a value of zero is used to remove any such goal set.
*           <br> _Nombre d'objets désiré à cet endroit;
*  une valeur de zéro est utilisée pour supprimer un but semblable pré-existant._
*
*/
RUR.add_goal_object_at_position = function (specific_object, x, y, nb){
    "use strict";
    var coords;

    if (RUR.KNOWN_OBJECTS.indexOf(specific_object) == -1){
        throw new RUR.ReeborgError(RUR.translate("Unknown object").supplant({obj: specific_object}));
    }

    coords = x + "," + y;

    RUR._ensure_key_exists(RUR.CURRENT_WORLD, "goal");
    RUR._ensure_key_exists(RUR.CURRENT_WORLD.goal, "objects");
    RUR._ensure_key_exists(RUR.CURRENT_WORLD.goal.objects, coords);
    if (nb === 0) {
        try {
            delete RUR.CURRENT_WORLD.goal.objects[coords][specific_object];
        } catch (e) {}

        if (Object.keys(RUR.CURRENT_WORLD.goal.objects[coords]).length === 0){
            delete RUR.CURRENT_WORLD.goal.objects[coords];
            if (Object.keys(RUR.CURRENT_WORLD.goal.objects).length === 0){
                delete RUR.CURRENT_WORLD.goal.objects;
                if (Object.keys(RUR.CURRENT_WORLD.goal).length === 0){
                    delete RUR.CURRENT_WORLD.goal;
                }
            }
        }
    } else {
        RUR.CURRENT_WORLD.goal.objects[coords][specific_object] = nb;
    }
};

},{"./../exceptions.js":10,"./../translator.js":48,"./../utils/key_exist.js":54}],70:[function(require,module,exports){
require("./../exceptions.js");
require("./../utils/key_exist.js");
require("./../translator.js");

/** @function add_object_at_position
 * @memberof RUR
 * @instance
 * @summary This function sets a specified quantity of a given object
 * at a certain location.
 * By "object" we mean a type of object that can be taken or put down by Reeborg.
 *
 * @desc Cette fonction spécifie la quantité d'un certain type d'objet qui doit être
 * mis à un endroit donné.
 * Par "objet", on entend ici un objet qui peut être transporté ou déposé par Reeborg.
 *
 * @param {string} specific_object The name of the object type ; e.g. "token" <br>
 *                        _Le nom du type de l'objet; par exemple, "jeton"._
 * @param {integer} x - Position of the object
 *                    <br> _position de l'objet_
 * @param {integer} y - Position of the object
 *                    <br> _position de l'objet_
 * @param {integer} nb - Number of objects at that location;
 *           a value of zero is used to remove objects.
 *           <br> _Nombre d'objets à cet endroit;
 *           une valeur de zéro est utilisée pour supprimer les objets._
 *
 */
RUR.add_object_at_position = function (specific_object, x, y, nb){
    "use strict";
    var coords, cw;
    if (RUR.KNOWN_OBJECTS.indexOf(specific_object) == -1){
        throw new RUR.ReeborgError(RUR.translate("Unknown object").supplant({obj: specific_object}));
    }

    coords = x + "," + y;
    cw = RUR.CURRENT_WORLD;
    RUR._ensure_key_exists(cw, "objects");
    RUR._ensure_key_exists(cw.objects, coords);
    if (nb !== 0) {
        cw.objects[coords][specific_object] = nb;
    } else {
        try {
            delete cw.objects[coords][specific_object];
        } catch (e) {}
        if (Object.keys(cw.objects[coords]).length === 0){
            delete cw.objects[coords];
        }
    }
};

},{"./../exceptions.js":10,"./../translator.js":48,"./../utils/key_exist.js":54}],71:[function(require,module,exports){
require("./../recorder/record_frame.js");


RUR._add_robot = function (robot) {
    if (RUR.CURRENT_WORLD.robots === undefined){
        RUR.CURRENT_WORLD.robots = [];
    }
    RUR.CURRENT_WORLD.robots.push(robot);
    RUR.record_frame();
};

},{"./../recorder/record_frame.js":39}],72:[function(require,module,exports){
require("./../exceptions.js");
require("./../utils/key_exist.js");
require("./../translator.js");

/** @function give_object_to_robot
 * @memberof RUR
 * @instance
 * @summary Give a specified number of object to a robot (body). If the robot,
 *     is not specified, the default robot is used.
 *
 * @desc Donne un nombre d'objet à transporter par le robot (robot.body).
 *    Si le robot n'est pas spécifié, le robot par défaut est utilisé.
 *
 * @param {string} obj The name of the object type ; e.g. "token" <br>
 *                        _Le nom du type de l'objet; par exemple, "jeton"._
 * @param {integer} x - Position of the object
 *                    <br> _position de l'objet_
 * @param {integer} nb - Number of objects at that location;
 *           a value of zero is used to remove objects.
 *           <br> _Nombre d'objets à cet endroit;
 *           une valeur de zéro est utilisée pour supprimer les objets._
 * @param {robot.body} robot - Optional argument
 *                    <br> _argument optionnel_
 */

RUR.give_object_to_robot = function (obj, nb, robot) {
    var _nb, translated_arg = RUR.translate_to_english(obj);

    if (RUR.KNOWN_OBJECTS.indexOf(translated_arg) == -1){
        throw new RUR.ReeborgError(RUR.translate("Unknown object").supplant({obj: obj}));
    }

    obj = translated_arg;
    if (robot === undefined){
        robot = RUR.CURRENT_WORLD.robots[0];
    }
    RUR._ensure_key_exists(robot, "objects");

    _nb = filterInt(nb);
    if (_nb >= 0) {
        if (_nb !== 0) {
            robot.objects[obj] = _nb;
        } else if (robot.objects[obj] !== undefined) {
            delete robot.objects[obj];
        }
    } else {
        RUR.show_feedback("#Reeborg-shouts", nb + RUR.translate(" is not a valid value!"));
    }
};

},{"./../exceptions.js":10,"./../translator.js":48,"./../utils/key_exist.js":54}],73:[function(require,module,exports){
require("./../world/create_empty.js");
require("./../visible_robot.js");
require("./../visible_world.js");
var clone_world = require("./../world/clone_world.js").clone_world;

exports.reset_world = reset_world = function () {
    if (RUR.state.editing_world){
        return;
    }
    RUR.CURRENT_WORLD = clone_world(RUR._SAVED_WORLD);
    RUR.vis_robot.set_trace_style("default");
    RUR.MAX_STEPS = 1000;
    RUR.vis_world.draw_all();
};

reset_world();

},{"./../visible_robot.js":57,"./../visible_world.js":58,"./../world/clone_world.js":60,"./../world/create_empty.js":61}],74:[function(require,module,exports){
/*  The purpose of this module is to act as an intermediary between end user
modules in various languages (e.g. reeborg_en.py or reeborg_fr.js) and
the other modules.  This way, in theory, (most) refactoring can take place in the
basic javascript code without affecting the end user code.

Convention: all "public" function names follow the pattern RUR._xyz_
            Use four spaces for indentation
            Order function names alphabetically (in English)
 */

require("./translator.js");
require("./constants.js");
require("./control.js");
require("./custom_world_select.js");
require("./file_io.js");
require("./output.js");
require("./visible_robot.js");
require("./state.js");
require("./world.js");
require("./world_set.js");

RUR.inspect = function (obj){
    var props, result = "";
    for (props in obj) {
        if (typeof obj[props] === "function") {
            result += props + "()\n";
        } else{
            result += props + "\n";
        }
    }
    RUR.output._write(result);
};

function user_no_highlight () {
    if (RUR.state.highlight) {
        RUR.state.highlight = false;
        $("#highlight").addClass("blue-gradient");
        $("#highlight").removeClass("reverse-blue-gradient");
    }
}


RUR._at_goal_ = function () {
    return RUR.control.at_goal(RUR.CURRENT_WORLD.robots[0]);
};

RUR._build_wall_ = function() {
    RUR.control.build_wall(RUR.CURRENT_WORLD.robots[0]);
};

RUR._carries_object_ = function (arg) {
    return RUR.control.carries_object(RUR.CURRENT_WORLD.robots[0], arg);
};

RUR._clear_print_ = RUR.output.clear_print;

RUR._color_here_ = function () {
    var robot = RUR.CURRENT_WORLD.robots[0];
    return RUR.control.get_color_at_position(robot.x, robot.y);
};

RUR._default_robot_body_ = function () { // simply returns body
    return RUR.CURRENT_WORLD.robots[0];
};

RUR._dir_js_ = RUR.inspect;

RUR._done_ = RUR.control.done;

RUR._front_is_clear_ = function() {
  return RUR.control.front_is_clear(RUR.CURRENT_WORLD.robots[0]);
};


RUR._is_facing_north_ = function () {
    return RUR.control.is_facing_north(RUR.CURRENT_WORLD.robots[0]);
};

RUR._move_ = function () {
    RUR.control.move(RUR.CURRENT_WORLD.robots[0]);
};

RUR._new_robot_images_ = RUR.vis_robot.new_robot_images;

RUR._no_highlight_ = user_no_highlight;

RUR._object_here_ = function (arg) {
    return RUR.world_get.object_at_robot_position(RUR.CURRENT_WORLD.robots[0], arg);
};

RUR._paint_square_ = function (color) {
    // note that this can do more than simply setting the color: it can also
    // set the tile type.
    var robot = RUR.CURRENT_WORLD.robots[0];
    RUR.control.set_tile_at_position(x, y, color);
};

RUR._pause_ = RUR.control.pause;

RUR._print_html_ = function (html, append) {
    RUR.output.print_html(html, append);
};

RUR._put_ = function(arg) {
    RUR.control.put(RUR.CURRENT_WORLD.robots[0], arg);
};

RUR._recording_ = function(bool) {
    if (bool) {
        RUR.state.do_not_record = false;
    } else {
        RUR.state.do_not_record = true;
    }
};

RUR._remove_robots_ = function () {
    RUR.CURRENT_WORLD.robots = [];
};

RUR._right_is_clear_ = function() {
    return RUR.control.right_is_clear(RUR.CURRENT_WORLD.robots[0]);
};

RUR._set_max_nb_instructions_ = function(n){
    RUR.MAX_STEPS = n;
};

RUR._set_trace_color_ = function(color){
    RUR.CURRENT_WORLD.robots[0].trace_color = color;
};

RUR._set_trace_style_ = RUR.vis_robot.set_trace_style;

RUR._sound_ = RUR.control.sound;

RUR._take_ = function(arg) {
    RUR.control.take(RUR.CURRENT_WORLD.robots[0], arg);
};

RUR._think_ = RUR.control.think;

RUR._turn_left_ = function () {
    RUR.control.turn_left(RUR.CURRENT_WORLD.robots[0]);
};

RUR._view_source_js_ = RUR.output.view_source_js;

RUR._wall_in_front_ = function() {
    return RUR.control.wall_in_front(RUR.CURRENT_WORLD.robots[0]);
};

RUR._write_ = RUR.output.write;

RUR.__write_ = RUR.output._write;

RUR._wall_on_right_ = function() {
    return RUR.control.wall_on_right(RUR.CURRENT_WORLD.robots[0]);
};

RUR._MakeCustomMenu_ = RUR.custom_world_select.make;

RUR._World_ = RUR.file_io.load_world_from_program;

/*  methods below */

RUR._UR = {};

RUR._UR.at_goal_ = function (robot) {
    RUR.control.at_goal(robot);
};

RUR._UR.build_wall_ = function (robot) {
    RUR.control.build_wall(robot);
};

RUR._UR.carries_object_ = function (robot, obj) {
    RUR.control.carries_object(robot, obj);
};

RUR._UR.front_is_clear_ = function (robot) {
    RUR.control.front_is_clear(robot);
};

RUR._UR.is_facing_north_ = function (robot) {
    RUR.control.is_facing_north(robot);
};

RUR._UR.move_ = function (robot) {
    RUR.control.move(robot);
};

RUR._UR.object_here_ = function (robot, obj) {
    RUR.world_get.object_at_robot_position(robot, obj);
};

RUR._UR.put_ = function (robot, obj) {
    RUR.control.put(robot, obj);
};

RUR._UR.right_is_clear_ = function (robot) {
    RUR.control.right_is_clear(robot);
};

RUR._UR.set_model_ = function (robot, model) {
    RUR.control.set_model(robot, model);
};

RUR._UR.set_trace_color_ = function (robot, color) {
    RUR.control.set_trace_color(robot, color);
};

RUR._UR.set_trace_style_ = function (robot, style) {
    RUR.control.set_trace_style(robot, style);
};

RUR._UR.take_ = function (robot, obj) {
    RUR.control.take(robot, obj);
};

RUR._UR.turn_left_ = function (robot) {
    RUR.control.turn_left(robot);
};

RUR._UR.wall_in_front_ = function (robot) {
    RUR.control.wall_in_front(robot);
};

RUR._UR.wall_on_right_ = function (robot) {
    RUR.control.wall_on_right(robot);
};

},{"./constants.js":1,"./control.js":2,"./custom_world_select.js":3,"./file_io.js":14,"./output.js":32,"./state.js":45,"./translator.js":48,"./visible_robot.js":57,"./world.js":59,"./world_set.js":68}],75:[function(require,module,exports){
/* jshint -W069 */
require("./rur.js");
require("./translator.js");

RUR.blockly = {};
RUR.color_basic = 120;
RUR.color_condition = 240;
RUR.done_colour = "#aa0000";

/****  Begin over-riding Blockly's default */
Blockly.Blocks.loops.HUE = 230;

Blockly.JavaScript['text_print'] = function(block) {
  var argument0 = Blockly.JavaScript.valueToCode(block, 'TEXT',
      Blockly.JavaScript.ORDER_NONE) || '\'\'';
  return RUR.translate("write")+'(' + argument0 + ');\n';
};
Blockly.Msg.TEXT_PRINT_TITLE = "print %1";
Blockly.makeColour = function(hue) {
  if (hue === RUR.done_colour){
      return hue;
  }
  return goog.color.hsvToHex(hue, Blockly.HSV_SATURATION,
      Blockly.HSV_VALUE * 255);
};

if (document.documentElement.lang=="fr") {
    Blockly.Msg.PROCEDURES_DEFNORETURN_TITLE = "pour";
    Blockly.Msg.PROCEDURES_DEFRETURN_TITLE = "pour";
}
Blockly.Python.INDENT = '    ';
Blockly.JavaScript.INDENT = '    ';
Blockly.Msg.CONTROLS_IF_MSG_THEN = "    " + Blockly.Msg.CONTROLS_IF_MSG_THEN;
Blockly.Msg.CONTROLS_REPEAT_INPUT_DO = "    " + Blockly.Msg.CONTROLS_REPEAT_INPUT_DO;
Blockly.Msg.CONTROLS_WHILEUNTIL_INPUT_DO = "    " + Blockly.Msg.CONTROLS_WHILEUNTIL_INPUT_DO;

// removing mutator for simple function definitions as per
// https://groups.google.com/d/msg/blockly/_rrwh-Lc-sE/cHAk5yNfhUEJ

(function(){var old = Blockly.Blocks.procedures_defnoreturn.init;
    Blockly.Blocks.procedures_defnoreturn.init =
    function(){old.call(this);
        this.setMutator(undefined);
        // this.setColour(RUR.color_basic);
    };
})();

/****  End of over-riding Blockly's default */

Blockly.Blocks['_sound_'] = {
  init: function() {
    this.appendDummyInput()
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField(RUR.translate("sound"))
        .appendField(new Blockly.FieldCheckbox("TRUE"), "SOUND");
    this.setInputsInline(true);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(20);
    this.setTooltip('');
  }
};
Blockly.JavaScript['_sound_'] = function(block) {
  var checkbox_sound = block.getFieldValue('SOUND') == 'TRUE';
  if (checkbox_sound) {
      return RUR.translate("sound") + "(true);\n";
  } else {
      return RUR.translate("sound") + "(false);\n";
  }
};
Blockly.Python['_sound_'] = function(block) {
  var checkbox_sound = block.getFieldValue('SOUND') == 'TRUE';
  if (checkbox_sound) {
      return RUR.translate("sound") + "(True)\n";
  } else {
      return RUR.translate("sound") + "(False)\n";
  }
};


Blockly.Blocks['_think_'] = {
  init: function() {
    this.appendValueInput("NAME")
        .setCheck("Number")
        .appendField(RUR.translate("think"));
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setTooltip(RUR.translate("Delay between actions; default is 300 ms."));
  }
};
Blockly.Python['_think_'] = function(block) {
  var value_name = Blockly.Python.valueToCode(block, 'NAME', Blockly.Python.ORDER_ATOMIC);
  return RUR.translate("think") + "("+value_name+")\n";
};
Blockly.JavaScript['_think_'] = function(block) {
  var value_name = Blockly.JavaScript.valueToCode(block, 'NAME', Blockly.JavaScript.ORDER_ATOMIC);
  return RUR.translate("think") + "("+value_name+");\n";
};



Blockly.Blocks['_move_'] = {
  init: function() {
    this.setColour(RUR.color_basic);
    this.appendDummyInput().appendField(RUR.translate("move"));
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(RUR.translate("move forward"));
  }
};
Blockly.Python['_move_'] = function(block) {
  return RUR.translate("move")+'()\n';
};
Blockly.JavaScript['_move_'] = function(block) {
  return RUR.translate("move")+'();\n';
};


Blockly.Blocks['_turn_left_'] = {
  init: function() {
    this.setColour(RUR.color_basic);
    this.appendDummyInput().appendField(RUR.translate("turn_left")+" \u21BA");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(RUR.translate("turn left"));
  }
};
Blockly.Python['_turn_left_'] = function(block) {
  return RUR.translate("turn_left")+'()\n';
};
Blockly.JavaScript['_turn_left_'] = function(block) {
  return RUR.translate("turn_left")+'();\n';
};


Blockly.Blocks['_take_'] = {
  init: function() {
    this.setColour(RUR.color_basic);
    this.appendDummyInput().appendField(RUR.translate("take"));
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(RUR.translate("take object"));
  }
};
Blockly.Python['_take_'] = function(block) {
  return RUR.translate("take")+'()\n';
};
Blockly.JavaScript['_take_'] = function(block) {
  return RUR.translate("take")+'();\n';
};


Blockly.Blocks['_put_'] = {
  init: function() {
    this.setColour(RUR.color_basic);
    this.appendDummyInput().appendField(RUR.translate("put"));
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(RUR.translate("put object"));
  }
};
Blockly.Python['_put_'] = function(block) {
  return RUR.translate("put")+'()\n';
};
Blockly.JavaScript['_put_'] = function(block) {
  return RUR.translate("put")+'();\n';
};


Blockly.Blocks['_pause_'] = {
  init: function() {
    this.setColour(30);
    this.appendDummyInput().appendField(RUR.translate("pause"));
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(RUR.translate("Pause the program's execution."));
  }
};
Blockly.Python['_pause_'] = function(block) {
  return RUR.translate("pause")+'()\n';
};
Blockly.JavaScript['_pause_'] = function(block) {
  return RUR.translate("pause")+'();\n';
};


Blockly.Blocks['_build_wall_'] = {
  init: function() {
    this.setColour(RUR.color_basic);
    this.appendDummyInput().appendField(RUR.translate("build_wall"));
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(RUR.translate("Build a wall in front of the robot."));
  }
};
Blockly.Python['_build_wall_'] = function(block) {
  return RUR.translate("build_wall")+'()\n';
};
Blockly.JavaScript['_build_wall_'] = function(block) {
  return RUR.translate("build_wall")+'();\n';
};


Blockly.Blocks['_done_'] = {
  init: function() {
    this.setColour(RUR.done_colour);
    this.appendDummyInput().appendField(RUR.translate("done"));
    this.setPreviousStatement(true);
    this.setTooltip(RUR.translate("End the program's execution."));
  }
};
Blockly.Python['_done_'] = function(block) {
  return RUR.translate("done")+'()\n';
};
Blockly.JavaScript['_done_'] = function(block) {
  return RUR.translate("done")+'();\n';
};


Blockly.Blocks['_wall_in_front_or_right_'] = {
  init: function() {
    var choices =  [
        [RUR.translate("wall_in_front"), RUR.translate("wall_in_front")],
        [RUR.translate("wall_on_right"), RUR.translate("wall_on_right")]];
    this.setColour(RUR.color_condition);
    this.appendDummyInput().appendField(new Blockly.FieldDropdown(choices), 'choice');
    this.setOutput(true, "Boolean");
    this.setTooltip(RUR.translate("True if a wall is blocking the way."));
  }
};
Blockly.Python['_wall_in_front_or_right_'] = function(block) {
  return [block.getFieldValue('choice')+'()'];
};
Blockly.JavaScript['_wall_in_front_or_right_'] = function(block) {
  return [block.getFieldValue('choice')+'()'];
};


Blockly.Blocks['_front_or_right_is_clear_'] = {
  init: function() {
    var choices =  [
        [RUR.translate("front_is_clear"), RUR.translate("front_is_clear")],
        [RUR.translate("right_is_clear"), RUR.translate("right_is_clear")]];
    this.setColour(RUR.color_condition);
    this.appendDummyInput().appendField(new Blockly.FieldDropdown(choices), 'choice');
    this.setOutput(true, "Boolean");
    this.setTooltip(RUR.translate("True if nothing is blocking the way."));
  }
};
Blockly.Python['_front_or_right_is_clear_'] = function(block) {
  return [block.getFieldValue('choice')+'()'];
};
Blockly.JavaScript['_front_or_right_is_clear_'] = function(block) {
  return [block.getFieldValue('choice')+'()'];
};


Blockly.Blocks['_at_goal_'] = {
  init: function() {
    this.setColour(RUR.color_condition);
    this.appendDummyInput().appendField(RUR.translate("at_goal"));
    this.setOutput(true, "Boolean");
    this.setTooltip(RUR.translate("True if desired destination."));
  }
};
Blockly.Python['_at_goal_'] = function(block) {
  return [RUR.translate("at_goal")+'()'];
};
Blockly.JavaScript['_at_goal_'] = function(block) {
  return [RUR.translate("at_goal")+'()'];
};


Blockly.Blocks['_carries_object_'] = {
  init: function() {
    this.setColour(RUR.color_condition);
    this.appendDummyInput().appendField(RUR.translate("carries_object"));
    this.setOutput(true, "Boolean");
    this.setTooltip(RUR.translate("True if robot carries at least one object."));
  }
};
Blockly.Python['_carries_object_'] = function(block) {
  return [RUR.translate("carries_object")+'()'];
};
Blockly.JavaScript['_carries_object_'] = function(block) {
  return [RUR.translate("carries_object")+'()'];
};


Blockly.Blocks['_object_here_'] = {
  init: function() {
    this.setColour(RUR.color_condition);
    this.appendDummyInput().appendField(RUR.translate("object_here"));
    this.setOutput(true, "Boolean");
    this.setTooltip(RUR.translate("True if there is at least one object here."));
  }
};
Blockly.Python['_object_here_'] = function(block) {
  return [RUR.translate("object_here")+'()'];
};
Blockly.JavaScript['_object_here_'] = function(block) {
  return [RUR.translate("object_here")+'()'];
};


Blockly.Blocks['_is_facing_north_'] = {
  init: function() {
    this.setColour(RUR.color_condition);
    this.appendDummyInput().appendField(RUR.translate("is_facing_north"));
    this.setOutput(true, "Boolean");
    this.setTooltip(RUR.translate("True if robot is facing North."));
  }
};
Blockly.Python['_is_facing_north_'] = function(block) {
  return [RUR.translate("is_facing_north")+'()'];
};
Blockly.JavaScript['_is_facing_north_'] = function(block) {
  return [RUR.translate("is_facing_north")+'()'];
};


Blockly.Blocks['_star_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("star"))
        .appendField(new Blockly.FieldImage("/src/images/star.png", 15, 15, RUR.translate("star")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_star_'] = function(block) {
  return [RUR.translate("star")];
};
Blockly.JavaScript['_star_'] = function(block) {
  return [RUR.translate("star")];
};

Blockly.Blocks['_token_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("token"))
        .appendField(new Blockly.FieldImage("/src/images/token.png", 15, 15, RUR.translate("token")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_token_'] = function(block) {
  return [RUR.translate("token")];
};
Blockly.JavaScript['_token_'] = function(block) {
  return [RUR.translate("token")];
};

Blockly.Blocks['_apple_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("apple"))
        .appendField(new Blockly.FieldImage("/src/images/apple.png", 15, 15, RUR.translate("apple")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_apple_'] = function(block) {
  return [RUR.translate("apple")];
};
Blockly.JavaScript['_apple_'] = function(block) {
  return [RUR.translate("apple")];
};

Blockly.Blocks['_carrot_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("carrot"))
        .appendField(new Blockly.FieldImage("/src/images/carrot.png", 15, 15, RUR.translate("carrot")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_carrot_'] = function(block) {
  return [RUR.translate("carrot")];
};
Blockly.JavaScript['_carrot_'] = function(block) {
  return [RUR.translate("carrot")];
};

Blockly.Blocks['_dandelion_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("dandelion"))
        .appendField(new Blockly.FieldImage("/src/images/dandelion.png", 15, 15, RUR.translate("dandelion")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_dandelion_'] = function(block) {
  return [RUR.translate("dandelion")];
};
Blockly.JavaScript['_dandelion_'] = function(block) {
  return [RUR.translate("dandelion")];
};

Blockly.Blocks['_daisy_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("daisy"))
        .appendField(new Blockly.FieldImage("/src/images/daisy.png", 15, 15, RUR.translate("daisy")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_daisy_'] = function(block) {
  return [RUR.translate("daisy")];
};
Blockly.JavaScript['_daisy_'] = function(block) {
  return [RUR.translate("daisy")];
};

Blockly.Blocks['_triangle_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("triangle"))
        .appendField(new Blockly.FieldImage("/src/images/triangle.png", 15, 15, RUR.translate("triangle")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_triangle_'] = function(block) {
  return [RUR.translate("triangle")];
};
Blockly.JavaScript['_triangle_'] = function(block) {
  return [RUR.translate("triangle")];
};

Blockly.Blocks['_square_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("square"))
        .appendField(new Blockly.FieldImage("/src/images/square.png", 15, 15, RUR.translate("square")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_square_'] = function(block) {
  return [RUR.translate("square")];
};
Blockly.JavaScript['_square_'] = function(block) {
  return [RUR.translate("square")];
};

Blockly.Blocks['_strawberry_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("strawberry"))
        .appendField(new Blockly.FieldImage("/src/images/strawberry.png", 15, 15, RUR.translate("strawberry")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_strawberry_'] = function(block) {
  return [RUR.translate("strawberry")];
};
Blockly.JavaScript['_strawberry_'] = function(block) {
  return [RUR.translate("strawberry")];
};

Blockly.Blocks['_leaf_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("leaf"))
        .appendField(new Blockly.FieldImage("/src/images/leaf.png", 15, 15, RUR.translate("leaf")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_leaf_'] = function(block) {
  return [RUR.translate("leaf")];
};
Blockly.JavaScript['_leaf_'] = function(block) {
  return [RUR.translate("leaf")];
};

Blockly.Blocks['_banana_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("banana"))
        .appendField(new Blockly.FieldImage("/src/images/banana.png", 15, 15, RUR.translate("banana")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_banana_'] = function(block) {
  return [RUR.translate("banana")];
};
Blockly.JavaScript['_banana_'] = function(block) {
  return [RUR.translate("banana")];
};

Blockly.Blocks['_orange_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("orange"))
        .appendField(new Blockly.FieldImage("/src/images/orange.png", 15, 15, RUR.translate("orange")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_orange_'] = function(block) {
  return [RUR.translate("orange")];
};
Blockly.JavaScript['_orange_'] = function(block) {
  return [RUR.translate("orange")];
};

Blockly.Blocks['_tulip_'] = {
  init: function() {
    this.appendDummyInput()
        .appendField(RUR.translate("tulip"))
        .appendField(new Blockly.FieldImage("/src/images/tulip.png", 15, 15, RUR.translate("tulip")));
    this.setOutput(true, "String");
    this.setColour(0);
  }
};
Blockly.Python['_tulip_'] = function(block) {
  return [RUR.translate("tulip")];
};
Blockly.JavaScript['_tulip_'] = function(block) {
  return [RUR.translate("tulip")];
};









Blockly.Blocks['_carries_object_or_here_'] = {
  init: function() {
    this.appendValueInput("action")
        .setCheck("String")
        .appendField(new Blockly.FieldDropdown([
            [RUR.translate("carries_object"), RUR.translate("carries_object")],
            [RUR.translate("object_here"), RUR.translate("object_here")]]), "condition");
    this.setOutput(true, "Boolean");
    this.setColour(RUR.color_condition);
  }
};
Blockly.Python['_carries_object_or_here_'] = function(block) {
  var dropdown_condition = block.getFieldValue('condition');
  var value_action = Blockly.Python.valueToCode(block, 'action', Blockly.Python.ORDER_ATOMIC);
  return [RUR.translate(dropdown_condition)+'("'+ value_action +'")'];
};
Blockly.JavaScript['_carries_object_or_here_'] = function(block) {
  var dropdown_condition = block.getFieldValue('condition');
  var value_action = Blockly.JavaScript.valueToCode(block, 'action', Blockly.JavaScript.ORDER_ATOMIC);
  return [RUR.translate(dropdown_condition)+'("'+ value_action +'")'];
};


Blockly.Blocks['_take_or_put_'] = {
  init: function() {
    this.appendValueInput("obj")
        .setCheck("String")
        .appendField(new Blockly.FieldDropdown([
            [RUR.translate("take"), RUR.translate("take")],
            [RUR.translate("put"), RUR.translate("put")]]), "action");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(RUR.color_basic);
  }
};
Blockly.Python['_take_or_put_'] = function(block) {
  var dropdown_action = block.getFieldValue('action');
  var value_obj = Blockly.Python.valueToCode(block, 'obj', Blockly.Python.ORDER_ATOMIC);
  return dropdown_action + '("' + value_obj + '")\n';
};
Blockly.JavaScript['_take_or_put_'] = function(block) {
  var dropdown_action = block.getFieldValue('action');
  var value_obj = Blockly.JavaScript.valueToCode(block, 'obj', Blockly.JavaScript.ORDER_ATOMIC);
  return dropdown_action + '("' + value_obj + '");\n';
};



/** Simple if skeletton from
https://blockly-demo.appspot.com/static/demos/blockfactory/index.html#k8aine
****/

Blockly.Blocks['_if_'] = {
  init: function() {
    this.appendValueInput("condition")
        .setCheck("Boolean")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendStatementInput("then")
        .setCheck(null)
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
    // this.setTooltip('');
  }
};
Blockly.JavaScript['_if_'] = function(block) {
  var value_condition = Blockly.JavaScript.valueToCode(block, 'condition', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_then = Blockly.JavaScript.statementToCode(block, 'then');
  return "if (" + value_condition + ") {\n" + statements_then + "}\n";

};
Blockly.Python['_if_'] = function(block) {
  var value_condition = Blockly.Python.valueToCode(block, 'condition', Blockly.Python.ORDER_ATOMIC);
  var statements_then = Blockly.Python.statementToCode(block, 'then');
  return "if " + value_condition + ":\n" + statements_then;
};


Blockly.Blocks['_if_else_'] = {
  init: function() {
    this.appendValueInput("condition")
        .setCheck("Boolean")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendStatementInput("then")
        .setCheck(null)
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
    this.appendStatementInput("else")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
    this.setTooltip('');
  }
};
Blockly.JavaScript['_if_else_'] = function(block) {
  var value_condition = Blockly.JavaScript.valueToCode(block, 'condition', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_then = Blockly.JavaScript.statementToCode(block, 'then');
  var statements_else = Blockly.JavaScript.statementToCode(block, 'else');
  return "if (" + value_condition + ") {\n" + statements_then + "} else {\n" + statements_else+"}\n";
};
Blockly.Python['_if_else_'] = function(block) {
  var value_condition = Blockly.Python.valueToCode(block, 'condition', Blockly.Python.ORDER_ATOMIC);
  var statements_then = Blockly.Python.statementToCode(block, 'then');
  var statements_else = Blockly.Python.statementToCode(block, 'else');
  return "if " + value_condition + ":\n" + statements_then + "else:\n" + statements_else;
};


Blockly.Blocks['_if_else_if_else_'] = {
  init: function() {
    this.appendValueInput("condition")
        .setCheck("Boolean")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendStatementInput("do")
        .setCheck(null)
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.appendValueInput("condition2")
        .setCheck("Boolean")
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
    this.appendStatementInput("do2")
        .setCheck(null)
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
    this.appendStatementInput("else")
        .setCheck(null)
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour(210);
    this.setTooltip('');
  }
};
Blockly.JavaScript['_if_else_if_else_'] = function(block) {
  var value_condition = Blockly.JavaScript.valueToCode(block, 'condition', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_do = Blockly.JavaScript.statementToCode(block, 'do');
  var value_condition2 = Blockly.JavaScript.valueToCode(block, 'condition2', Blockly.JavaScript.ORDER_ATOMIC);
  var statements_do2 = Blockly.JavaScript.statementToCode(block, 'do2');
  var statements_else = Blockly.JavaScript.statementToCode(block, 'else');
  return "if (" + value_condition + ") {\n" + statements_do +
         "} else if (" + value_condition2 + ") {\n" + statements_do2 +
         "} else {\n" + statements_else+"}\n";
};
Blockly.Python['_if_else_if_else_'] = function(block) {
  var value_condition = Blockly.Python.valueToCode(block, 'condition', Blockly.Python.ORDER_ATOMIC);
  var statements_do = Blockly.Python.statementToCode(block, 'do');
  var value_condition2 = Blockly.Python.valueToCode(block, 'condition2', Blockly.Python.ORDER_ATOMIC);
  var statements_do2 = Blockly.Python.statementToCode(block, 'do2');
  var statements_else = Blockly.Python.statementToCode(block, 'else');
  return "if " + value_condition + ":\n" + statements_do +
         "elif " + value_condition2 + ":\n" + statements_do2 +
         "else:\n" + statements_else;
};

RUR.blockly.workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    zoom:{
        controls: true,
        wheel: true,
        startScale: 1.0,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2},
    trashcan: true});


$("#blocklyDiv").resizable({
    resize: function() {
        $("#blocklyDiv:first-child").height($(this).height()-1).width($(this).width()-1);
        window.dispatchEvent(new Event('resize'));
    }
});

$("#blockly-wrapper").draggable({
    cursor: "move",
    handle: "p",
    drag: function( event, ui ) {
        window.dispatchEvent(new Event('resize'));
    },
    stop: function( event, ui ) {
        window.dispatchEvent(new Event('resize'));
    }
});

},{"./rur.js":43,"./translator.js":48}],76:[function(require,module,exports){
/* Sets up the UI for various editors.

called by zzz_doc_ready.js
*/
require("./rur.js");

RUR.zz_dr_editor_ui = function () {
    $("#tabs").tabs({
            heightStyle: "auto",
            activate: function(event, ui){
                editor.refresh();
                library.refresh();
                pre_code_editor.refresh();
                post_code_editor.refresh();
                description_editor.refresh();
                onload_editor.refresh();
            }
    });

    $("#editor-panel").resizable({
        resize: function() {
            editor.setSize(null, $(this).height()-40);
            library.setSize(null, $(this).height()-40);
            pre_code_editor.setSize(null, $(this).height()-40);
            post_code_editor.setSize(null, $(this).height()-40);
            description_editor.setSize(null, $(this).height()-40);
            onload_editor.setSize(null, $(this).height()-40);
        }
    }).draggable({cursor: "move", handle: "ul"});
};

},{"./rur.js":43}],77:[function(require,module,exports){
/* Sets up what happens when the user clicks on various html elements.

called by zzz_doc_ready.js
*/

require("./translator.js");
require("./world.js");
require("./state.js");
require("./world_editor.js");
require("./permalink.js");
require("./visible_robot.js");

var export_world = require("./world/export_world.js").export_world;


RUR.zz_dr_onclick = function () {

    function load_file (obj) {
        $("#fileInput").click();
        var fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', function(e) {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = function(e) {
                obj.setValue(reader.result);
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    $("#load-world").on("click", function(evt) {
        $("#fileInput").click();
        var fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', function(e) {
            var file = fileInput.files[0];
            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    RUR.world.import_world(reader.result);
                } catch (e) {  // jshint ignore:line
                    console.log("invalid world", e);
                    RUR.show_feedback("#Reeborg-shouts",
                                         RUR.translate("Invalid world file."));
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    });

    $("#editor-tab").on("click", function (evt) {
        if (RUR.state.programming_language == "python" && !RUR.state.editing_world) {
            $("#highlight").show();
            $("#watch-variables-btn").show();
        } else {
            $("#highlight").hide();
            $("#watch-variables-btn").hide();
        }
    });

    $("#library-tab").on("click", function (evt) {
        $("#highlight").hide();
        $("#watch-variables-btn").hide();
    });

    $("#save-editor").on("click", function (evt) {
        var blob = new Blob([editor.getValue()], {
            type: "text/javascript;charset=utf-8"
        });
        saveAs(blob, "filename"); // saveAs defined in src/libraries/filesaver.js
    });

    $("#save-library").on("click", function (evt) {
        var blob = new Blob([library.getValue()], {
            type: "text/javascript;charset=utf-8"
        });
        saveAs(blob, "filename");
    });

    $("#save-permalink").on("click", function (evt) {
        var blob = new Blob([RUR.permalink.__create()], {
            type: "text/javascript;charset=utf-8"
        });
        saveAs(blob, "filename");
    });

    $("#save-world").on("click", function (evt) {
        RUR.CURRENT_WORLD = RUR.world.update_from_editors(RUR.CURRENT_WORLD);
        var blob = new Blob([export_world()], {
            type: "text/javascript;charset=utf-8"
        });
        saveAs(blob, "filename.json", true);
    });

    $("#load-editor").on("click", function (evt) {
        load_file(editor);
    });

    $("#load-library").on("click", function (evt) {
        load_file(library);
    });


    $("#add-editor-to-world").on("click", function(evt) {
        if ($(this).prop("checked")) {
            RUR.CURRENT_WORLD.editor = editor.getValue();
        } else {
            RUR.CURRENT_WORLD.editor = null;
        }
    });

    $("#add-library-to-world").on("click", function(evt) {
        if ($(this).prop("checked")) {
            RUR.CURRENT_WORLD.library = library.getValue();
        } else {
            RUR.CURRENT_WORLD.library = null;
        }
    });


};

},{"./permalink.js":33,"./state.js":45,"./translator.js":48,"./visible_robot.js":57,"./world.js":59,"./world/export_world.js":62,"./world_editor.js":64}],78:[function(require,module,exports){

require("./state.js");
require("./zz_dr_onclick.js");

require("./zz_dr_editor_ui.js");
require("./zz_dr_blockly.js");

require("./tooltip.js");

var rec_reset = require("./recorder/reset.js").reset;

    var prog_lang, url_query, name;
    RUR.state.human_language = document.documentElement.lang;

    // RUR.state.set_initial_values();

    function everything_loaded () {
        var loaded, total_images, py_modules=0;
        if (RUR._NB_IMAGES_LOADED == RUR._NB_IMAGES_TO_LOAD &&
            RUR.vis_robot.loaded_images == RUR.vis_robot.nb_images){
            RUR.vis_world.draw_all();
            $("#splash-screen").hide();
        } else {
            loaded = RUR._NB_IMAGES_LOADED + RUR.vis_robot.loaded_images;
            total_images = RUR._NB_IMAGES_TO_LOAD + RUR.vis_robot.nb_images;
            if (!RUR.state.images_loaded) {
                $("#splash-text").html("Loading Python modules. <br>Images: " + loaded + "/" + total_images);
            } else {
                $("#splash-text").html("Images: " + loaded + "/" + total_images);
            }
            requestAnimationFrame(everything_loaded);
        }
    }
    everything_loaded();
    rec_reset();
    // RUR.rec.reset();

    RUR.tooltip.init();


    //TODO: replace the following
    //RUR.cd.create_custom_dialogs();
    RUR.zz_dr_onclick();
    // RUR.zz_dr_onchange();
    RUR.zz_dr_editor_ui();

    brython({debug:1, pythonpath:['/src/python']});

    // try {
    //     RUR.reset_code_in_editors();
    // } catch (e){
    //     console.log(e);
    //     RUR.show_feedback("#Reeborg-shouts",
    //                     "Your browser does not support localStorage. " +
    //                     "You will not be able to save your functions in the library.");
    // }
    // for embedding in iframe
    addEventListener("message", receiveMessage, false);
    function receiveMessage(event){
        RUR.permalink.update(event.data);
    }

    RUR.kbd.select();

    RUR.make_default_menu(RUR.state.human_language);


    // url_query = parseUri(window.location.href);
    // if (url_query.queryKey.proglang !== undefined &&
    //    url_query.queryKey.world !== undefined &&
    //    url_query.queryKey.editor !== undefined &&
    //    url_query.queryKey.library !== undefined) {
    //     prog_lang = url_query.queryKey.proglang;
    //     $('input[type=radio][name=programming_language]').val([prog_lang]);
    //     RUR.reset_programming_language(prog_lang);
    //     RUR.world.import_world(decodeURIComponent(url_query.queryKey.world));
    //     name = RUR.translate("PERMALINK");
    //     localStorage.setItem("user_world:"+ name, export_world());
    //     RUR.storage.save_world(name);
    //
    //     editor.setValue(decodeURIComponent(url_query.queryKey.editor));
    //     library.setValue(decodeURIComponent(url_query.queryKey.library));
    // } else {
    //     prog_lang = localStorage.getItem("last_programming_language_" + RUR.state.human_language);
    //     switch (prog_lang) {
    //         case 'python-' + RUR.state.human_language:
    //             $("#python-choices").val("editor").change();  // jshint ignore:line
    //         case 'javascript-' + RUR.state.human_language:
    //             $("#javascript-choices").val("editor").change(); // jshint ignore:line
    //         default:
    //             RUR.reset_programming_language('python-' + RUR.state.human_language);
    //     }
    //     // trigger it to load the initial world.
    //     $("#select-world").change();
    // }

},{"./recorder/reset.js":40,"./state.js":45,"./tooltip.js":47,"./zz_dr_blockly.js":75,"./zz_dr_editor_ui.js":76,"./zz_dr_onclick.js":77}],79:[function(require,module,exports){
if (RUR === undefined) {
    RUR = {};
}
RUR.en = {};

RUR.en["SITE NAME"] = "Reeborg's World";
RUR.en["WORLD INFO"] = "World Info";
RUR.en["EDITOR VISIBLE BLOCKLY"] = "Keep editor visible";

},{}],80:[function(require,module,exports){
if (RUR === undefined) {
    RUR = {};
}
RUR.fr = {};

RUR.fr["SITE NAME"] = "Le monde de Reeborg";
RUR.fr["WORLD INFO"] = "Description";
RUR.fr["EDITOR VISIBLE BLOCKLY"] = "Garder l'éditeur visible";

},{}],81:[function(require,module,exports){
if (RUR === undefined) {
    RUR = {};
}
RUR.ko = {};

RUR.ko["SITE NAME"] = "리보그의 세계";
RUR.ko["WORLD INFO"] = "세계 정보";
RUR.ko["EDITOR VISIBLE BLOCKLY"] = "Keep editor visible";

},{}],82:[function(require,module,exports){

var _recorded_ids = [];
var _text_elements = [];

record_id = function (id, text) {
    if (_recorded_ids.indexOf(id) !== -1) {
        alert("Fatal error: " + id + " already exists.");
    } else {
        _recorded_ids.push(id);
    }
    if (text !== undefined) {
        add_msg(id, text);
    }
};

add_msg = function (id, msg){
    _text_elements.push([id, msg]);
};

update_ui = function (lang) {
    "use strict";
    var i, id, msg;
    window.document.documentElement.lang = lang;

    for(i=0; i<_text_elements.length; i++) {
        id = "#" + _text_elements[i][0];
        msg = _text_elements[i][1];
        $(id).text(RUR.translate(msg));
    }
};

exports.update_ui = update_ui;
exports.record_id = record_id;

add_msg("site-name", "SITE NAME");
add_msg("world-info-button", "WORLD INFO");
add_msg("visible-blockly", "EDITOR VISIBLE BLOCKLY");

},{}],83:[function(require,module,exports){
/** Since Javascript is a dynamic language, a user or world creator could
    (possibly accidently) redefine a basic function, which could lead to some
    apparent bugs.  For this reason, we include a function whose role is to
    make it possible to reset the basic functions to their desired values.

    These functions have to be known globally; the standard way would be to do:

        var fn_name;
        RUR.reset_definitions = function () {
            fn_name = ...;
            ...
            UsedRobot.prototype.fn_name = ...
        }

    Instead we use the pattern following pattern which does not require to write
    a separate declaration.

        RUR.reset_definitions = function () {
            window.fn_name = ...;
            ...
            UsedRobot.prototype.fn_name = ...
        }
**/

window.RUR = RUR || {};

var UsedRobot;

RUR.reset_definitions_en = function () {

    window.at_goal = RUR._at_goal_;
    window.build_wall = RUR._build_wall_;
    window.carries_object = RUR._carries_object_;
    window.default_robot = function () {
        var r = Object.create(UsedRobot.prototype);
        r.body = RUR._default_robot_body_();
        return r;
    };
    window.dir_js = RUR._dir_js_;
    window.done = RUR._done_;
    window.front_is_clear = RUR._front_is_clear_;
    window.is_facing_north = RUR._is_facing_north_;
    window.move = RUR._move_;
    window.new_robot_images = RUR._new_robot_images_;
    window.object_here = RUR._object_here_;
    window.pause = RUR._pause_;
    window.print_html = RUR._print_html_;
    window.put = RUR._put_;
    window.recording = RUR._recording_;
    window.remove_robots = RUR._remove_robots_;
    window.right_is_clear = RUR._right_is_clear_;
    window.set_max_steps = RUR._set_max_steps_;
    window.sound = RUR._sound_;
    window.take = RUR._take_;
    window.think = RUR._think_;
    window.turn_left = RUR._turn_left_;
    window.view_source_js = RUR._view_source_js_;
    window.wall_in_front = RUR._wall_in_front_;
    window.wall_on_right = RUR._wall_on_right_;
    window.write = RUR._write_;
    window._write = RUR.__write_;
    window.MakeCustomMenu = RUR._MakeCustomMenu_;
    window.World = RUR._World_;


    UsedRobot = function (x, y, orientation, tokens)  {
        this.body = RUR.robot.create_robot(x, y, orientation, tokens);
        RUR._add_robot(this.body);
    };

    UsedRobot.prototype.at_goal = function () {
        RUR._UR.at_goal_(this.body);
    };

    UsedRobot.prototype.build_wall = function () {
        RUR._UR.build_wall_(this.body);
    };

    UsedRobot.prototype.carries_object = function () {
        RUR._UR.carries_object_(this.body);
    };

    UsedRobot.prototype.front_is_clear = function () {
        RUR._UR.front_is_clear_(this.body);
    };

    UsedRobot.prototype.is_facing_north = function () {
        RUR._UR.is_facing_north_(this.body);
    };

    UsedRobot.prototype.move = function () {
        RUR._UR.move_(this.body);
    };

    UsedRobot.prototype.object_here = function (obj) {
        RUR._UR.object_here_(this.body, obj);
    };

    UsedRobot.prototype.put = function () {
        RUR._UR.put_(this.body);
    };

    UsedRobot.prototype.right_is_clear = function () {
        RUR._UR.right_is_clear_(this.body);
    };

    UsedRobot.prototype.set_model = function(model) {
        RUR._UR.set_model_(this.body, model);
    };

    UsedRobot.prototype.set_trace_color_ = function (robot, color) {
        RUR._UR.set_trace_color_(robot, color);
    };

    UsedRobot.prototype.set_trace_style_ = function (robot, style) {
        RUR._UR.set_trace_style_(robot, style);
    };

    UsedRobot.prototype.take = function () {
        RUR._UR.take_(this.body);
    };


    UsedRobot.prototype.turn_left = function () {
        RUR._UR.turn_left_(this.body);
    };

    UsedRobot.prototype.wall_in_front = function () {
        RUR._UR.wall_in_front_(this.body);
    };

    UsedRobot.prototype.wall_on_right = function () {
        RUR._UR.wall_on_right_(this.body);
    };

    // English specific and only for compatibility with rur-ple
    // do not translate the following
    window.put_beeper = put;
    window.pick_beeper = take;
    window.turn_off = done;
    window.on_beeper = object_here;
    window.next_to_a_beeper = object_here;
    window.carries_beepers = carries_object;
    window.set_delay = think;
    window.facing_north = is_facing_north;
};

},{}],84:[function(require,module,exports){
/* See reeborg_en.js */
window.RUR = RUR || {};

var RobotUsage;

RUR.reset_definitions_fr = function () {

    window.au_but = RUR._at_goal_;
    window.construit_un_mur = RUR._build_wall_;
    window.transporte = RUR._carries_object_;
    window.robot_par_defaut = function () {
        var r = Object.create(RobotUsage.prototype);
        r.body = RUR._default_robot_body_();
        return r;
    };
    window.dir_js = RUR._dir_js_;
    window.termine = RUR._done_;
    window.rien_devant = RUR._front_is_clear_;
    window.est_face_au_nord = RUR._is_facing_north_;
    window.avance = RUR._move_;

    mur_devant = RUR._wall_in_front_;
    window.nouvelles_images_de_robot = function (image) {
        if (images.est !== undefined) {
            images.east = images.est;
        }
        if (images.ouest !== undefined) {
            images.west = images.ouest;
        }
        if (images.sud !== undefined) {
            images.south = images.sud;
        }
        if (images.nord !== undefined) {
            images.north = images.nord;
        }
        RUR._new_robot_images_(images);
    };
    window.objet_ici = RUR._object_here_;
    window.pause = RUR._pause_;
    window.print_html = RUR._print_html_;
    window.depose = RUR._put_;
    window.enregistrement = RUR._recording_;
    window.plus_de_robots = RUR._remove_robots_;
    window.rien_a_droite = RUR._right_is_clear_;
    window.nombre_d_instructions = RUR._set_max_steps_;
    window.son = RUR._sound_;
    window.prend = RUR._take_;
    window.pense = RUR._think_;
    window.tourne_a_gauche = RUR._turn_left_;
    window.voir_source_js = RUR._view_source_js_;
    window.mur_devant = RUR._wall_in_front_;
    window.mur_a_droite = RUR._wall_on_right_;
    window.ecrit = RUR._write_;
    window._write = RUR.__write_;
    window.MenuPersonalise = RUR._MakeCustomMenu_;
    window.Monde = RUR._World_;

    // The following are for OOP programming in Javascript
    RobotUsage = function (x, y, orientation, tokens)  {
        this.body = RUR.robot.create_robot(x, y, orientation, tokens);
        RUR._add_robot(this.body);
    };
    RobotUsage.prototype.au_but = function () {
        RUR._UR.at_goal_(this.body);
    };

    RobotUsage.prototype.construit_un_mur = function () {
        RUR._UR.build_wall_(this.body);
    };

    RobotUsage.prototype.transporte = function () {
        RUR._UR.carries_object_(this.body);
    };

    RobotUsage.prototype.rien_devant = function () {
        RUR._UR.front_is_clear_(this.body);
    };

    RobotUsage.prototype.est_face_au_nord = function () {
        RUR._UR.is_facing_north_(this.body);
    };

    RobotUsage.prototype.avance = function () {
        RUR._UR.move_(this.body);
    };

    RobotUsage.prototype.objet_ici = function (obj) {
        RUR._UR.object_here_(this.body, obj);
    };

    RobotUsage.prototype.depose = function () {
        RUR._UR.put_(this.body);
    };

    RobotUsage.prototype.rien_a_droite = function () {
        RUR._UR.right_is_clear_(this.body);
    };

    RobotUsage.prototype.modele = function(model) {
        RUR._UR.set_model_(this.body, model);
    };

    RobotUsage.prototype.mur_devant = function () {
        RUR.control.wall_in_front(this.body);
    };

    RobotUsage.prototype.couleur_de_trace = function (robot, color) {
        RUR._UR.set_trace_color_(robot, color);
    };

    RobotUsage.prototype.style_de_trace = function (robot, style) {
        RUR._UR.set_trace_style_(robot, style);
    };

    RobotUsage.prototype.prend = function () {
        RUR._UR.take_(this.body);
    };

    RobotUsage.prototype.tourne_a_gauche = function () {
        RUR._UR.turn_left_(this.body);
    };

    RobotUsage.prototype.mur_devant = function () {
        RUR._UR.wall_in_front_(this.body);
    };

    RobotUsage.prototype.mur_a_droite = function () {
        RUR._UR.wall_on_right_(this.body);
    };

};

},{}]},{},[15]);
