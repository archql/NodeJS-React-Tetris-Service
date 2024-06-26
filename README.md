# NodeJS + React "Tetris" Service

This is my university project dedicated to design of a tetris game as a next step to my [TetrisWin](https://github.com/archql/TetrisWin) project, developed entirely in FASM assembly language. This is also my bachelor's thesis project.

It provides a web-service with simple messenger and extended original Tetris gameplay functionality.

It uses [Socket.IO](https://socket.io/docs/v4/) protocol to perform real time communication between server and client.
It implemented entirely using React and Node.js+Express. It uses React Three Fiber wrapper for Three.js for graphics display.

It implements [client-server reconciliation algorithm](https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html).

Documentation can be found in [a.pdf](https://github.com/archql/NodeJS-React-Tetris-Service/blob/master/a.pdf) file (*Entirely in russian!*)

More functions are descibed in [functions](#functions) section. 

This project is non-commercial.

## Running the project

1. Get project's latest stable version using `git clone https://github.com/archql/NodeJS-React-Tetris-Service.git`
2. Install npm at least `10.8.0`.
3. Note that: default database population is performed in [db.js](https://github.com/archql/NodeJS-React-Tetris-Service/blob/master/server/bin/db.js) file

### Docker deploy

1. Get Docker
2. Run `docker compose build`
3. Run `docker compose up`
4. Now service is available at port :80 - open [localhost](http://localhost:80) in any web browser
5. Use!

### Development

1. Use any IDE you prefer
2. To use client:
   - in `/client` run `npm i` once
   - run `npm run client:start` for dev
   - it will autodetect changes & restart 
4. To use server:
   - in `/server` run `npm i` once
   - run `npm run server:start:debug` for dev
   - it will autodetect changes & restart using nodemon
   - use `npm run server:start:idea` if this behavior is undesired

## Functions

- **TODO translate**
