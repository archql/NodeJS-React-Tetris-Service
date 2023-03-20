import {authService} from "./auth_service";

class UserService {
    getMessages(fromId) {
        return fetch(`/api/messages/${fromId}`, {
            method: 'GET',
            headers:{ ...authService.authHeader(),
                'Content-Type': 'application/json' }
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }
    getSelf() {
        return fetch('/api/self', {
            method: 'GET',
            headers:{ ...authService.authHeader(),
                'Content-Type': 'application/json' }
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    getOthers() {
        return fetch('/api/others', {
            method: 'GET',
            headers:{ ...authService.authHeader(),
                'Content-Type': 'application/json' }
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    sendMessage(toId, message, files = []) {
        const formData  = new FormData();
        formData.append("content", message);
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            formData.append("attachment", file, file.name);
        }
        for (let [key, value] of formData.entries()){
            console.log(key,value);
        }
        return fetch(`api/messages/${toId}`, {
            method: 'POST',
            headers: authService.authHeader(),
            body: formData
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    deleteMessage(msgId) {
        return fetch(`api/messages/${msgId}`, {
            method: 'DELETE',
            headers: authService.authHeader()
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    editMessage(message) {
        return fetch(`api/messages`, {
            method: 'PUT',
            headers:{ ...authService.authHeader(),
                'Content-Type': 'application/json' },
            body: JSON.stringify({message_id: message.message_id, message_content: message.message_content})
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }
}

export const userService = new UserService();