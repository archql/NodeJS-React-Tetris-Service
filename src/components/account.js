import React from 'react';
import Cookies from 'js-cookie';
import { authService } from  "../services/auth_service.js";
import {Navigate, NavLink, Route, Routes} from "react-router-dom";
import { withRouter } from '../common/with_router.js';

import '../stylesheets/user.css';

import { io } from 'socket.io-client';
import {UserCard} from "./user_card";
import {ChatRouted} from "./chat";
import {HelpRouted} from "./help";
import {PersonalRouted} from "./personal";
export const socket = io("http://localhost:5555/chat", {
    autoConnect: false,
    //withCredentials: true,
    auth: {
        token: Cookies.get('jwt')
    },
    transports: ['websocket'], upgrade: false,
    path: '/socket-io'
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

        socket.on('connect', this.onConnect);
        socket.on('disconnect', this.onDisconnect);
        socket.on('error', this.onError);
        socket.on('connect_error', this.onConnectError)
        socket.on('self', this.onSelf);

        if (socket.connected) {
            socket.emit('self');
        } else {
            socket.connect();
        }
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
                             end
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
                    <NavLink to={"/account/help"}
                             className={({ isActive }) =>
                                 isActive ? "link active" : "link"
                             }>Help</NavLink>
                    <a className="link" href={"#logout"} onClick={e => this.logout(e)} >
                        Logout
                    </a>
                </div>
                <div className="box card flex_spread">
                    <Routes>
                        <Route path={"/"} element={<PersonalRouted
                            user={this.state.user}
                        />} />
                        <Route path={"/chat"} element={<ChatRouted
                            user={this.state.user}
                        />} />
                        <Route path={"/help"} element={<HelpRouted/>} />
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