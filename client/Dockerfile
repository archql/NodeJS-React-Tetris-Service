# syntax=docker/dockerfile:1
FROM node:18.16.0-alpine AS base
ENV REACT_APP_SERVER_PORT=80 \
    REACT_APP_SERVER_IP=localhost

WORKDIR /usr/src/client

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run client:build


FROM nginx:stable-alpine as production
ENV NODE_ENV=production \
    NODE_PATH=./build
ENV REACT_APP_PROXY_IP=tetris-server

WORKDIR /usr/share/nginx/html

COPY ./nginx/nginx.conf.template /etc/nginx/nginx.conf.template

## Remove default nginx index page
COPY --from=base /usr/src/client/build .

# above is only preparation
# this is the main command on the container
CMD ["sh", "-c", "envsubst '$$REACT_APP_PROXY_IP' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]