import React from 'react';
import Cookies from 'js-cookie';
import { authService } from  "../services/auth_service.js";
import { userService } from "../services/user_service.js";
import {Link, Navigate, NavLink, Route, Routes} from "react-router-dom";
import { withRouter } from '../common/with_router.js';

import '../stylesheets/user.css';
import {ListContainer} from "./list_container";
import {ResizeableInput} from "./resizeable_input";
import {MessageContainer} from "./message_container";
import * as faIcons from "@fortawesome/fontawesome-free-solid";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import { io } from 'socket.io-client';
import {UserCard} from "./user_card";
import {Chat, ChatRouted} from "./chat";
import {NotFound} from "./not_found";
import {RegisterFormRouted} from "./register_form";
import {LoginFormRouted} from "./login_form";
import {GameRouted} from "./game/game";
export const socket = io("http://localhost:5000/chat", {
    autoConnect: false,
    //withCredentials: true,
    auth: {
        token: Cookies.get('jwt')
    }
});

export class Account extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            redirect: null
        };
    }
    componentDidMount() {
        console.log("mount " + Cookies.get('jwt'));
        socket.auth.token = Cookies.get('jwt');

        socket.connect();

        socket.on('connect', this.onConnect);
        socket.on('disconnect', this.onDisconnect);
        socket.on('error', this.onError);
        socket.on('connect_error', this.onConnectError)
        socket.on('self', this.onSelf);
    }

    componentWillUnmount() {
        socket.off('connect', this.onConnect);
        socket.off('disconnect', this.onDisconnect);
        socket.off('error', this.onError);
        socket.off('connect_error', this.onConnectError)
        socket.off('self', this.onSelf);
    }

    onConnect = () => {
        console.log("connect")
    }

    onDisconnect = () => {
        console.log("disconnect")
    }

    onError = (error) => {
        console.log(`onError ${error.status} ${error.message}`);
    }
    onConnectError = () => {
        console.log("onConnectError")
        this.setState({redirect: "/auth/login"});
        socket.disconnect();
    }

    onSelf = (data) => {
        this.setState({user: data})
    }

    logout(e) {
        e.preventDefault();

        authService.logout();
        this.setState({redirect: "/auth/login"});
        socket.close();
    }

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />
        } else if (this.state.user) {
            return (
            <div className="container flex_spread">
                <UserCard
                    user={this.state.user}
                    logout={e => this.logout(e)}
                />
                <div className="box card navbar">
                    <NavLink to={"/account"}
                             className={({ isActive }) =>
                                 isActive ? "link active" : "link"
                             }
                    >Account</NavLink>
                    <NavLink to={"/account/chat"}
                             className={({ isActive }) =>
                                 isActive ? "link active" : "link"
                             }>Chat</NavLink>
                    <NavLink to={"/game"}
                             className={({ isActive }) =>
                                 isActive ? "link active" : "link"
                             }>Play</NavLink>
                    <a className="link" href={"#logout"} onClick={e => this.logout(e)} >
                        Logout
                    </a>
                </div>
                <div className="box card flex_spread">
                    <Routes>
                        <Route path={"/"} element={<ChatRouted
                            user={this.state.user}
                        />} />
                        <Route path={"/chat"} element={<ChatRouted
                            user={this.state.user}
                        />} />
                    </Routes>
                    {/*<Chat*/}
                    {/*    user={this.state.user}*/}
                    {/*/>*/}
                </div>
            </div>);
        } else {
            return ("");
        }
    }
}

export const AccountRouted = withRouter(Account);