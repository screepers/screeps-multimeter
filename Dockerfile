FROM node:10
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "/app/bin/multimeter"]
