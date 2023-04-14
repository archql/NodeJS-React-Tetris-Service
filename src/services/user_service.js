import {authService} from "./auth_service";

class UserService {
    getMessages(fromId) {
        return fetch(`/graphql`, {
            method: 'POST',
            headers:{ ...authService.authHeader(),
                'Accept': 'application/json',
                'Content-Type': 'application/json' },
            body: JSON.stringify({query: `query {
                getMessages(from: ${fromId}) {
                    message_id
                    message_from_id
                    message_to_id
                    user_from {
                      user_name
                      user_id
                    }
                    user_to {
                      user_name
                      user_id
                    }
                    message_content
                    message_created
                    message_updated
                    attachments {
                      attachment_id
                      attachment_filename
                    }
                }
            }
            `})
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
        // return fetch(`/graphql`, {
        //     method: 'POST',
        //     headers:{ ...authService.authHeader(),
        //         'Accept': 'application/json',
        //         'Content-Type': 'application/json' },
        //     body: JSON.stringify({query: `query {
        //         getMessages(from: ${fromId}) {
        //             message_id
        //         }
        //     }
        //     `})
        // }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
        // return fetch(`/api/messages/${fromId}`, {
        //     method: 'GET',
        //     headers:{ ...authService.authHeader(),
        //         'Content-Type': 'application/json' }
        // }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }
    getInit() {
        return fetch('/graphql', {
            method: 'POST',
            headers:{ ...authService.authHeader(),
                'Accept': 'application/json',
                'Content-Type': 'application/json' },
            body: JSON.stringify({query: `query {
                getSelf {
                    user_id
                    user_name
                    role {
                      role_name
                      role_color
                    }
                    status {
                      status_name
                    }
                }
                getOthers {
                    user_name
                    user_id
                    status {
                      status_name
                    }
                }
            }
            `})
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    sendMessage(toId, message, files = []) {
        // const formData  = new FormData();
        // formData.append("content", message);
        // for (let i = 0; i < files.length; i++) {
        //     const file = files[i];
        //     formData.append("attachment", file, file.name);
        // }
        // for (let [key, value] of formData.entries()){
        //     console.log(key,value);
        // }
        return fetch('/graphql', {
            method: 'POST',
            headers:{ ...authService.authHeader(),
                'Accept': 'application/json',
                'Content-Type': 'application/json' },
            body: JSON.stringify({query: `mutation {
                sendMessage(toId: ${toId}, content: "${message}") {
                    message_id
                    message_from_id
                    message_to_id
                    user_from {
                      user_name
                      user_id
                    }
                    user_to {
                      user_name
                      user_id
                    }
                    message_content
                    message_created
                    message_updated
                    attachments {
                      attachment_id
                      attachment_filename
                    }
              }
            }
            `})
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    deleteMessage(msgId) {
        return fetch('/graphql', {
            method: 'POST',
            headers:{ ...authService.authHeader(),
                'Accept': 'application/json',
                'Content-Type': 'application/json' },
            body: JSON.stringify({query: `mutation {
                deleteMessage(msgId: ${msgId})
            }
            `})
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    editMessage(message) {
        return fetch('/graphql', {
            method: 'POST',
            headers:{ ...authService.authHeader(),
                'Accept': 'application/json',
                'Content-Type': 'application/json' },
            body: JSON.stringify({query: `mutation {
                editMessage(message_id: ${message.message_id}, message_content: "${message.message_content}") {
                    message_id
                    message_from_id
                    message_to_id
                    message_content
                    message_created
                    message_updated
              }
            }
            `})
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }
}

export const userService = new UserService();