import React from 'react';
import { Routes, Navigate, Route } from "react-router-dom";
import { createBrowserHistory } from 'history';

import './App.css';
import { LoginFormRouted } from './components/login_form.js';
import { RegisterFormRouted } from './components/register_form.js';
import { AccountRouted } from './components/account.js';
import { authService } from  "./services/auth_service.js"
import {NotFound} from "./components/not_found";
import {GameRouted} from "./components/game/game";

export class App extends React.Component {
    constructor(props) {
        super(props);
        this.logOut = this.logOut.bind(this);

        this.state = {
            currentUser: undefined
        };
    }
    componentDidMount() {
        const user = authService.getCurrentUser();

        if (user) {
            this.setState({
                currentUser: user
            });
        }
    }

    logOut() {
        authService.logout();
        this.setState({
            currentUser: undefined
        });
    }

    render() {
        return (
        <Routes>
            <Route path='*' element={<NotFound />} />
            <Route exact path="/" element={<Navigate to={"/chat"} />} />
            <Route path={"/auth/register"} exact element={<RegisterFormRouted />} />
            <Route path={"/auth/login"} element={<LoginFormRouted />} />
            <Route path={"/chat"} element={<AccountRouted />} />
            <Route path={"/game"} element={<GameRouted />} />
        </Routes>);
    }

}
