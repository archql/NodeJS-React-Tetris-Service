import React from "react";
import {withRouter} from "../common/with_router";
import {Account} from "./account";


export class Help extends React.Component {
    render() {
        return (
            <div>
                Some help text here
            </div>
        );
    }
}

export const HelpRouted = withRouter(Help);