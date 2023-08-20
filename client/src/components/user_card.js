import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import * as faIcons from "@fortawesome/fontawesome-free-solid";

export class UserCard extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const user = this.props.user;
        return (
            <div className="box card user_card">
                <div style={{position: "relative"
                }}>
                    <div className={user.status.status_name === "offline" ? "user_image offline" : "user_image online"}>
                        <img src="/images/icon_user.png" alt="user_icon"></img>
                    </div>
                    <div className="user_score">
                        {user.user_max_score}
                    </div>
                </div>
                <div className="user_info_pane">
                    <div className="user_info tetris-font">
                        <div className="user_name">
                            {user.user_nickname}
                        </div>
                        <div className="user_role" style={{
                            backgroundColor: user.role.role_color
                        }}>
                            {user.role.role_name}
                        </div>
                        <div>
                            {user.status.status_name}
                        </div>
                    </div>
                    <div className="user_info">
                        <div>
                            {user.user_name}
                        </div>
                        <div>
                            {user.user_surname}
                        </div>
                    </div>
                    <div className="user_info">
                        {"\"user bio\""}
                    </div>
                </div>
                <div className={"logout"} onClick={e => this.props.logout(e)}>
                    <FontAwesomeIcon icon={faIcons.faSignOutAlt}/>
                </div>
            </div>
        );
    }
}