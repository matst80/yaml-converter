FROM node:18-alpine
WORKDIR /app
COPY packag*.json ./
RUN npm ci
COPY index.* ./
EXPOSE 8080
RUN node index.js