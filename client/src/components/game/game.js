import {withRouter} from '../../common/with_router.js';

import React from "react";

import Cookies from "js-cookie";
import {io} from 'socket.io-client';

import {FIELD_H, FIELD_W, RenderBuffer, STATUS_TABLE, Tetris} from "../../game/tetris.ts";
import {ClientGameSessionControl} from "../../game/reconciliator.ts";
import type {GameState} from "../../game/server_client_globals.ts";
import {GameCanvas} from "./game_canvas";

const server_ip = process.env.SERVER_IP || 'localhost';

export class Game extends React.Component {

    constructor(props) {
        super(props);
        // canvas info
        this.renderBuffers = null;
        this.repaint = null;
        // game info
        this.session = null;
        this.game = null;
        this.games = [];
        this.leaderboard = null; // TODO move leaderboard logics into GameSessionControl ??
        this.rawLeaderboard = null;
        this.chat = [];
        this.myMessage = '';
        // Socket IO connection
        this.socket = io(`http://${server_ip}:5555/game`, {
            autoConnect: false,
            auth: {
                token: Cookies.get('jwt')
            },
            transports: ['websocket'], upgrade: false,
            path: '/socket-io'
        });
        //
        this.state = {
            loading: true,
            roomInfo: null,
            readyInfo: {},
            scoreInfo: {},
        }
    }

    componentDidMount() {
        // open a socket IO connection
        this.socket.on('connect', this.onConnect);
        this.socket.on('disconnect', this.onDisconnect);
        this.socket.on('error', this.onError);
        this.socket.on('connect_error', this.onConnectError);
        this.socket.on('sync', this.onSync);
        this.socket.on('update', this.onUpdate);
        this.socket.on('leaderboard', this.onLeaderboard);
        this.socket.on('game over', this.onServerGameOver);
        // TODO separate room ctrl
        this.socket.on('room self', this.onRoomSelf);
        this.socket.on('room join', this.onRoomJoin);
        this.socket.on('room leave', this.onRoomLeave);
        this.socket.on('room ready', this.onRoomReady);
        this.socket.on('room game over', this.onRoomGameOver);
        this.socket.on('room message', this.onRoomMessage);
        //
        if (this.socket.connected) {
            this.socket.emit('leaderboard');
        } else {
            this.socket.connect();
        }
        //
        window.addEventListener('keydown', this.onKeyEvent);
        window.addEventListener('keyup', this.onKeyUpEvent);
        // create a game
        const saved = localStorage.getItem('game');
        this.game = saved ? new Tetris(this.onGameStateChanged, JSON.parse(saved)) : new Tetris(this.onGameStateChanged);
        this.session = new ClientGameSessionControl(this.game, this.socket);
        this.game.gameOverCallback = this.onLocalGameOver;
        // render
        this.onGameStateChanged(this.game.render());
    }
    componentWillUnmount() {
        window.removeEventListener('keydown', this.onKeyEvent);
        window.removeEventListener('keyup', this.onKeyUpEvent);
        //
        this.socket.off('connect', this.onConnect);
        this.socket.off('disconnect', this.onDisconnect);
        this.socket.off('error', this.onError);
        this.socket.off('connect_error', this.onConnectError);
        this.socket.off('sync', this.onSync);
        this.socket.off('update', this.onUpdate);
        this.socket.off('leaderboard', this.onLeaderboard);
        this.socket.off('game over', this.onServerGameOver);
        // TODO separate room ctrl
        this.socket.off('room self', this.onRoomSelf);
        this.socket.off('room join', this.onRoomJoin);
        this.socket.off('room leave', this.onRoomLeave);
        this.socket.off('room ready', this.onRoomReady);
        this.socket.off('room game over', this.onRoomGameOver);
        this.socket.off('room message', this.onRoomMessage);
        //
        this.socket.disconnect();
        //
        this.session.destroy();
    }

