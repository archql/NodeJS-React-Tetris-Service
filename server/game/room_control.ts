// @ts-ignore
import {createRoom, Room, RoomUser, sequelize, User} from "../bin/db";
import {Op} from "sequelize";
import crypto from "crypto";
import {RANDOM_MAX} from "./tetris";

import {io} from "../app"
import {PlayerData} from "./player_data";

export class RoomSessionControl {
    static user_id_replacement: number = 0

    socket: any = null;
    io: any = null;

    // these are sequelize models
    data: PlayerData = null;

    //
    team_distribution: number[] = []
    //
    callback: (room_sock: string) => void = null

    constructor(socket: any, io: any, data: PlayerData = null) { // happens on connection
        this.io = io;
        this.socket = socket;
        this.sync(data)
    }

    sync(data: PlayerData) {
        this.data = data
        if (!this.data) return
        //
        if (this.data.getRoomId()) {
            // TODO duplicated notifications
            // notify everybody
            this.socket.join(this.data.getRoomId());
            // notify everybody
            const msg = {
                text: `${this.data.user.user_nickname} joined the room`,
                nickname: "@SYSROOT"
            };
            this.io.to(this.data.getRoomId()).emit('room message', msg);
        }
        // notify user
        console.log("EMIT SYNC");
        this.socket.emit('sync', this.data.user, this.data.room, this.data.ru);
    }

    async join_random_room() {
        if (!this.data) return
        //
        const res = await this.data.joinRandomRoom();
        if (res) return res;
        //
        io.of('/chat').emit('room join',  this.data.ru)
        this.io.to(this.data.getRoomId()).emit('room join', this.data.ru)
        // sync
        this.sync(this.data)
    }

    async leave() {
        if (!this.data) return
        console.log(`ROOM LEAVE ${this.data.user?.user_nickname} ${this.data.getRoomId()}`)
        // if not in the room - ignore
        if (!this.data.getRoomId()) return 'Null room'
        // TODO terminate competition
        // notify everybody
        this.socket.to(this.data.getRoomId()).emit('room leave', this.data.user.user_id);
        io.of('/chat').emit('room leave', {
            ru_user_id: this.data.user.user_id,
            ru_room_id: this.data.room.room_id
        });
        // message everybody
        const msg = {
            text:  `${this.data.user.user_nickname} left the room`,
            nickname: "@SYSROOT"
        };
        this.io.to(this.data.getRoomId()).emit('room message', msg);
        // leave socket
        await this.socket.leave(this.data.getRoomId());
        // delete entries from db
        const res = await this.data.leaveRoom();
        if (res) console.log(`ROOM LEAVE ERROR ${res}`)
        //
        console.log(`ROOM LEAVE 2 ${this.data.user?.user_nickname}`)
        //
        await this.update()
    }

    // emits room team change
    //
    async join_team(team_no: number) {
        if (!this.data) return
        let tmp = this.data.ru.ru_team;
        const res = await this.data.joinTeam(team_no)
        if (res) return res
        //
        const team_change = {
            team_prev: tmp,
            team_new: this.data.ru.ru_team,
            user_id: this.data.user.user_id,
            room_id: this.data.room.room_id
        }
        this.io.to(this.data.getRoomId()).emit('room team change', team_change);
        io.of('/chat').emit('room team change', team_change);
        // TODO Check if all users have a team right now
        await this.update()
    }

    message(text: string) {
        const msg = {
            text:  text,
            nickname: this.data.user.user_nickname,
            team: this.data.ru.ru_team,
            user_id: this.data.user.user_id
        };
        this.io.to(this.data.getRoomId()).emit('room message', msg);
    }

    async update() {
        //
        if (!this.data) return
        // determine if we can start
        if (await this.data.isRoomFull()) {
            this.io.to(this.data.getRoomId()).emit('room ready', {

            });
            //
            const msg = {
                text:  `competition started!`,
                nickname: "@SYSROOT"
            };
            this.io.to(this.data.getRoomId()).emit('room message', msg);
            //
            this.callback(this.data.getRoomId())
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