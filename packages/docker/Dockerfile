# CI stages the musl binaries under binaries/<arch>/ before building.
FROM alpine:3

# The Bun-compiled binary needs libstdc++/libgcc, absent from Alpine by default.
RUN apk --no-cache add libstdc++

ARG TARGETARCH

COPY --chmod=0755 binaries/${TARGETARCH}/crowdin /usr/local/bin/crowdin

WORKDIR /usr/crowdin-project

CMD ["sh"]
