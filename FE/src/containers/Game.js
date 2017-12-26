import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux'
import Brush from 'utils/brush';
import Rx from 'rxjs/Rx';
import wsAction from 'utils/wsAction';
import { canvasStroke$, canvasReset$ } from 'flow/canvas';
import * as gameActions from 'actions/game';
import { getPersonName } from 'utils/main';

const renderRankings = (players) => {
    let list = [];
    for (let playerId in players) {
        let player = players[playerId];
        list.push(player);
    }
    list.sort((a, b) => a.score > b.score ? -1 : 1);
    list = list.map((player, index) => (
        <div key={player.id} className="table-row">
            <span className="rank">
                { index + 1 }
            </span>
            <span title={getPersonName(player)} className={"name" + (player.online ? ' on' : ' off')}>
                { getPersonName(player) }
            </span>
            <span className="score">
                { player.score }
            </span>
        </div>
    ));
    return list;
};
const strokeColors = ['red', 'black', 'green'];

@connect(
    state => ({
        game: state.game,
        user: state.user,
        currentRoom: state.room.currentRoom,
    }),
    dispatch => bindActionCreators({...gameActions}, dispatch)
)
export default class Game extends Component {
    render () {
        let { game, user, currentRoom } = this.props;
        let { word, countDown, banker, players, status } = game;
        let { owner } = currentRoom;
        let isRoomOwner = owner && user.id === owner.id;
        let isBanker = banker && banker.id === owner.id;
        return (
            <section className="game-wrapper">
                <section className="game-info">
                    <div className="tip">{ {pending: '等待下个回合', going: '进行中', await: '等待房主开始游戏'}[status] }</div>
                    {
                        status === 'await' && isRoomOwner ?
                            <div className="starter">
                                <span className="btn btn-default btn-md" onClick={ wsAction.startGame }>开始游戏</span>
                            </div>
                            : null
                    }
                    {
                        word ?
                            <div title="目标词语" key={'target'}>
                                <span className="icon-wrapper">
                                    <svg className="icon" aria-hidden="true">
                                        <use xlinkHref="#icon-focus"></use>
                                    </svg>
                                </span>
                                <span className="value">{ word }</span>
                            </div>
                            : null
                    }

                    <div title="倒计时">
                        <span className="icon-wrapper">
                            <svg className="icon" aria-hidden="true">
                                <use xlinkHref="#icon-countdown"></use>
                            </svg>
                        </span>
                        <span className="value">{ countDown || '' }</span>
                    </div>
                    <div title="当前庄家">
                        <span className="icon-wrapper">
                            <svg className="icon" aria-hidden="true">
                                <use xlinkHref="#icon-write"></use>
                            </svg>
                        </span>
                        <span className="value">{ getPersonName(banker) }</span>
                    </div>
                    <div className="rank-wrapper">
                        <div key={''} className="table-row">
                            <span className="rank">
                                排名
                            </span>
                            <span className="name">
                                玩家
                            </span>
                            <span className="score">
                                积分
                            </span>
                        </div>
                        { renderRankings(players) }
                    </div>
                </section>
                <section className="game-panel">
                    <canvas
                        className="canvas"
                        ref="canvas" width="600" height="400"
                        style={{cursor: (status !== 'going' || !banker || banker.id !== user.id) ? 'default' : 'crosshair'}}
                    ></canvas>
                    <div className="controls">
                        {
                            strokeColors.map(color => {
                                return (
                                    <div
                                        key={color}
                                        style={{background: color}}
                                        className="color-brush"
                                        onClick={() => {
                                        this.syncStroke({ type: 'mode', mode: 'brush' });
                                        this.syncStroke({ type: 'color', color });
                                        }}
                                    >
                                    </div>
                                )
                            })
                        }
                        <div className="color-brush eraser" title="橡皮" onClick={() => {this.syncStroke({ type: 'mode', mode: 'eraser' });}}></div>
                    </div>
                </section>
            </section>
        );
    }
    resizeCanvas = function () {
        const canvas = this.refs.canvas;
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        this.brush.redraw(this.props.game.canvasData.strokes);
    }.bind(this);
    componentWillMount () {
        let { setGameStatus, setGameCountDown, setGameBanker, setGamePlayers, setGameWord, setCanvasData } = this.props;
        setGameStatus('await');
        setGameCountDown(0);
        setGameBanker(null);
        setGamePlayers({});
        setGameWord('');
        setCanvasData({ strokes: [] });
    }
    componentDidMount () {
        window.addEventListener('resize', this.resizeCanvas);
        this.brush = new Brush({ canvas: this.refs.canvas });
        this.canvasStroke$$ = canvasStroke$.subscribe(stroke => this.syncStroke(stroke, true));
        this.canvasReset$$ = canvasReset$.subscribe(() => this.resetCanvas());
        this.mouseEvent$$ = Rx.Observable
            .fromEvent(this.refs.canvas, 'mousedown')
            .do(e => { // beginPath on mousedown event
                this.syncStroke({
                    x: e.offsetX / this.refs.canvas.offsetWidth,
                    y: e.offsetY / this.refs.canvas.offsetHeight,
                    type: 'begin',
                });
            })
            .switchMap(firstE => Rx.Observable
                .fromEvent(this.refs.canvas, 'mousemove')
                .takeUntil(Rx.Observable
                    .fromEvent(document.body, 'mouseup')
                    .do(e => { // closePath on mouseup event
                        this.syncStroke({ type: 'close' });
                    })))
            .do(e => { // draw mousemove event
                this.syncStroke({
                    x: e.offsetX / this.refs.canvas.offsetWidth,
                    y: e.offsetY / this.refs.canvas.offsetHeight,
                    type: 'move',
                });
            })
            .subscribe();

        // todo: redraw after state changed
        setTimeout(() => {
            this.resizeCanvas();
        });
    }
    componentWillUnmount () {
        this.mouseEvent$$.unsubscribe();
        this.canvasReset$$.unsubscribe();
        this.canvasStroke$$.unsubscribe();
        window.removeEventListener('resize', this.resizeCanvas);
    }
    syncStroke (stroke, fromServer) {
        let { game, user, pushCanvasStroke } = this.props;

        // if game is not going or you are not the banker, stroke event would be ignored
        if (!fromServer && (game.status !== 'going' || !game.banker || game.banker.id !== user.id)) return;
        pushCanvasStroke(stroke);
        this.brush.draw(stroke);
        !fromServer && wsAction.emitCanvasStroke(stroke);
    }
    resetCanvas () {
        let { setCanvasData } = this.props;
        setCanvasData({
            size: [this.refs.canvas.width, this.refs.canvas.height],
            strokes: []
        });
        this.brush.redraw();
    }
}