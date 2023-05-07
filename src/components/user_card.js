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
                <div className="user_image">
                    <img src="./images/icon_user.png" alt="user_icon"></img>
                </div>
                <div style={{marginRight: "100px"}}>
                    <div className="user_info">
                        <div className="user_role" style={{
                            backgroundColor: user.role.role_color
                        }}>
                            {user.role.role_name}
                        </div>
                        <div className="user_name">
                            {user.user_name}
                        </div>
                        <div>
                            status = {user.status.status_name}
                        </div>
                    </div>
                    <div className="user_bio">

                    </div>
                </div>
                <div className={"logout"} onClick={e => this.props.logout(e)}>
                    <FontAwesomeIcon icon={faIcons.faSignOutAlt}/>
                </div>
            </div>
        );
    }
}