import { withRouter } from '../../common/with_router.js';

import React from "react";

import Cookies from "js-cookie";
import { io } from 'socket.io-client';

import {RenderBuffer, Tetris} from "../../game/tetris.ts";
import {ClientGameSessionControl} from "../../game/reconciliator.ts";
import type {GameState} from "../../game/server_client_globals.ts";
import {GameCanvas} from "./game_canvas";

export class Game extends React.Component {

    constructor(props) {
        super(props);
        // canvas info
        this.programInfo = null;
        this.repaint = null;
        // game info
        this.session = null;
        this.game = null;
        // Socket IO connection
        this.socket = io("http://localhost:5000/game", {
            autoConnect: false,
            auth: {
                token: Cookies.get('jwt')
            }
        });
    }

    componentDidMount() {
        // open a socket IO connection
        this.socket.connect();
        this.socket.on('connect', this.onConnect);
        this.socket.on('disconnect', this.onDisconnect);
        this.socket.on('error', this.onError);
        this.socket.on('connect_error', this.onConnectError);
        this.socket.on('sync', this.onSync);
        this.socket.on('update', this.onUpdate);
        //
        window.addEventListener('keydown', this.onKeyEvent);
        // create a game
        let saved = localStorage.getItem('game');
        this.game = saved ? new Tetris(this.onGameStateChanged, JSON.parse(saved)) : new Tetris(this.onGameStateChanged);
        this.session = new ClientGameSessionControl(this.game, this.socket);
        // render
        this.onGameStateChanged(this.game.render());
    }
    componentWillUnmount() {
        window.removeEventListener('keydown', this.onKeyEvent);
        //
        this.socket.off('connect', this.onConnect);
        this.socket.off('disconnect', this.onDisconnect);
        this.socket.off('error', this.onError);
        this.socket.off('connect_error', this.onConnectError);
        this.socket.off('sync', this.onSync);
        this.socket.off('update', this.onUpdate);
        //
        this.session.destroy();
    }

    onGameStateChanged = (data: RenderBuffer) => {
        if (!this.programInfo && !this.repaint) {
            return;
        }
        // render game
        this.programInfo.strings = data.strings;
        this.programInfo.buffers["a_position"].setData(data.vertices);
        this.programInfo.buffers["a_color"].setData(data.colors);
        this.programInfo.count = data.count;
        // save state
        localStorage.setItem('game', JSON.stringify(this.game));
        // draw
        this.repaint();
    }
    canvasSet = (programInfo, repaint) => {
        this.programInfo = programInfo;
        this.repaint = repaint;
    }
    onKeyEvent = (e) => {
        //console.log("key event " + e.keyCode);
        this.session.processEvent(e.keyCode);
    }

    onConnect = () => {
        console.log("onConnect");
        this.session.onServerConnect();
        this.session.sync();
    }
    onDisconnect = () => {
        console.log("onDisconnect");
        this.session.onServerDisconnect();
    }
    onError = () => {
        console.log("onError");
    }
    onConnectError = (e) => {
        console.log("onConnectError " + e);
        this.session.onServerDisconnect();
    }
    onSync = (serverState: GameState) => {
        console.log("onSync");
        this.session.onServerSynced(serverState);
    }
    onUpdate = (serverState: GameState) => {
        console.log("onUpdate");
        this.session.onServerUpdate(serverState);
    }
    render() {
        return (
            <GameCanvas
                set={this.canvasSet}
            />
        );
    }
}

export const GameRouted = withRouter(Game);