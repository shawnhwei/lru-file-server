FROM node:12-alpine

RUN apk add util-linux

COPY ./ /srv/
WORKDIR /srv

RUN npm ci && npm run build

EXPOSE 8080
EXPOSE 8443

ENV DEBUG=lruserve

ENTRYPOINT ["npm", "start"]
