import React, {Component, Fragment} from "react";
import {withRouter} from "../common/with_router";
import {InputField, TextField} from "./input_field";
import {socket} from "./account";
import {authService} from "../services/auth_service";

import '../stylesheets/room.css';

class RoomLobby extends Component {

    constructor(props) {
        super(props);

        // define values of this form
        this.state = {
            room: {},
            messages: null,
            teams: 3
        };
    }

    componentDidMount() {
        socket.on('room create', this.onAddRoom)
        socket.on('error', this.onError)
    }

    componentWillUnmount() {
        socket.off('room create', this.onAddRoom)
        socket.off('error', this.onError)
    }

    render () {
        const colors = [
            'red', 'blue', 'green', 'yellow',
        ]
        if (!this.state.room) {
            return (<div>Loading...</div>)
        }
        const {room} = this.state;
        return (
            <Fragment>
                <div className="lobby table lobby-menu">
                    <h2 className="cell top top_left">Teams</h2>
                    <h2 className="cell top">Room {room.room_name}</h2>
                    <h2 className="cell top top_right">Chat</h2>
                    <div className="cell team-info">
                        {
                            this.state.teams && colors.slice(0, this.state.teams).map((color, index) => (
                                <div>
                                    <h2 className={`team ${color}`}>Team {color}</h2>
                                    <p>Players: 4/6</p>
                                    <button className={`join-btn ${color}`}>Join</button>
                                </div>
                            ))
                        }
                    </div>
                    <div className="cell">
                        <p>Teams: {room.room_teams}</p>
                        <p>Players per Team: {room.room_players}</p>
                        <p>Other Information</p>
                    </div>
                    <div className="cell">
                        <div className="messaging flex_spread">
                            {
                                this.state.messages && this.state.messages.map((message) => (
                                    <div className="message">
                                        <span className="sender">John</span>
                                        <span className="team red">Team 1</span>
                                        <span className="content">Hello, everyone!</span>
                                    </div>
                                ))
                            }
                            <div className="message message_out">
                                <span className="sender">John</span>
                                <span className="team">Team 1</span>
                                <span className="content">Hello, everyone!</span>
                            </div>
                            <div className="message message_in">
                                <span className="sender">John</span>
                                <span className="team">Team 1</span>
                                <span className="content">Hello, everyone!</span>
                            </div>
                        </div>
                        <TextField
                            onEnter={(v) => console.log("Enter Room ", v)}
                        />
                    </div>
                </div>
            </Fragment>
        )
    }
}

export const RoomLobbyRouted = withRouter(RoomLobby);