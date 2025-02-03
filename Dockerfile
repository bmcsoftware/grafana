ARG BASE_IMAGE=pun-harboreg-01.bmc.com/core-remedy-nightly/dsom/alpine_baseimage:latest
ARG JS_IMAGE=aus-harborpd-01.bmc.com/helix-cloudops/adereporting-base-node:20-alpine3.19
ARG JS_PLATFORM=linux/amd64
# When updating this, please do the same in grafana-reporting\administration\telemetry\Dockerfile (Line no 1)
ARG GO_IMAGE=aus-harborpd-01.bmc.com/helix-cloudops/adereporting-base-golang:1.22.7-alpine3.19

ARG GO_SRC=go-builder
ARG JS_SRC=js-builder

FROM --platform=${JS_PLATFORM} ${JS_IMAGE} as js-builder

ENV NODE_OPTIONS=--max_old_space_size=8000

WORKDIR /tmp/grafana

COPY package.json project.json nx.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages packages
COPY plugins-bundled plugins-bundled
COPY .npmrc ./
COPY .yarnrc ./
COPY public public
COPY LICENSE ./

RUN apk add --no-cache make build-base python3

RUN apk add --no-cache make build-base python3
RUN apk --no-cache add git
RUN yarn install --immutable

COPY tsconfig.json .eslintrc .editorconfig .browserslistrc .prettierrc.js ./
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
# BMC code starts
ARG ADEREPORTING_GITHUB_USER=adereprt
ARG ADEREPORTING_GITHUB_TOKEN
# BMC code ends

RUN if grep -i -q alpine /etc/issue; then \
      apk add --no-cache \
          # This is required to allow building on arm64 due to https://github.com/golang/go/issues/22040
          binutils-gold \
          # Install build dependencies
          gcc g++ make git; \
    fi

WORKDIR /tmp/grafana

COPY go.* ./
COPY .bingo .bingo

RUN go env -w GOPRIVATE=github.bmc.com
RUN git config --system url."https://${ADEREPORTING_GITHUB_USER}:${ADEREPORTING_GITHUB_TOKEN}@github.bmc.com".insteadOf "https://github.bmc.com"
# Include vendored dependencies
COPY pkg/util/xorm/go.* pkg/util/xorm/
COPY pkg/apiserver/go.* pkg/apiserver/
COPY pkg/apimachinery/go.* pkg/apimachinery/
COPY pkg/build/go.* pkg/build/
COPY pkg/build/wire/go.* pkg/build/wire/
COPY pkg/promlib/go.* pkg/promlib/
COPY pkg/storage/unified/resource/go.* pkg/storage/unified/resource/
COPY pkg/semconv/go.* pkg/semconv/

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
#RUN apk add --no-cache python3=3.11.9-r0
RUN apk add --no-cache ca-certificates bash tzdata musl-utils
RUN apk update && apk add --no-cache curl supervisor --repository=http://dl-cdn.alpinelinux.org/alpine/edge/main
RUN apk info -vv | sort

COPY conf ./conf
COPY supervisord.conf /opt/bmc/
# Install dependencies
RUN if grep -i -q alpine /etc/issue; then \
      apk add --no-cache ca-certificates bash curl tzdata musl-utils && \
      apk info -vv | sort; \
    elif grep -i -q ubuntu /etc/issue; then \
      DEBIAN_FRONTEND=noninteractive && \
      apt-get update && \
      apt-get install -y ca-certificates curl tzdata musl && \
      apt-get autoremove -y && \
      rm -rf /var/lib/apt/lists/*; \
    else \
      echo 'ERROR: Unsupported base image' && /bin/false; \
    fi

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
COPY --from=js-src /tmp/grafana/LICENSE ./

EXPOSE 3000

COPY --chown=bmcuser:bmc ./packaging/docker/run.sh /run.sh
COPY --chown=bmcuser:bmc ./packaging/docker/content-run.sh /content-run.sh

USER bmcuser
CMD ["/usr/bin/supervisord", "-c", "/opt/bmc/supervisord.conf"]
