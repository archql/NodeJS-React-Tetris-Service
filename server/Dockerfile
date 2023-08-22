# syntax=docker/dockerfile:1
FROM node:18.16.0-alpine AS base

WORKDIR /usr/src/server

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run server:build


FROM node:18.16.0-alpine as production
ENV NODE_ENV=production \
    NODE_PATH=./build

WORKDIR /usr/src/server
COPY package*.json .
RUN npm install
COPY --from=base usr/src/server/build ./build

# above is only preparation
# this is the main command on the container
CMD ["sh", "-c", "npm run server:start:production"]