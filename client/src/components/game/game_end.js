import React, {Component, Fragment} from "react";
import {SortableTable} from "../table";

export class GameEnd extends Component {
    constructor(props) {
        super(props);
    }

    // TODO duplicated from room_lobby.js
    calcTeamDistribution() {
        // determine teams distribution
        let teams = []
        this.props.room?.room_users?.forEach((ru => {
            const v = (ru.ru_team ?? -1) + 1
            if (!teams[v]) teams[v] = []
            teams[v].push(ru)
        }))
        teams.forEach(((team, team_no) => {
            team.sort((a, b) => b.ru_last_score - a.ru_last_score)
            team.forEach((t, index) => {
                t.place = index + 1
                t.rank = (3 - index) * (this.props.gameEnd.winnerTeamNo === (team_no - 1) ? 1 : -1)
            });
        }))
        return teams
    }

    leaveRoom() {
        window.location.reload();
    }

    render() {
        const colors = [
            'red', 'blue', 'green', 'yellow',
        ]
        console.log(this.props.room)
        if (!this.props.room) return (<div>Something went wrong</div>)

        const teams = this.calcTeamDistribution();
        const color = colors[this.props.ru?.ru_team ?? -1]
        const headers = [
            {
                name: '#',
                attribute: 'place',
                nonSortable: true
            },
            {
                name: 'username',
                fetcher: (e) => {
                    return e.ru_user.user_nickname
                },
                nonSortable: true
            },
            {
                name: 'score',
                fetcher: (e) => {
                    return e.ru_last_score ?? 0
                },
                nonSortable: true
            },
            {
                name: 'rank',
                attribute: 'rank',
                nonSortable: true
            },
        ]
        return (
            <div className="container flex_spread">
                <div className="box card flex_spread">
                    <div className="reg_header">Game Over</div>
                    <div style={{fontSize: "larger"}}><b className={`team ${color}`}>{this.props.user.user_nickname},</b></div>
                    <div
                        style={{fontSize: "larger"}}>You <b>{(this.props.ru?.ru_team ?? -1) === this.props.gameEnd.winnerTeamNo ? "Won" : "Lost"}</b>
                    </div>
                    {/*{JSON.stringify(this.props.ru)}*/}
                    {/*{JSON.stringify(this.props.gameEnd)}*/}
                    <div style={{fontSize: "larger"}}>Your team is <b className={`team ${color}`}>{color}</b></div>
                    <div style={{fontSize: "larger", fontWeight: "bold", marginTop: 20}}>Teams:</div>
                    {
                        teams.map((team, team_no) => {
                            const color = colors[team_no - 1]
                            const score = this.props.gameEnd.scoreDistribution[team_no - 1]
                            return (
                                <Fragment>
                                    <table style={{borderBottom: "none"}}>
                                        <thead>
                                        <tr>
                                            <th style={{borderBottom: "none"}}>
                                                <div style={{fontSize: "larger"}}>Team <b
                                                    className={`team ${color}`}>{color}</b> score <b>{score}</b></div>
                                            </th>
                                        </tr>
                                        </thead>
                                    </table>
                                    <SortableTable
                                        key={team_no}
                                        data={team}
                                        headers={headers}
                                    />
                                </Fragment>
                            )
                        })
                    }
                    <button className="btn reg_btn" type="submit" onClick={() => this.leaveRoom()}>Leave room</button>
                </div>
            </div>
        );
    }
}