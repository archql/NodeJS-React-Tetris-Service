import React from "react";
import {withRouter} from "../common/with_router";
import {Account} from "./account";

import {socket} from "./account";

export class Personal extends React.Component {
    render() {
        return (
            <div>
                Here goes personal info
            </div>
        );
    }
}

export const PersonalRouted = withRouter(Personal);