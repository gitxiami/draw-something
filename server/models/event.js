const IO = global.IO;
const ROOMS = global.ROOMS;
const util = require('../utils');

module.exports = {
    sendRoomList () {
        IO.emit('roomList', util.getRoomList());
    }
};