import React, {Component} from "react";
import {withRouter} from "../common/with_router";
import {socket} from "./account";
import {SortableTable} from "./table";

class Leaderboard extends Component {

    constructor(props) {
        super(props);

        this.state = {
            leaderboard: null
        }
    }

    componentDidMount() {
        socket.on('leaderboard', this.onLeaderboard);

        // get members
        socket.emit('leaderboard');
    }

    componentWillUnmount() {
        socket.off('leaderboard', this.onLeaderboard);
    }

    onLeaderboard = (leaderboard) => {
        leaderboard.forEach((item, index) => {
            item.id = index + 1
        });
        this.setState({leaderboard: leaderboard})
    }

    render() {
        const headers = [
            {
                name: '#',
                attribute: 'id',
                nonSortable: true
            },
            {
                name: 'player',
                attribute: 'user_nickname',
            },
            {
                name: 'region',
                attribute: 'user_region',
            },
            {
                name: 'score',
                attribute: 'user_max_score',
            },
        ]
        return (
            <div className="card flex_scroll">
                {this.state.leaderboard ? (
                    <SortableTable
                        data={this.state.leaderboard}
                        headers={headers}
                    />
                ) : (
                    <div className="box record" style={{padding:"25px", color:"red"}}>
                        No leaderboard available at the moment :(
                    </div>
                )}
            </div>
        )
    }
}

export const LeaderboardRouted = withRouter(Leaderboard);