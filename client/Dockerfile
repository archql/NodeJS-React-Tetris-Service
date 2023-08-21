# syntax=docker/dockerfile:1
FROM node:18-alpine
ENV NODE_ENV=production

WORKDIR /

COPY package.json .
COPY package-lock.json .
RUN npm install

# Copying all the files in our project
COPY . .

# Starting our application
CMD npm build
RUN serve -s build -l 5555

