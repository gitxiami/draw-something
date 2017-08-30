const ROOMS = global.ROOMS;
const Room = require('./Room');
const Game = require('./Game');

const okCallback = (cb) => {
    typeof cb === 'function' && cb({
        ok: 1,
        time: Date.now()
    });
};
const failCallback = (cb, msg) => {
    typeof cb === 'function' && cb({
        ok: 0,
        msg,
        time: Date.now()
    });
};

const handler = {
    enterRoom (roomName, cb) { // people enter
        if (!roomName) {
            failCallback(cb, 'invalid room name!');
            return;
        }

        if (this.room) this.room.peopleLeave(this);

        if (!ROOMS[roomName]) {
            ROOMS[roomName] = new Room({ name: roomName });
            ROOMS[roomName].on('roomEmpty', room => {
                Reflect.deleteProperty(ROOMS, room.name);
            });
        }

        this.room = ROOMS[roomName];
        this.room.peopleEnter(this);

        okCallback(cb);
    },
    leaveRoom ({}, cb) { // people leave
        if (!this.room) {
            failCallback(cb, 'you\'re not in a room!');
            return;
        }
        this.room.peopleLeave(this);
        this.room = null;
        okCallback(cb);
    },
    setUserInfo (info, cb) { // set user info
        Object.assign(this.info, info);
        okCallback(cb);
    },
    sendRoomMessage (message, cb) { // send message in room
        if (!this.room) {
            failCallback(cb, 'you\'re not in a room!');
            return;
        }
        this.room.broadcast({
            channel: 'message',
            data: { message },
            sender: this
        });
        okCallback(cb);
    },
    gameStart ({}, cb) { // game start
        let room = this.room;
        if (!room) {
            failCallback(cb, 'you\'re not in a room!');
            return;
        }
        if (room.owner !== this) {
            failCallback(cb, 'you\'re not the room owner!');
            return;
        }
        if (room.game) {
            failCallback(cb, 'game already start!');
            return;
        }
        room.game = new Game({
            players: room.client,
            room,
            roundTime: 60
        });
        room.game.gameStart();

        room.game.on('gameEnd', () => {
            room.game = null;
        });
        okCallback(cb);
    },
    drawPicture (data, cb) {
        if (!this.room) {
            failCallback(cb, 'you\'re not in a room!');
            return;
        }
        if (!this.room.game) {
            failCallback(cb, 'you\'re not in a game!');
            return;
        }
        this.room.broadcast({
            channel: 'drawPicture',
            data,
            sender: this
        });
        okCallback(cb);
    },
    disconnect () { // user disconnect
        this.room && this.room.peopleLeave(this);
    },
};


module.exports = class Client {
    constructor ({
        io
    }) {
        this.id = io.id;
        this.io = io;
        this.info = {};
        this.room = null;

        for (let event in handler) {
            io.on(event, handler[event].bind(this));
        }
    }
    broadcastInRoom ({
        channel,
        message,
        callback,
    }) {
        this.room && this.room.broadcast({
            channel,
            message,
            callback,
            sender: this,
            exclude: this
        })
    }
};