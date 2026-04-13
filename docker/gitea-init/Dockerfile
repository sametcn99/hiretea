FROM docker.gitea.com/gitea:1.25.5-rootless

USER root
RUN apk add --no-cache curl jq
COPY docker/gitea-init/gitea-init.sh /usr/local/bin/hiretea-gitea-init
RUN chmod 755 /usr/local/bin/hiretea-gitea-init

USER git
ENTRYPOINT ["/usr/local/bin/hiretea-gitea-init"]