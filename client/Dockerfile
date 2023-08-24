# syntax=docker/dockerfile:1
FROM node:18.16.0-alpine AS base

ARG REACT_APP_PROXY_IP=localhost
ENV REACT_APP_PROXY_IP=$REACT_APP_PROXY_IP

WORKDIR /usr/src/client

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run client:build


FROM nginx:stable-alpine as production
ENV NODE_ENV=production \
    NODE_PATH=./build
ARG REACT_APP_PROXY_IP=localhost
ENV REACT_APP_PROXY_IP=$REACT_APP_PROXY_IP
ARG SERVER_NAME='""'
ENV SERVER_NAME=$SERVER_NAME

WORKDIR /usr/share/nginx/html

COPY ./nginx/nginx.conf.template /etc/nginx/nginx.conf.template

## Remove default nginx index page
COPY --from=base /usr/src/client/build .

# above is only preparation
# this is the main command on the container
CMD ["sh", "-c", "envsubst '$$REACT_APP_PROXY_IP $$SERVER_NAME' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]