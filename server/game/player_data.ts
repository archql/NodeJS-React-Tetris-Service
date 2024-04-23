import {createRoom, Record, Room, RoomUser, sequelize, User} from "../bin/db";
import {Op} from "sequelize";
import crypto from "crypto";

export class PlayerData {
    user: any = null;
    room: any = null;
    ru: any = null;
    record: any = null; // TODO

    teams: any[] = [];


    constructor(user: any = null, room: any = null, ru: any = null) {
        this.user = user;
        this.room = room;
        this.ru = ru;
    }

    getRoomId() {
        if (this.room) {
            return this.room.room_id.toString();
        } else {
            return ""
        }
    }

    getStatus() {
        if (this.user) {
            // this.game.name = this.user.user_nickname || "@DEFAULT";
            if (!this.user.error) {
                return "registered";
                // if (this.record) {
                //     this.game.highScore = this.record.record_score;
                // }
            } else {
                return "rejected";
            }
        } else {
            return "connected";
        }
    }

    async isRoomFull() {
        console.log(`async isRoomFull() ${this.user?.user_id}`)
        if (!this.room || !this.ru) return
        console.log(`async isRoomFull() OK`)
        // query data again
        await this.room.reload();
        await this.ru.reload();
        // determine teams distribution
        this.determineTeamsDistribution()
        //
        return this.room.room_users.length >= this.room.room_teams * this.room.room_max_members && !(this.teams[0]);
    }

    determineTeamsDistribution() {
        console.log(`async determineTeamsDistribution() ${this.user?.user_id}`)
        if (!this.room) return
        console.log(`async determineTeamsDistribution() OK`)
        const teams = []
        this.room.room_users.forEach(ru => {
            const v = (ru.ru_team ?? -1) + 1
            teams[v] = teams[v] ? teams[v] + 1 : 1
        })
        this.teams = teams
        return this.teams
    }

    async leaveRoom() {
        console.log(`async leaveRoom() ${this.user?.user_id}`)
        if (!this.room || !this.ru) return
        console.log(`async leaveRoom() OK`)
        let res: any = null;
        try {
            res = await this.ru.destroy();
        } catch (e) {
            return `FAILED LEAVE ROOM ${this.user.user_nickname} ${this.getRoomId()} ${e}`
        }
        if (!res) {
            return `FAILED LEAVE ROOM ${this.user.user_nickname} ${this.getRoomId()}`
        }
        // nullify room data
        this.room = null
        this.ru = null
    }

    async makeGameRecord(record_data: {record_score: number, record_time_elapsed: number, record_figures_placed: number}) {
        if (this.ru) {
            await this.ru.reload()
            this.ru.ru_last_score = record_data.record_score;
            if (this.ru.ru_max_score < record_data.record_score) {
                this.ru.ru_max_score = record_data.record_score;
            }
            await this.ru.save();
        }
        if (this.user) {
            // create new record (TODO mk screenshot)
            const record: any = await Record.create({
                record_user_id: this.user.user_id,
                ...record_data
            });
            // set record
            if (!this.record || record.record_score > this.record.record_score) {
                this.record = record;
            }
        }
    }

    async joinTeam(team_no: number) {
        console.log(`async joinTeam() ${this.user?.user_id}`)
        if (!this.ru) return 'Null room user';
        console.log(`async joinTeam() OK`)
        // already in that team
        if (this.ru.ru_team === team_no) return `Already in that team ${team_no}`;
        //
        try {
            console.log(this.ru)
            await this.ru.update({
                ru_team: team_no
            })
            // await RoomUser.update({
            //     ru_team: team_no
            // }, {
            //     where: {
            //         ru_user_id: this.ru.ru_user_id,
            //         ru_room_id: this.ru.ru_room_id,
            //     },
            //     individualHooks: true
            // })
            // await this.ru.reload();
        } catch(e) {
            return `Impossible to change team ${e}`
        }
    }

    async joinRandomRoom() {
        console.log(`async joinRandomRoom()  ${this.user?.user_id}`)
        if (this.room) return 'Already in the room'
        console.log("async joinRandomRoom() OK")

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
        // leave previous room
        if (this.ru) {
            await this.ru.destroy();
            this.ru = null;
        }
        // join
        let ru = null
        try {
            ru = await RoomUser.create({
                ru_user_id: this.user.user_id,
                ru_room_id: r.room_id,
            });
        } catch (e) {
            return `Failed to join: ${e}`
        }
        if (!ru) return 'Failed to join'
        // request additional info
        ru = await RoomUser.findOne(
            {
                where: {
                    ru_user_id: ru.ru_user_id,
                    ru_room_id: ru.ru_room_id,
                },
                include: [{
                    model: User,
                    as: "ru_user",
                    attributes: ['user_id', 'user_nickname', 'user_rank'],
                }]
            }
        )
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
        //
        this.room = r;
        this.ru = ru;
    }

    // Constructs new data
    async queryData(user_id: number): Promise<PlayerData> {
        console.log(`async queryData() ${this.user?.user_id}`)
        if (user_id) {
            this.user = await User.findByPk(user_id, {

            })
            this.record = await Record.findOne({
                where: {
                    record_user_id: this.user.user_id
                },
                order: sequelize.literal('record_score DESC'),
            });
        } else {
            // TODO create fake user
            this.user = await User.findOne({
                where: {
                    user_role_id: 50
                },
            })
        }
        this.ru = this.user && await RoomUser.findOne({
            where: {
                ru_user_id: this.user.user_id
            },
            include: [{
                model: User,
                as: "ru_user",
                attributes: ['user_id', 'user_nickname', 'user_rank'],
            }]
        });
        this.room = this.ru && await Room.findByPk(this.ru.ru_room_id, {
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
        //
        if (this.room ? !(this.user && this.room && this.ru) : !this.user) {
            console.log("SEVERE ERROR DETECTED IN USER DATA FETCH: REFUSED")
        }
        //
        return this;
    }



    async reload() {
        console.log(`async reload() ${this.user?.user_id}`)
        // TODO if null - re query
        if (this.room) {
            await this.room.reload();
        } else {

        }
        if (this.ru) {
            await this.ru.reload()
        }
    }
    async save() {
        await this.user.save();
        await this.room.save();
        await this.ru.save();
    }
}