    onLeaderboard = (leaderboard) => {
        console.log(`LOG LEADERBOARD ${this.game.name}`);
        // save servers leaderboard instance (DEEP COPY)
        this.rawLeaderboard = JSON.parse(JSON.stringify(leaderboard));
        // preprocess leaderboard
        let obj = leaderboard.find((e) => e.user_nickname === this.game.name);
        console.log(obj);
        // TODO fix @default case
        if (!obj ) {
            if (this.game.name !== "@DEFAULT") {
                if (leaderboard.length < 15) {
                    leaderboard.push({
                        user_nickname: this.game.name,
                        user_max_score: this.game.highScore,
                        appended: true,
                        self: true
                    });
                } else {
                    leaderboard[14] = ({
                        user_nickname: this.game.name,
                        user_max_score: this.game.highScore,
                        appended: true,
                        self: true
                    });
                }
            }
        } else {
            obj.self = true;
        }
        //
        this.leaderboard = leaderboard;
        //
        this.onGameStateChanged(this.game.render());
    }

    onLocalGameOver = (score: number, newRecord: boolean) => {
        // TODO mk this condition more clear
        if (this.socket.connected) {
            if (this.game?.status === "registered") {
                this.setState({
                    loading: true
                })
            }
            // } else if (this.game.playing && window.confirm("U're not synced with the server! U will loose all your progress in that mode! Sync now?")){
            //     this.session.sync();
            // }
        }
    }

    onServerGameOver = () => {
        console.log("LOG onServerGameOver");
        this.setState({
            loading: false
        })
    }

    onGameStateChanged = (data: RenderBuffer) => {
        if (!this.renderBuffers && !this.repaint) {
            return;
        }
        // Remove all render buffers except game related one
        const validKeys = [ 'game' ];
        Object.keys(this.renderBuffers).forEach((key) => validKeys.includes(key) || delete this.renderBuffers[key]);
        // render game
        if (data) {
            // add game buffer to map of buffers to be rendered
            this.renderBuffers["game"] = data;
            // save state
            localStorage.setItem('game', JSON.stringify(this.game));
        }
        // TODO menus logics
        switch (this.menuId) {
            case 1: {
                // TODO separate OGV logics
                const sz = Object.keys(this.games).length + 1;
                if (sz > 0) {
                    console.log()
                    const rectSz = Math.ceil(Math.sqrt(sz));
                    const scaleF = 1 / rectSz;
                    let i = 0;
                    for (const [name, game] of Object.entries(this.games)) {
                        const grb = Tetris.srender(game); // TODO move to another place
                        //
                        grb.scale = scaleF;
                        grb.x = 22 + (i % rectSz) * (FIELD_W + 1) * scaleF;
                        grb.y = Math.floor(i / rectSz) * (FIELD_H + 1) * scaleF;
                        //
                        this.renderBuffers[name] = grb;
                        console.log(this.renderBuffers);
                        //
                        i++;
                    }
                }
                break;
            }
            case 2: {
                const crb = new RenderBuffer();
                crb.scale = 0.5;
                this.renderBuffers["chat"] = crb;

                const max_screen = FIELD_H - 2;
                const max_chat = this.chat.length - 1;
                let i = Math.min(max_screen, max_chat);
                for (; i >= 0; i--) {
                    const line = this.chat[max_chat - i];
                    crb.strings.push({
                        x: 2 * (FIELD_W + 2 + 8),
                        y: 2 * (max_screen - i),
                        text: `${line.nickname} ${line.text}`,
                    })
                }
                crb.strings.push({
                    x: 2 * (FIELD_W + 2 + 8),
                    y: 2 * (FIELD_H - 1),
                    text: `> ${this.myMessage}`,
                })
                break;
            }
            default: {
                // TODO separate leaderboard logics
                if (this.leaderboard) {
                    // add game buffer to map of buffers to be rendered
                    const rblb = new RenderBuffer();
                    this.renderBuffers["leaderboard"] = rblb;
                    rblb.strings.push(
                        {
                            x: FIELD_W + 8,
                            y: 1,
                            text: "--<LEADERBOARD>--",
                        }
                    );
                    this.leaderboard.forEach((e, index) => {
                        rblb.strings.push(
                            {
                                x: FIELD_W + 8,
                                y: 2 + index,
                                text: `#${e.appended ? '#' : (index + 1).toString(16).toUpperCase()} ${e.user_nickname}${String(e.user_max_score).padStart(6, ' ')}`,
                                color: e.self ? 'yellow' : 'white'
                            }
                        );
                    });
                }
            }
        }
        // draw
        this.repaint();
    }

