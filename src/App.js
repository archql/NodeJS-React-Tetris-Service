import React from 'react';
import { Routes, Navigate, Route } from "react-router-dom";

import './App.css';
import { LoginFormRouted } from './components/login_form.js';
import { RegisterFormRouted } from './components/register_form.js';
import { AccountRouted } from './components/account.js';
import {NotFound} from "./components/not_found";
import {GameRouted} from "./components/game/game";

export class App extends React.Component {

    render() {
        return (
        <Routes>
            <Route index element={<Navigate to={"/account"} />} />
            <Route path={"/auth/register"} exact element={<RegisterFormRouted />} />
            <Route path={"/auth/login"} element={<LoginFormRouted />} />
            <Route path={"/account/*"} element={<AccountRouted />} />
            <Route path={"/game"} element={<GameRouted />} />
            <Route path='*' element={<NotFound />} />
        </Routes>);
    }

}
