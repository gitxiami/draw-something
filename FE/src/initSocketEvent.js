import store from './reducers';
import * as roomAction from 'actions/room';
import * as networkActions from 'actions/network';
import * as userActions from 'actions/user';
import * as gameActions from 'actions/game';
import * as updaterActions from 'actions/updater';
import * as errorActions from 'actions/error';
import { canvasStroke$, canvasReset$ } from 'flow/canvas';
import { message$ } from 'flow/message';
import { userUpdate$ } from 'flow/updater';
import ls from 'api/localStorage';
import { nicknames } from 'config';
import { random } from 'utils/main';

message$.subscribe(message => {
    store.dispatch(roomAction.receiveRoomMessage(message));
});
userUpdate$.subscribe(message => {
    store.dispatch(updaterActions.updateUserData(message));
});
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
            id = d.id;
        }
        socket.emit('setClientId', id);
        ls.set('clientId', id, 2 * 60 * 60 * 1000);

        let info = ls.get('clientInfo') || {
            name: nicknames.adj[random(nicknames.adj.length)] + '的' + nicknames.role[random(nicknames.role.length)],
        };
        if (!ls.get('clientInfo')) {
            ls.set('clientInfo', {
                name: nicknames.adj[random(nicknames.adj.length)] + '的' + nicknames.role[random(nicknames.role.length)],
            }, 7 * 24 * 60 * 60 * 1000);
        }
        socket.emit('setClientInfo', info);
        store.dispatch(userActions.setUserData({
            id,
            info,
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
        message$.next({
            timestamp: message.timestamp,
            type: 'enter',
            by: message.sender,
        });
    });
    socket.on('peopleLeaveRoom', message => {
        store.dispatch(roomAction.delRoomPeople(message.sender));
        message$.next({
            timestamp: message.timestamp,
            type: 'leave',
            by: message.sender,
        });
    });
    socket.on('clientInfoChange', message => {
        userUpdate$.next(message);
        message$.next({
            timestamp: message.timestamp,
            type: 'info-change',
            by: message.sender,
            content: {
                old: message.old,
                info: message.info,
            },
        });
    });
    socket.on('roomMessage', message => {
        message$.next({
            timestamp: message.timestamp,
            type: 'message',
            by: message.sender || null,
            content: message.content,
        });
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