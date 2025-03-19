FROM node AS build-stage

ARG application_endpoint

ENV APPLICATION_ENDPOINT=${application_endpoint}

WORKDIR /app
COPY ./ .
RUN npm install --frozen-lockfile
RUN npm run build

FROM nginx:alpine AS production-stage

RUN apk add busybox-extras
RUN rm /etc/nginx/conf.d/default.conf
ADD ./ops/templates/default.conf.template /etc/nginx/templates/default.conf.template

WORKDIR /app
COPY --from=build-stage /app/dist /app