import {withRouter} from "../common/with_router";
import {Chat} from "./chat";
import React from "react";
import {SortableTable} from "./table.js"
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
        socket.on('room joined', this.onRoomJoined);
        socket.on('room leave', this.onRoomLeave);

        // get members
        socket.emit('rooms');
    }

    componentWillUnmount() {
        socket.off('rooms', this.onRooms);
        socket.off('room join', this.onRoomJoin);
        socket.off('room joined', this.onRoomJoined);
        socket.off('room leave', this.onRoomLeave);
    }

    onRooms = (rooms) => {
        console.log("onRooms")
        console.log(rooms)
        rooms.map((r) => {
                if (r.room_users.find((ru) =>
                    ru.ru_user_id === this.props.user.user_id
                )) {
                    r.room_joined = true;
                }
                return r;
            }
        )
        this.setState({rooms: rooms})
    }

    onRoomJoin = (roomUser) => {
        console.log("on room join")
        console.log(roomUser)

        console.log(this.state.rooms)
        const rooms = this.state.rooms.map((item) => {
            if (item.room_id === roomUser.ru_room_id) {
                item.room_users = [...item.room_users, roomUser];
                // I joined or room was already joined
                item.room_joined = item.room_joined || (roomUser.ru_user_id === this.props.user.user_id);
            }
            return item;
        });
        this.setState({rooms: rooms})
    }

    onRoomJoined = (roomId) => {
        console.log("on room joined")
        //this.props.router.navigate("/game", { state: { roomId: roomId }});
    }

    onRoomLeave = (roomUser) => {
        console.log("on room leave")
        console.log(roomUser)
        console.log(this.state.rooms)
        const rooms = this.state.rooms.map((item) => {
            if (item.room_id === roomUser.ru_room_id) {
                item.room_users = item.room_users.filter(function( obj ) {
                    return obj.ru_user_id !== roomUser.ru_user_id;
                });
                item.room_joined = item.room_joined && (roomUser.ru_user_id !== this.props.user.user_id);
            }
            return item;
        });
        console.log(rooms)
        console.log(rooms === this.state.rooms)
        this.setState({rooms: rooms})
    }

    roomJoin = (roomId) => {
        socket.emit('room join', roomId)
    }

    roomLeave = (roomId) => {
        socket.emit('room leave', roomId)
    }
    //
    // render() {
    //     return (
    //         <div className="card flex_scroll">
    //             {this.state.rooms ?
    //                 (this.state.rooms.map((item) => (
    //                 <RoomEntry
    //                     key={item.room_id}
    //                     item={item}
    //                     joinRoom={this.roomJoin}
    //                     leaveRoom={this.roomLeave}
    //                 />
    //                 )))
    //                 :
    //                 (<div className="box record" style={{padding:"25px", color:"red"}}>
    //                         No rooms available at the moment :(
    //                 </div>
    //                 )
    //             }
    //         </div>
    //     );
    // }


    render() {
        // if object - looks into: fetcher -> [attribute]
        // sorter  looks into: sorter ->  fetcher -> [attribute]
        const headers = [
            {
                name: '#',
                attribute: 'room_id',
                nonSortable: true
            },
            {
                name: 'name',
                attribute: 'room_name'
            },
            {
                name: 'owner',
                fetcher: (e) => {
                    return e.room_owner.user_nickname
                },
            },
            {
                name: 'members',
                attribute: 'room_room_users',
                fetcher: (e) => {
                    if (e.room_max_members) {
                        return `${e.room_users.length} / ${e.room_max_members}`
                    } else {
                        return `${e.room_users.length}`
                    }
                },
                sorter: (e) => {
                    return e.room_max_members ? e.room_max_members - e.room_users.length : 10000 + e.room_users.length
                }
            },
            {
                name: 'private?',
                fetcher: (e) => {
                    return e.room_password_hash ? "yes" : "no"
                },
            },
        ];
        return (
            <div className="card flex_scroll">
                {this.state.rooms ? (
                    <SortableTable
                        data={this.state.rooms}
                        headers={headers}
                        onClick={(e) => {console.log(e)}}
                    />
                ) : (
                    <div className="box record" style={{padding:"25px", color:"red"}}>
                            No rooms available at the moment :(
                    </div>
                )}
            </div>
        )
    }
}

export const RoomsRouted = withRouter(Rooms);