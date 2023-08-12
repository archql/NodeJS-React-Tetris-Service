import { withRouter } from '../../common/with_router.js';

import React from "react";

import Cookies from "js-cookie";
import { io } from 'socket.io-client';

import {FIELD_H, FIELD_W, RenderBuffer, Tetris} from "../../game/tetris.ts";
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
        // get room info
        const roomId = props.router?.location?.state?.roomId || 1; // TODO ????
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
            loading: true
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
        // render game
        if (data) {
            // add game buffer to map of buffers to be rendered
            this.renderBuffers["game"] = data;
            // save state
            localStorage.setItem('game', JSON.stringify(this.game));
        }
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
        const sz = Object.keys(this.games).length;
        if (sz > 0) {
            console.log()
            const rectSz = Math.ceil(Math.sqrt(sz));
            const scaleF = 1 / rectSz;
            let i = 0;
            for (const [name, game] of Object.entries(this.games)) {
                const grb = new Tetris(null, game).render(); // TODO expensive!!!!
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
            this.props.router.navigate("/");
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
        console.log(`serverState.state.name === this.state.name ${serverState.state.name} ${this.state.name}`)
        if (serverState.state.name === this.state.name) { // TODO
            // update to session
            this.session.onServerUpdate(serverState);
        } else {
            // update OGV
            this.games[serverState.state.name] = serverState.state;
        }
    }
    render() {
        return (
            <React.Fragment>
                {this.state.loading && (<div className="loader"/>)}
                <GameCanvas
                    set={this.canvasSet}
                />
            </React.Fragment>
        );
    }
}

export const GameRouted = withRouter(Game);