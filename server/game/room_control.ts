// @ts-ignore
import {createRoom, Room, RoomUser, sequelize, User} from "../bin/db";
import {Op} from "sequelize";
import crypto from "crypto";
import {RANDOM_MAX} from "./tetris";

import {io} from "../app"

export class RoomSessionControl {
    static user_id_replacement: number = 0

    socket: any = null;
    io: any = null;

    // these are sequelize models
    user: any = null;
    room: any = null;
    ru: any = null;

    //
    team_distribution: number[] = []

    // describes if it has room
    room_sock: string = null;
    // describes if it has user
    user_nickname: string = null;
    user_id: number = null;
    //
    callback: (room_sock: string) => void = null

    constructor(socket: any, io: any, user: any = null, room: any = null, ru: any = null) { // happens on connection
        this.io = io;
        this.socket = socket;
        this.sync(user, room, ru)
    }

    sync(user: any, room: any, ru: any) {
        this.user = user
        this.room = room
        this.ru = ru
        // set data
        this.room_sock = room?.room_id ? room.room_id.toString() : null
        this.user_nickname = user?.user_nickname || "@DEFAULT"
        this.user_id = user ? user.user_id :
            ((this.user_id < 0) ? this.user_id : --RoomSessionControl.user_id_replacement)

        if (this.room_sock) {
            // room exists but ru no - create
            if (!ru) {
                this.ru = {
                    ru_user_id: this.user_id,
                    ru_team: null,
                    ru_room_id: this.room.room_id,
                    ru_user: {
                        user_nickname: this.user_nickname,
                        user_rank: 0,
                    }
                }
            }
            // TODO duplicated notifications
            // notify everybody
            this.socket.join(this.room_sock);
            this.io.to(this.room_sock).emit('room join', this.ru)
            // notify everybody
            const msg = {
                text: `${this.user_nickname} joined the room`,
                nickname: "@SYSROOT"
            };
            this.io.to(this.room_sock).emit('room message', msg);
        }
        // notify user
        console.log("EMIT SYNC")
        this.socket.emit('sync', user, room, ru);
    }

    async join_random_room() {
        if (this.room) return 'Already in the room'
        // find public room
        let r: any = await Room.findOne({
            where: {
                room_password_hash: null,
                room_places: {
                    [Op.not]: 0
                }
            },
            order: sequelize.col('room_places'),
        })
        // if no - create
        if (!r) {
            console.log("create new room maintained by server")
            // create new room maintained by server
            const rng = crypto.randomBytes(6).toString('hex')
            r = await createRoom(`Duel-${rng}`, '@SYSROOT', 'room which can be joined by any player', 1, 2, null);
        }
        if (!r) return "failed to create"
        // join
        const ru = await RoomUser.create({
            ru_user_id: this.user.user_id,
            ru_room_id: r.room_id,
        });
        if (!ru) return 'Failed to join'
        //
        io.of('/chat').emit('room join',  ru)
        // fetch remaining data
        r = await Room.findByPk(r.room_id, {
            include: [{
                model: RoomUser,
                as: "room_users",
                include: [{
                    model: User,
                    as: "ru_user",
                    attributes: ['user_id', 'user_nickname', 'user_rank'],
                }]
            }, { model: User, as: "room_owner", attributes: ['user_id', 'user_nickname'] }],
        });
        // sync
        this.sync(this.user, r, ru)
    }

