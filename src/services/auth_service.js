import { SHA256 } from 'crypto-js';
import Cookies from 'js-cookie';

class AuthService {

    // TODO bad
    authHeader() {
        const token = Cookies.get('jwt');
        if (token) {
            return { 'Authorization': 'Bearer ' + token };
        } else {
            return {};
        }
    }
    login(nickname, password) {
        const password_hash = SHA256(password).toString();
        return fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nickname: nickname,
                password_hash: password_hash
            })
        })
        .then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    logout() {
        return fetch('/auth/logout', {
            method: 'GET',
            headers: { ...authService.authHeader() }
        }).then(r => ({status: r.status, body: {}}));
    }

    register(username, surname, nickname, password) {
        const password_hash = SHA256(password).toString();
        return fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: username,
                surname: surname,
                nickname: nickname,
                password_hash: password_hash
            })
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }
}

export const authService = new AuthService();