    // renderBuffers is map of buffers to be rendered
    canvasSet = (renderBuffers, repaint) => {
        this.renderBuffers = renderBuffers;
        this.repaint = repaint;
    }
    onKeyEvent = (e) => {
        console.log("key event " + e.keyCode);
        // TODO mk exit based on callback
        // 27 is ESC key code
        if (this.game.playing === false && e.keyCode === 27) {
            // tell server that we're leaving the room
            this.socket.emit('room leave');
            // redirect user to the account
            this.props.router.navigate("/");
        } else if (this.menuId === 2 && e.keyCode !== 27) {
            // were in the chat
            console.log(e);
            if ((e.keyCode >= 32 && e.keyCode <= 126 && ((this.myMessage.length + e.key.length) < 22))) {
                this.myMessage += e.key;
            } else if (e.keyCode === 8) {
                this.myMessage = this.myMessage.slice(0, -1);
            } else if (e.keyCode === 13) {
                this.socket.emit('room message', this.myMessage);
                this.myMessage = '';
            }
            this.onGameStateChanged(null);
        } else {
            this.session.processEvent(e.keyCode);
        }
    }
    onKeyUpEvent = (e) => {
        console.log("key up event " + e.keyCode);
        if (e.keyCode === 16) {
            this.session.processEvent(15);
        }
    }

    onConnect = () => {
        console.log("LOG onConnect");
        this.session.onServerConnect();

        // TODO mk this condition more clear
        if (this.game.playing && this.game.score > 0 && !window.confirm("Just connected! But u will loose all your progress. Continue?")) {
            this.setState({
                loading: false
            })
        } else {
            this.session.sync();
        }
    }
    onDisconnect = () => {
        console.log("LOG onDisconnect");
        // drop room info
        this.setState({
            loading: false,
            roomInfo: null,
            readyInfo: {},
        })
        //
        this.session.onServerDisconnect();
    }
    onError = () => {
        console.log("LOG onError");
        this.setState({
            loading: false
        })
    }
    onConnectError = (e) => {
        console.log("LOG onConnectError " + e);
        this.setState({
            loading: false
        })
        this.session.onServerDisconnect();
    }
    onSync = (serverState: GameState) => {
        console.log("LOG onSync");
        // reset game state
        this.session.onServerSynced(serverState);
        // reset leaderboard state IMPORTANT after game state set
        this.onLeaderboard(this.rawLeaderboard);
        // stop loader
        this.setState({
            loading: false
        })
    }
    onUpdate = (serverState: GameState) => {
        console.log("onUpdate");
        console.log(`serverState.state.name === this.game.name ${serverState.state.name} ${this.game.name}`)
        if (serverState.state.name === this.game.name) { // TODO
            // update to session
            this.session.onServerUpdate(serverState);
        } else {
            // update OGV
            this.games[serverState.state.name] = serverState.state;
            this.onGameStateChanged(null);
        }
    }

    onRoomSelf = (userId: number) => {
        console.log("onRoomSelf")
        console.log(userId)
        this.setState({
            roomUserId: userId
        })
    }

    onRoomJoin = (roomInfo: any) => {
        this.setState({
            roomInfo: roomInfo
        })
    }

    onRoomLeave = (user_id: number) => {
        console.log("onRoomLeave")
        const temp = this.state.roomInfo.room_users.filter(( ru ) => {
            return ru.ru_user_id !== user_id;
        });
        this.setState({
            roomInfo: {...this.state.roomInfo, room_users: temp}
        })
    }

