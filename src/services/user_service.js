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
}

export const userService = new UserService();