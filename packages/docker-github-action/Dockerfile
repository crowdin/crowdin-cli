FROM alpine

RUN apk --no-cache add sudo openjdk17-jre --repository=http://dl-cdn.alpinelinux.org/alpine/edge/community;

ADD https://github.com/crowdin/crowdin-cli/releases/latest/download/crowdin-cli.zip /usr/

RUN unzip -j /usr/crowdin-cli.zip; \
	sh install-crowdin-cli.sh; \
	rm /usr/crowdin-cli.zip; \
	rm *.*;

RUN echo -e '#!/bin/sh\njava -jar /usr/local/bin/crowdin-cli.jar "$@"' > /usr/local/bin/crowdin; \
	chmod +x /usr/local/bin/crowdin;

WORKDIR /usr/crowdin-project

RUN apk --no-cache add curl git git-lfs jq gnupg;


CMD ["sh"]

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
