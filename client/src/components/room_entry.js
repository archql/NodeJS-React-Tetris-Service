import React from "react";
export class RoomEntry extends React.Component {
    render() {
        const room = this.props.item;
        console.log("render room");
        console.log(room);
        return (
            <div className="box record">
                <div style={{fontSize: 'larger', fontWeight: "bold"}}>
                    {room.room_name}
                </div>
                {/*<div>*/}
                {/*    {`owner: ${(item.record_time_elapsed / 1000).toFixed(1)} s`}*/}
                {/*</div>*/}
                <div>
                    {`members: ${(room.room_users.length)} / ${room.room_max_members || "inf"}`}
                </div>
                <div>
                    {`owner: ${(room.room_owner.user_nickname)}`}
                </div>
                <div className={"time"}>
                    {room.room_description}
                </div>
                {room.room_joined && (<p>joined</p>)}
                {room.room_joined ? (
                    <button
                        className="btn"
                        onClick={() => this.props.leaveRoom(room.room_id)}
                    >
                        Leave
                    </button>
                ) : (
                    <button
                        className="btn"
                        onClick={() => this.props.joinRoom(room.room_id)}
                    >
                        Join
                    </button>
                )}
            </div>
        )
    }
}