    async leave() {
        console.log(`ROOM LEAVE ${this.user?.user_nickname} ${this.room_sock}`)
        // if not in the room - ignore
        if (!this.room_sock) return 'Null room'
        // TODO terminate competition
        // immediately set room to null (async)
        let temp = this.room_sock
        this.room_sock = null
        // notify everybody
        this.socket.to(temp).emit('room leave', this.user_id);
        io.of('/chat').emit('room leave', {
            ru_user_id: this.user.user_id,
            ru_room_id: this.room.room_id
        });
        // message everybody
        const msg = {
            text:  `${this.user_nickname} left the room`,
            nickname: "@SYSROOT"
        };
        this.io.to(temp).emit('room message', msg);
        // leave socket
        this.socket.leave(temp);
        // delete entries from db
        const res = await RoomUser.destroy({
            where: {
                ru_user_id: this.user_id,
                ru_room_id: this.room.room_id
            },
            individualHooks: true
        });
        if (!res) {
            console.log(`FAILED LEAVE ROOM ${this.user_nickname} ${temp}`)
        }
        // nullify room data
        this.room = null
        this.ru = null
        //
        console.log(`ROOM LEAVE 2 ${this.user_nickname} ${temp}`)
        //
        await this.update()
    }

    // emits room team change
    //
    async join_team(team_no: number) {
        if (!this.ru) return 'Null room user';
        // already in that team
        if (this.ru.ru_team === team_no) return 'Already in that team';
        //
        let tmp = this.ru.ru_team;
        //
        try {
            console.log(this.ru)
            await RoomUser.update({
                ru_team: team_no
            }, {
                where: {
                    ru_user_id: this.ru.ru_user_id,
                    ru_room_id: this.ru.ru_room_id,
                }
            })
            await this.ru.reload();
        } catch(e) {
            return `Impossible to change team ${e}`
        }
        //
        const team_change = {
            team_prev: tmp,
            team_new: this.ru.ru_team,
            user_id: this.user_id,
            room_id: this.room.room_id
        }
        this.io.to(this.room_sock).emit('room team change', team_change);
        io.of('/chat').emit('room team change', team_change);
        // TODO Check if all users have a team right now
        await this.update()
    }

    message(text: string) {
        const msg = {
            text:  text,
            nickname: this.user.user_nickname,
            team: this.ru.ru_team,
            user_id: this.user.user_id
        };
        this.io.to(this.room_sock).emit('room message', msg);
    }

    async update() {
        //
        if (!this.room) return
        // query data again
        await this.room.reload();
        // determine teams distribution
        this.team_distribution = []
        const teams = this.team_distribution
        this.room.room_users.forEach(ru => {
            const v = (ru.ru_team ?? -1) + 1
            teams[v] = teams[v] ? teams[v] + 1 : 1
        })
        // determine if we can start
        if ( this.room.room_places === 0 && teams[0] === 0) {
            this.io.to(this.room_sock).emit('room ready', {

            });
            //
            const msg = {
                text:  `competition started!`,
                nickname: "@SYSROOT"
            };
            this.io.to(this.room_sock).emit('room message', msg);
            //
            this.callback(this.room_sock)
        }
    }

    // // local user needed just because we use these functions from one player's instance
    // onCompetitionViolation (user: any, room: string)  {
    //     console.log(`onCompetitionViolation ${user.user_nickname}`)
    //     const index = roomReadyToStartInfos[room].members.indexOf(user.user_id);
    //     if (index !== -1) {
    //         roomReadyToStartInfos[room].members.splice(index, 1);
    //     }
    //     this.io.to(room).emit('room ready', {
    //         user_id: user.user_id,
    //         state: 'violation'
    //     });
    //     // notify
    //     const msg = {
    //         text:  `${user.user_nickname} violated rule`,
    //         nickname: "@SERVER "
    //     };
    //     this.io.to(room).emit('room message', msg);
    // }
    onCompetitionEnd (user: any, room: string, score: number)  {
        // console.log(`onCompetitionEnd ${user.user_nickname}`)
        // const index = roomReadyToStartInfos[room].members.indexOf(user.user_id);
        // if (index !== -1) {
        //     roomReadyToStartInfos[room].members.splice(index, 1);
        // }
        // io.to(room).emit('room ready', {
        //     user_id: user.user_id,
        //     state: 'end',
        //     score: score
        // });
        // TODO notify
        const msg = {
            text:  `${user.user_nickname} scored ${score}!`,
            nickname: "@SYSROOT"
        };
        this.io.to(room).emit('room message', msg);
    }

    async onDisconnect() {
        await this.leave()
    }
}