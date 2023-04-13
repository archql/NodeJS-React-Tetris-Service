import { SHA256 } from 'crypto-js';

class AuthService {

    authHeader() {
        const user = JSON.parse(localStorage.getItem('user'));

        if (user && user.accessToken) {
            return { 'Authorization': 'Bearer ' + user.accessToken };
        } else {
            return {};
        }
    }
    login(username, password) {
        const password_hash = SHA256(password).toString();
        return fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: username,
                password_hash: password_hash
            })
        })
        .then(r =>  r.json().then(data => ({status: r.status, body: data})))
        .then(response => {
            console.log(response);
            if (response.status === 200 && response.body.accessToken) {
                localStorage.setItem("user", JSON.stringify(response.body));
            }

            return response;
        });
    }

    logout() {
        localStorage.removeItem("user");
    }

    register(username, password) {
        const password_hash = SHA256(password).toString();
        return fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: username,
                password_hash: password_hash
            })
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user'));
    }
}

export const authService = new AuthService();
