import store from '../reducers';
import * as roomAction from 'actions/room';
import * as networkActions from 'actions/network';
import * as userActions from 'actions/user';
import * as gameActions from 'actions/game';
import * as errorActions from 'actions/error';
import { canvasStroke$, canvasReset$ } from 'flow/canvas';
import ls from 'api/localStorage';

export default (socket) => {
    // main
    socket.on('connect', () => {
        store.dispatch(networkActions.wsConnect());
    });

    socket.on('disconnect', () => {
        store.dispatch(networkActions.wsDisconnect());
    });
    socket.on('reconnect', () => {
        console.log('reconnect'); // todo: re enterRoom on reconnect
        let state = store.getState();
        let roomName = state.room.currentRoom.name;
        if (roomName) {
            socket.emit('enterRoom', roomName);
        }
    });
    socket.on('logout', (d) => {
        console.error(d, 'logout');
        store.dispatch(errorActions.errorLogout());
    });
    socket.on('errorMsg', (d) => {
        console.error(d);
    });
    socket.on('userData', d => {
        let id = ls.get('clientId');
        if (!id) {
            id = '游客' + d.id.slice(0, 6);
        }
        socket.emit('setClientId', id);
        ls.set('clientId', id, 2 * 60 * 60 * 1000);

        let info = ls.get('clientInfo');
        if (info) {
            socket.emit('setClientInfo', info);
        }

        store.dispatch(userActions.setUserData({
            id
        }));
    });
    // room
    socket.on('roomList', d => {
        let list = d.map(roomInfo => ({
            roomName: roomInfo.roomName,
            peopleCount: roomInfo.peopleCount,
            owner: roomInfo.owner,
        }));
        store.dispatch(roomAction.updateRoomList(list));
    });
    socket.on('roomInfo', d => {
        let info = {
            people: d.people,
            owner: d.owner,
            messageList: d.messageList || [],
        };
        store.dispatch(roomAction.setRoomInfo(info));
    });
    socket.on('roomOwnerChanged', d => {
        let info = {
            owner: d.owner
        };
        store.dispatch(roomAction.setRoomInfo(info));
    });
    socket.on('peopleEnterRoom', message => {
        store.dispatch(roomAction.addRoomPeople(message.sender));
        store.dispatch(roomAction.receiveRoomMessage({
            timestamp: message.timestamp,
            type: 'system',
            by: message.sender,
            content: 'enter',
        }));
    });
    socket.on('peopleLeaveRoom', message => {
        store.dispatch(roomAction.delRoomPeople(message.sender));
        store.dispatch(roomAction.receiveRoomMessage({
            timestamp: message.timestamp,
            type: 'system',
            by: message.sender,
            content: 'leave',
        }));
    });
    socket.on('roomMessage', message => {
        store.dispatch(roomAction.receiveRoomMessage({
            timestamp: message.timestamp,
            type: 'message',
            by: message.sender || null,
            content: message.content,
        }));
    });
    // game
    socket.on('setGameStatus', status => {
        store.dispatch(gameActions.setGameStatus(status));
        if (status === 'going') { // new round | game end
            store.dispatch(gameActions.setGameWord(''));
            canvasReset$.next();
        }
    });
    socket.on('setGameCountDown', countDown => {
        store.dispatch(gameActions.setGameCountDown(countDown));
    });
    socket.on('setGameBanker', banker => {
        store.dispatch(gameActions.setGameBanker(banker));
    });
    socket.on('setGamePlayers', players => {
        store.dispatch(gameActions.setGamePlayers(players));
    });
    socket.on('updateGamePlayerScore', ({ playerId, score }) => {
        store.dispatch(gameActions.updateGamePlayerScore({ playerId, score }));
    });
    socket.on('roundWord', word => {
        store.dispatch(gameActions.setGameWord(word));
    });
    socket.on('initCanvas', data => {
        canvasReset$.next();
        for (let stroke of data) {
            canvasStroke$.next(stroke);
        }
    });
    socket.on('canvasStroke', stroke => {
        canvasStroke$.next(stroke);
    });
}