import {withRouter} from "../common/with_router";
import {Chat} from "./chat";
import React from "react";
import {SortableTable} from "./table.js"
import {RoomEntry} from "./room_entry";
import {socket} from "./account";
import {NavLink} from "react-router-dom";


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
                if (r.room_owner.user_id === this.props.user.user_id) {
                    r.room_owned = true;
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

    roomDelete = (roomId) => {
        console.log("room delete")
        socket.emit('room delete', roomId)
    }

    roomAction = (room) => {
        console.log("room action")
        if (room.room_joined) {
            socket.emit('room leave', room.room_id)
        } else {
            socket.emit('room join', room.room_id)
        }
    }

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
                name: 'teams',
                attribute: 'room_teams',
                fetcher: (e) => {
                    return `${e.room_teams} of ${e.room_max_members}`
                },
                sorter: (e) => {
                    return e.room_teams
                }
            },
            {
                name: 'members',
                attribute: 'room_room_users',
                fetcher: (e) => {
                    // determine teams distribution
                    let teams = []
                    e.room_users.forEach((ru => {
                        const v = (ru.ru_team ?? -1) + 1
                        teams[v] = teams[v] ? teams[v] + 1 : 1
                    }))
                    //
                    let res = `${teams[0] ?? 0}`
                    for (let i = 0; i < e.room_teams; ++i) {
                        res += ` / ${teams[i + 1] ?? 0}`
                    }
                    return res
                },
                sorter: (e) => {
                    return (e.room_max_members && e.room_teams) ? e.room_teams * e.room_max_members - e.room_users.length : 10000 + e.room_users.length
                }
            },
            {
                name: 'private?',
                fetcher: (e) => {
                    return e.room_password_hash ? "yes" : "no"
                },
            },
            {
                name: '',
                nonSortable: true,
                fetcher: (e) => {
                    return e.room_joined ? "leave" : "join"
                },
                type: 'button',
                onClick: (e) => {this.roomAction(e)} // TODO
            },
            {
                name: '',
                nonSortable: true,
                type: (e) => e.room_owned ? "button" : "none",
                fetcher: (e) => e.room_owned ? "maintain" : "",
                onClick: (e) => {this.roomDelete(e.room_id)} // TODO
            }
        ];
        return (
            <div className="card flex_scroll">
                <NavLink to={"/account/room_create"}
                         className="link"
                         style={{
                             marginBottom: 10
                         }}
                >
                    Create new room
                </NavLink>
                {this.state.rooms ? (
                    <SortableTable
                        data={this.state.rooms}
                        headers={headers}
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