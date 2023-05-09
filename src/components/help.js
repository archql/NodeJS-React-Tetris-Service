import React from "react";
import {withRouter} from "../common/with_router";
import {Account} from "./account";

const handleClick = (e) => {
    e.preventDefault();
    window.location.replace('https://github.com/archql/TetrisWin');
};

const HELP_ARRAY = [
    <div style={{fontSize: "larger", fontWeight: "bold"}}>~~~TETRIS HELP TABLE~~~</div>,
    'Ingame action Key to trigger it',
    'move left\t<\n',
    'move right\t>\n',
    'rotate clockwise\t^\n',
    'rotate anticlockwise\tv\n',
    'end game/quit\tESC\n',
    'hard drop\tSPACE\n',
    'soft drop\tSHIFT\n',
    'pause/play\tP\n',
    'restart\tR\n',
    'hold\tH',
    <a className="link" href="#1" onClick={handleClick}>github.com/archql/TetrisWin</a>,
    '      archql (c) 2022      ',
];


export class Help extends React.Component {

    render() {
        return (
            <React.Fragment>
            {HELP_ARRAY.map((item, index) => (
                    <div key={index}>
                        {item}
                    </div>
                ))
            }
            </React.Fragment>
        );
    }
}

export const HelpRouted = withRouter(Help);