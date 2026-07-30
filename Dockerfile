FROM node:24-alpine as build
WORKDIR /app

ARG CACHEBUST=1
ENV CACHEBUST=${CACHEBUST}

COPY package*.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM nginx:stable-alpine
RUN apk --no-cache add tzdata
ENV TZ=Asia/Oral
RUN cp /usr/share/zoneinfo/Asia/Oral /etc/localtime

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
