FROM aus-harbor-reg1.bmc.com/helix-cloudops/adereporting-base-node:16-alpine3.15 as js-builder

ENV NODE_OPTIONS=--max_old_space_size=8000

WORKDIR $GOPATH/src/github.com/grafana/grafana

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn
COPY packages packages
COPY plugins-bundled plugins-bundled
COPY .npmrc ./
COPY .yarnrc ./

RUN apk --no-cache add git
RUN yarn install

COPY tsconfig.json .eslintrc .editorconfig .browserslistrc .prettierrc.js babel.config.json .linguirc ./
COPY public public
COPY tools tools
COPY scripts scripts
COPY emails emails

ENV NODE_ENV production
RUN yarn build

FROM aus-harbor-reg1.bmc.com/helix-cloudops/adereporting-base-golang:1.19.3-alpine3.15 as go-builder

RUN apk add --no-cache gcc g++ git make

WORKDIR $GOPATH/src/github.com/grafana/grafana

COPY go.mod go.sum embed.go Makefile build.go package.json ./
COPY packages/grafana-schema packages/grafana-schema
COPY public/app/plugins public/app/plugins
COPY public/api-spec.json public/api-spec.json
COPY pkg pkg
COPY scripts scripts
COPY cue.mod cue.mod
COPY .bingo .bingo
COPY kinds kinds

RUN go env -w GOPRIVATE=github.bmc.com
RUN git config --system  url."https://adereprt:cbd8b50c8ab754d52bb30b6d2b2f7b65eb5055c2@github.bmc.com".insteadOf "https://github.bmc.com"
RUN go mod verify
RUN go install github.com/google/wire/cmd/wire@v0.5.0
RUN wire gen -tags oss ./pkg/server ./pkg/cmd/grafana-cli/runner
RUN go run build.go build
#RUN make build-go

# Final stage
FROM pun-harboreg-01.bmc.com/core-remedy-nightly/dsom/alpine_baseimage:latest

USER root
LABEL maintainer="Grafana team <hello@grafana.com>"

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
COPY  supervisord.conf /opt/bmc/

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

COPY --from=go-builder /go/src/github.com/grafana/grafana/bin/*/grafana-server /go/src/github.com/grafana/grafana/bin/*/grafana-cli ./bin/
COPY --from=js-builder $GOPATH/src/github.com/grafana/grafana/public ./public
COPY --from=js-builder $GOPATH/src/github.com/grafana/grafana/tools ./tools

EXPOSE 3000

COPY --chown=bmcuser:bmc ./packaging/docker/run.sh /run.sh
COPY --chown=bmcuser:bmc ./packaging/docker/content-run.sh /content-run.sh
USER bmcuser
CMD ["/usr/bin/supervisord", "-c", "/opt/bmc/supervisord.conf"]
