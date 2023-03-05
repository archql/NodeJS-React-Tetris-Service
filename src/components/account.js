import React from 'react';
import { authService } from  "../services/auth_service.js";
import { userService } from "../services/user_service.js";
import { Navigate } from "react-router-dom";
import { withRouter } from '../common/with_router.js';

export class Account extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            redirect: null,
            userReady: false,
            user: { username: "" }
        };
    }
    componentDidMount() {
        const currentUser = authService.getCurrentUser();
        userService.getMessages().then(data =>
        {
            console.log(data);
            if (data.status !== 200)
                this.setState({ redirect: "/login" });
            else
                this.setState({ user: currentUser, userReady: true })
        }).catch(e => {
            this.setState({ redirect: "/login" });
        });
    }

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />
        } else {
            return (<div>hello</div>);
        }
    }
}

export const AccountRouted = withRouter(Account);