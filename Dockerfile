FROM node:10
WORKDIR /usr/src/s7app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "app.js" ]