import React from "react";
import {withRouter} from "../common/with_router";
import {Account} from "./account";

import {socket} from "./account";

export class Personal extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            records: null,
        }
    }

    componentDidMount() {
        console.log("Personal MOUNT");
        socket.on('records', this.onRecords);
        socket.emit('records');
    }
    componentWillUnmount() {
        socket.off('records', this.onRecords)
    }

    onRecords = (records) => {
        this.setState({
            records: records
        })
        console.log("onRecords")
        console.log(records);
    }

    render() {
        const list = this.state.records;
        console.log("personal render")
        console.log(list);
        if (!list || list.length === 0) {return (
            <React.Fragment>
                <div>No records yet* :(</div>
                <div style={{fontStyle: "italic"}}>*try to obtain one in the game!</div>
            </React.Fragment>
        )}

        return (
            <div className="card messaging">
                {list.map((item) => (
                    <div
                        className="box record"
                        key={item.record_id}
                    >
                        <div style={{fontSize: 'larger', fontWeight: "bold"}}>
                            {`SCORE: ${item.record_score}`}
                        </div>
                        <div>
                            {`time played: ${(item.record_time_elapsed / 1000).toFixed(1)} s`}
                        </div>
                        <div>
                            {`figures placed: ${(item.record_figures_placed)} pieces`}
                        </div>
                        <div className={"time"}>
                            {`obtained: ${item.record_created}`}
                        </div>
                    </div>
                ))
                }
            </div>
        );
    }
}

export const PersonalRouted = withRouter(Personal);