import React from 'react';
import { authService } from  "../services/auth_service.js";
import { userService } from "../services/user_service.js";
import { Navigate } from "react-router-dom";
import { withRouter } from '../common/with_router.js';

import '../stylesheets/user.css';
import {ListContainer} from "./list_container";

export class Account extends React.Component {

    constructor(props) {
        super(props);

        // define values of this component
        this.state = {
            redirect: null,
            userReady: false,
            selectedUser: 0
        };
    }
    componentDidMount() {
        console.log("mount");
        // TODO dup code!
        userService.getSelf().then(data => {
            console.log(data);
            if (data.status !== 200)
                this.setState({ redirect: "/login" });
            else
                this.setState({ user: data.body })
        }).catch(e => {
            this.setState({ redirect: "/login" });
        });
        userService.getOthers().then(data => {
            console.log(data);
            if (data.status !== 200)
                this.setState({ redirect: "/login" });
            else
                this.setState({others: data.body})
        }).catch(e => {
            this.setState({ redirect: "/login" });
        });
    }

    userSelected(user) {
        if (user) {
            // do this separately in the messages section
            userService.getMessages(user.user_id).then(data => {
                console.log(data);
                if (data.status !== 200)
                    this.setState({redirect: "/login"});
                else {
                    this.setState({messages: data.body})
                }
            }).catch(e => {
                this.setState({redirect: "/login"});
            });
        }
    }

    render() {
        if (this.state.redirect) {
            return <Navigate to={this.state.redirect} />
        } else if (this.state.user && this.state.others) {
            this.state.others.forEach((item) => (
                console.log(item)
            ));
            return (
            <div className="container flex_spread">
                <div className="card user_card">
                    <div className="user_image">
                        <img src="./images/icon_user.png" alt="user_icon"></img>
                    </div>
                    <div className="user_info">
                        <div className="user_name">
                            {this.state.user.user_name}
                        </div>
                        <div className="user_role" style={{
                            backgroundColor: this.state.user.role.role_color
                        }}>
                            {this.state.user.role.role_name}
                        </div>
                        <div>
                            status = {this.state.user.status.status_name}
                        </div>
                    </div>
                </div>
                <div className="card flex_spread">
                    <div className="messages_grid flex_spread">
                        <div className="box top_left top">
                            Select user to start messaging
                        </div>
                        <div className="box top_right top">
                            Messages
                        </div>
                        <div className="box user_list">
                            <ListContainer
                                list={this.state.others}
                                callback={this.userSelected.bind(this)}
                                idMap={(item) => item.user_id} // TODO
                                nameMap={(item) => item.user_name}
                                cssItemClass={"user"}
                                cssActiveClass={"active"}
                                selectedId={this.state.selectedUser}
                            />
                        </div>
                        <div className="box messaging">
                        </div>
                        <div className="box bottom_left">
                            <div>Add new user</div>
                        </div>
                        <div className="box bottom_right">

                        </div>
                    </div>
                </div>
            </div>);
        } else {
            return ("");
        }
    }
}

export const AccountRouted = withRouter(Account);