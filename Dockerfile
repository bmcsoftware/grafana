# syntax=docker/dockerfile:1

ARG BASE_IMAGE=pun-harboreg-01.bmc.com/core-remedy-nightly/dsom/alpine_baseimage:latest
ARG JS_IMAGE=aus-harbor-reg1.bmc.com/helix-cloudops/adereporting-base-node:18-alpine3.17
ARG JS_PLATFORM=linux/amd64
ARG GO_IMAGE=aus-harbor-reg1.bmc.com/helix-cloudops/adereporting-base-golang:1.20.4-alpine3.17

ARG GO_SRC=go-builder
ARG JS_SRC=js-builder

FROM --platform=${JS_PLATFORM} ${JS_IMAGE} as js-builder

ENV NODE_OPTIONS=--max_old_space_size=8000

WORKDIR /tmp/grafana

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages packages
COPY plugins-bundled plugins-bundled
COPY .npmrc ./
COPY .yarnrc ./

RUN apk --no-cache add git
RUN yarn install --immutable

COPY tsconfig.json .eslintrc .editorconfig .browserslistrc .prettierrc.js babel.config.json .linguirc ./
COPY public public
COPY scripts scripts
COPY emails emails

ENV NODE_ENV production
RUN yarn build

FROM ${GO_IMAGE} as go-builder

ARG COMMIT_SHA=""
ARG BUILD_BRANCH=""
ARG GO_BUILD_TAGS="oss"
ARG WIRE_TAGS="oss"
ARG BINGO="true"

# Install build dependencies
RUN if grep -i -q alpine /etc/issue; then \
      apk add --no-cache gcc g++ make git; \
    fi

WORKDIR /tmp/grafana

COPY go.* ./
COPY .bingo .bingo

RUN go env -w GOPRIVATE=github.bmc.com
RUN git config --system  url."https://adereprt:cbd8b50c8ab754d52bb30b6d2b2f7b65eb5055c2@github.bmc.com".insteadOf "https://github.bmc.com"

RUN go mod download
RUN if [[ "$BINGO" = "true" ]]; then \
      go install github.com/bwplotka/bingo@latest && \
      bingo get -v; \
    fi

COPY embed.go Makefile build.go package.json ./
COPY cue.mod cue.mod
COPY kinds kinds
# COPY local local
COPY packages/grafana-schema packages/grafana-schema
COPY public/app/plugins public/app/plugins
COPY public/api-merged.json public/api-merged.json
COPY pkg pkg
COPY scripts scripts
COPY conf conf
# COPY .github .github

ENV COMMIT_SHA=${COMMIT_SHA}
ENV BUILD_BRANCH=${BUILD_BRANCH}

RUN make build-go GO_BUILD_TAGS=${GO_BUILD_TAGS} WIRE_TAGS=${WIRE_TAGS}

FROM ${BASE_IMAGE} as tgz-builder

WORKDIR /tmp/grafana

ARG GRAFANA_TGZ="grafana-latest.linux-x64-musl.tar.gz"

COPY ${GRAFANA_TGZ} /tmp/grafana.tar.gz

# add -v to make tar print every file it extracts
RUN tar x -z -f /tmp/grafana.tar.gz --strip-components=1

# helpers for COPY --from
FROM ${GO_SRC} as go-src
FROM ${JS_SRC} as js-src

# Final stage
FROM ${BASE_IMAGE}

USER root

LABEL maintainer="Grafana Labs <hello@grafana.com>"

ARG GF_UID="1000"
ARG GF_GID="1000"

ENV PATH="/usr/share/grafana/bin:$PATH" \
    GF_PATHS_CONFIG="/etc/grafana/grafana.ini" \
    GF_PATHS_DATA="/var/lib/grafana" \
    GF_PATHS_HOME="/usr/share/grafana" \
    GF_PATHS_LOGS="/var/log/grafana" \
    GF_PATHS_PLUGINS="/var/lib/grafana/plugins" \
    GF_PATHS_PROVISIONING="/etc/grafana/provisioning"

WORKDIR $GF_PATHS_HOME

RUN apk add --no-cache ca-certificates bash tzdata musl-utils
RUN apk add --no-cache curl supervisor --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
RUN apk info -vv | sort

COPY conf ./conf
COPY supervisord.conf /opt/bmc/

RUN mkdir -p "$GF_PATHS_HOME/.aws" && \
  mkdir -p "$GF_PATHS_PROVISIONING/datasources" \
  "$GF_PATHS_PROVISIONING/dashboards" \
  "$GF_PATHS_PROVISIONING/notifiers" \
  "$GF_PATHS_PROVISIONING/plugins" \
  "$GF_PATHS_PROVISIONING/access-control" \
  "$GF_PATHS_PROVISIONING/alerting" \
  "$GF_PATHS_LOGS" \
  "$GF_PATHS_PLUGINS" \
  "$GF_PATHS_DATA" && \
  cp "$GF_PATHS_HOME/conf/custom.ini" "$GF_PATHS_CONFIG" && \
  cp "$GF_PATHS_HOME/conf/ldap.toml" /etc/grafana/ldap.toml && \
  chown -R  bmcuser:bmc "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING" && \
  chmod -R 777 "$GF_PATHS_DATA" "$GF_PATHS_HOME/.aws" "$GF_PATHS_LOGS" "$GF_PATHS_PLUGINS" "$GF_PATHS_PROVISIONING" && \
  chown -R bmcuser:bmc "$GF_PATHS_CONFIG"

COPY --from=go-src /tmp/grafana/bin/grafana* /tmp/grafana/bin/*/grafana* ./bin/
COPY --from=js-src /tmp/grafana/public ./public

EXPOSE 3000

COPY --chown=bmcuser:bmc ./packaging/docker/run.sh /run.sh
COPY --chown=bmcuser:bmc ./packaging/docker/content-run.sh /content-run.sh

USER bmcuser
CMD ["/usr/bin/supervisord", "-c", "/opt/bmc/supervisord.conf"]