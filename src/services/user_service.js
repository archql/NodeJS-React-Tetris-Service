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
}

export const userService = new UserService();