    onRoomGameOver = (roomUser: any) => {
        console.log('onRoomGameOver')
        const temp = this.state.roomInfo.room_users.map(( ru ) => {
            if (ru.ru_user_id === roomUser.ru_user_id) {
                ru.ru_last_score = roomUser.ru_last_score;
                ru.ru_max_score = roomUser.ru_max_score;
            }
            return ru;
        });
        this.setState({
            roomInfo: {...this.state.roomInfo, room_users: temp}
        })
    }

    onRoomMessage = (msg: {nickname: string, text: string}) => {
        this.chat.push(msg);
        this.onGameStateChanged(null);
    }

    onRoomReady = (info: {user_id: number, state: string, score: number}) => {
        console.log(`onRoomReady ${info.user_id} ${info.state} ${info.score}`)

        if (info.user_id) {
            this.setState({
                readyInfo: {
                    ...this.state.readyInfo,
                    [info.user_id]: info.state
                },
                scoreInfo: { // TODO temp solution
                    ...this.state.scoreInfo,
                    [info.user_id]: Math.max((info.score || 0), (this.state.scoreInfo[info.user_id] || 0))
                }
            })
        } else {
            const newReadyInfo = {...this.state.readyInfo};
            Object.keys(this.state.readyInfo).forEach(key => {
                newReadyInfo[key] = info.state;
            });
            this.setState({
                readyInfo: newReadyInfo
            })
        }
    }

    roomReady = (e) => {
        //
        e.preventDefault();
        // clear focus
        document.activeElement.blur();

        // TODO duplicated!!!
        this.setState({
            readyInfo: {...this.state.readyInfo, [this.state.roomUserId]: "standby"}
        })
        this.socket.emit('room ready');
    }

    menuSelection (e: MouseEvent, menuId: number) {
        e.preventDefault();

        this.menuId = menuId;
        this.onGameStateChanged(null); // prevents game from updating
    }

    render() {
        const roomInfo = this.state.roomInfo;
        const readyInfo = this.state.readyInfo;
        const roomUserId = this.state.roomUserId;
        return (
            <React.Fragment>
                {this.state.loading && (<div className="loader"/>)}
                <GameCanvas
                    set={this.canvasSet}
                />
                <div className="floating_menu">
                    <div style={{fontWeight:"bold"}}>room info</div>
                    { (roomInfo) && (
                        <React.Fragment>
                            <div>{roomInfo.room_name}</div>
                            <div style={{fontStyle:"italic"}}>{roomInfo.room_description}</div>
                            <div style={{fontWeight:"bold"}}>list of room members ({roomInfo.room_users.length}/{roomInfo.room_max_members || "inf"})</div>
                            {roomInfo.room_users.map((user) => (
                                <div
                                    className="room_player_div"
                                    key={user.ru_user_id}
                                    style={{
                                    color: user.ru_user_id === roomInfo.room_owner_id ? "red" : (user.ru_user_id === roomUserId ? "yellow" : "white")
                                }}>
                                    <div>{user.ru_user.user_nickname}: {user.ru_last_score || '0'}/{user.ru_max_score || '0'}</div>
                                    {user.ru_user_id === roomUserId ?
                                        (<button className={`tri_state_toggle self ${readyInfo[user.ru_user_id] || ''}`} onClick={this.roomReady}/>) :
                                        (<button className={`tri_state_toggle ${readyInfo[user.ru_user_id] || ''}`}/>)
                                    }
                                </div>
                            ))}
                        </React.Fragment>
                    ) }
                    <div>display switch</div>
                    <button onClick={(e) => this.menuSelection(e, 0)}>leaderboard</button>
                    <button onClick={(e) => this.menuSelection(e, 1)}>players states</button>
                    <button onClick={(e) => this.menuSelection(e, 2)}>room chat</button>
                </div>
            </React.Fragment>
        );
    }
}

export const GameRouted = withRouter(Game);