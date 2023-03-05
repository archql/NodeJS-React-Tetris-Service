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
        return fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: username,
                password: password
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
        return fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: username,
                password: password
            })
        }).then(r =>  r.json().then(data => ({status: r.status, body: data})));
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('user'));
    }
}

export const authService = new AuthService();
