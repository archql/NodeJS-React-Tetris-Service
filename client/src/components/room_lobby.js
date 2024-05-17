import React, {Component, Fragment} from "react";
import {withRouter} from "../common/with_router";
import {InputField, TextField} from "./input_field";

import '../stylesheets/room.css';
import * as faIcons from "@fortawesome/fontawesome-free-solid";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

export class RoomLobby extends Component {

    constructor(props) {
        super(props);

        // define values of this form
        this.state = {
            room: this.props.room,
            ru: this.props.ru,
            user: this.props.user,
            messages: [],
        };
    }
    // TODO duplicate in game_end.js
    calcTeamDistribution() {
        // determine teams distribution
        let teams = []
        this.state.room.room_users?.forEach((ru => {
            const v = (ru.ru_team ?? -1) + 1
            teams[v] = teams[v] ? teams[v] + 1 : 1
        }))
        return teams
    }

    componentDidMount() {
        if (!this.props.socket) return
        this.props.socket.on('room message', this.onRoomMessage)
        this.props.socket.on('room team change', this.onRoomTeamChange)
        this.props.socket.on('room leave', this.onRoomLeave)
        this.props.socket.on('room join', this.onRoomJoin)
        this.props.socket.on('room ready', this.onRoomReady)
        this.props.socket.on('error', this.onError)
    }

    componentWillUnmount() {
        if (!this.props.socket) return
        this.props.socket.off('room message', this.onRoomMessage)
        this.props.socket.off('room team change', this.onRoomTeamChange)
        this.props.socket.off('room leave', this.onRoomLeave)
        this.props.socket.off('room join', this.onRoomJoin)
        this.props.socket.off('room ready', this.onRoomReady)
        this.props.socket.off('error', this.onError)
    }

    componentDidUpdate() {
        this.scrollToBottom()
    }

    onRoomReady = () => {
        // TODO
        console.log("onRoomReady ")
    }

    onRoomMessage = (message) => {
        console.log("onRoomMessage ", message)
        this.setState({
            messages: [...this.state.messages, message],
        })
    }

    onRoomTeamChange = (team_change) => {
        console.log("onRoomTeamChange ")
        this.state.room.room_users.forEach((ru) => {
            if (ru.ru_user_id === team_change.user_id) {
                ru.ru_team = team_change.team_new;
            }
        })
        const messages = this.state.messages.map((m) => {
            if (m.user_id === team_change.user_id) {
                m.team = team_change.team_new;
            }
            return m
        })
        this.setState({
            room: {...this.state.room},
            messages: messages
        })
    }

    onRoomLeave = (user_id) => {
        console.log("onRoomLeave ")
        const r = this.state.room.room_users.filter((ru) => {
            return ru.ru_user_id !== user_id;
        })
        this.setState({
            room: {...this.state.room, room_users: r}
        })
    }

    onRoomJoin = (ru) => {
        console.log("onRoomJoin ", ru)
        this.state.room.room_users.push(ru);
        this.setState({
            room: {...this.state.room}
        })
    }

    joinTeam(e, team) {
        e.preventDefault();
        console.log("room team change ", team)
        this.props.socket.emit("room team change", team)
    }

    sendMessage(v) {
        this.props.socket.emit("room message", v)
    }

    leaveRoom() {
        window.location.reload(false);
    }

    scrollToBottom = () => {
        this.messagesEnd?.scrollIntoView({ behavior: 'instant' });
    }

    render () {
        const colors = [
            'red', 'blue', 'green', 'yellow',
        ]
        if (!this.state.room) {
            return (<div>Loading...</div>)
        }
        const {room} = this.state;
        const teams = this.calcTeamDistribution();
        console.log(this.state.room.room_users)
        return (
            <Fragment>
                <div className="lobby table lobby-menu flex_spread">
                    <h2 className="cell top top_left">Teams</h2>
                    <h2 className="cell top">Room {room.room_name}</h2>
                    <h2 className="cell top top_right">Chat</h2>
                    <div className="team-info cell">
                        {
                            colors.slice(0, room.room_teams).map((color, index) => (
                                <div key={index} className={"card box"}>
                                    <h2 className={`team ${color}`}>Team {color}</h2>
                                    <p>Players: {`${teams[index + 1] ?? 0} / ${room.room_max_members}`}</p>
                                    <button
                                        className={`join-btn ${color}`}
                                        onClick={(e) => this.joinTeam(e, index)}
                                    >
                                        Join
                                    </button>
                                </div>
                            ))
                        }
                        <div style={{flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end'}}>
                        <button
                            className={`join-btn`}
                            onClick={(e) => this.leaveRoom(e)}
                        >
                            Leave Room
                        </button>
                        </div>
                    </div>
                    <div className="cell card room_info">
                        <p><b>"{room.room_description}"</b></p>
                        <p><b>Owner</b>: {room.room_owner.user_nickname}</p>
                        <p><b>You</b>: {this.props.user.user_nickname}</p>
                        <p><b>Teams</b>: {room.room_teams} teams of {room.room_max_members} players</p>
                        <p><b>Target Score</b>: {"20'000"}</p> {/*TODO*/}
                        <p><b>Players in the room ({room.room_users.length}):</b></p>
                        {
                            room.room_users && room.room_users.map((ru) => {
                                const color = (ru.ru_team !== null && ru.ru_team !== undefined) ? colors[ru.ru_team] : "";
                                return (
                                    <div key={`${ru.ru_user_id}-${ru.ru_room_id}`}>
                                        - <span className={`sender team ${color}`}>{ru.ru_user.user_nickname}</span>
                                        rank {ru.ru_user.user_rank}
                                    </div>
                                )
                            })
                        }
                        <p><b>Status:</b><i>{"Waiting for team selection..."}</i></p>
                    </div>
                    <div className="cell card">
                    <div className="messaging flex_scroll">
                            <div style={{float: "left", clear: "both"}}
                                 ref={(el) => {
                                     this.messagesStart = el;
                                 }}/>
                            {
                                this.state.messages.length ? this.state.messages.map((message, index) => {
                                    const color = (message.team !== null && message.team !== undefined) ? colors[message.team] : "";
                                    return (
                                        <div className="box message" key={index}>
                                            <span className={`sender team ${color}`}>{message.nickname}</span>
                                            <span className="content">{message.text}</span>
                                        </div>
                                    )
                                }) : (
                                    <div>
                                        No messages
                                    </div>
                                )
                            }
                            <div style={{float: "left", clear: "both"}}
                                 ref={(el) => {
                                     this.messagesEnd = el;
                                 }}>
                            </div>
                        </div>
                        <div className="send_panel">
                            <TextField
                                onEnter={(v) => this.sendMessage(v)}
                            />
                        </div>
                    </div>
                </div>
            </Fragment>
        )
    }
}

export const RoomLobbyRouted = withRouter(RoomLobby);