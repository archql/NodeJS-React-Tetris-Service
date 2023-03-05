import React from 'react';
import { Routes, Navigate, Route } from "react-router-dom";
import { createBrowserHistory } from 'history';

import './App.css';
import { LoginFormRouted } from './components/login_form.js';
import { RegisterFormRouted } from './components/register_form.js';
import { AccountRouted } from './components/account.js';
import { authService } from  "./services/auth_service.js"

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
        return (<Routes>
            <Route exact path="/" element={<Navigate to={"/account"} />} />
            <Route path={"/register"} exact element={<RegisterFormRouted />} />
            <Route path={"/login"} element={<LoginFormRouted />} />
            <Route path={"/account"} element={<AccountRouted />} />
        </Routes>);
    }

}
