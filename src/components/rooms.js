import {withRouter} from "../common/with_router";
import {Chat} from "./chat";
import React from "react";
import {RoomEntry} from "./room_entry";
import {socket} from "./account";


class Rooms extends React.Component {

    constructor(props) {
        super(props);

        this.state = {}
    }

    componentDidMount() {
        console.log("ROOMS MOUNTED")

        socket.on('rooms', this.onRooms);
        socket.on('room join', this.onRoomJoin);
        socket.on('room leave', this.onRoomLeave);

        // get members
        socket.emit('rooms');
    }

    componentWillUnmount() {
        socket.off('rooms', this.onRooms);
        socket.off('room join', this.onRoomJoin);
        socket.off('room leave', this.onRoomLeave);
    }

    onRooms = (rooms) => {
        console.log("onRooms")
        console.log(rooms)
        this.setState({rooms: rooms})
    }

    onRoomJoin = (roomId) => {
        console.log("on room join")
        // TODO it is wrong!!
        // const rooms = this.state.rooms.map((item) => {
        //     if (item.room_id === roomId) {
        //         // TODO Add info about user joined
        //         item.room_users.push({user_nickname: this.props.user.user_nickname})
        //     }
        //     return item;
        // });
        // this.setState({rooms: rooms})
        //
        this.props.router.navigate("/game", { state: { roomId: roomId }});
    }

    onRoomLeave = (roomId) => {
        const rooms = this.state.rooms.map((item) => {
            if (item.room_id === roomId) {
                // TODO Remove info about user joined
            }
            return item;
        });
        this.setState({rooms: rooms})
    }

    roomJoin = (roomId) => {
        socket.emit('room join', roomId)
    }

    render() {
        return (
            <div className="card flex_scroll">
                {this.state.rooms ?
                    (this.state.rooms.map((item) => (
                    <RoomEntry
                        key={item.room_id}
                        item={item}
                        joinRoom={this.roomJoin}
                    />
                    )))
                    :
                    (<div className="box record" style={{padding:"25px", color:"red"}}>
                            No rooms available at the moment :(
                    </div>
                    )
                }
            </div>
        );
    }
}

export const RoomsRouted = withRouter(Rooms);