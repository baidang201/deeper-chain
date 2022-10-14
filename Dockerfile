FROM docker.io/paritytech/ci-linux:production as builder

WORKDIR /deeper-chain
COPY . /deeper-chain
RUN cargo build --locked --release

# This is the 2nd stage: a very small image where we copy the Substrate binary."
FROM docker.io/library/ubuntu:20.04
LABEL description="Multistage Docker image for Substrate: a platform for web3" \
        io.parity.image.type="builder" \
        io.parity.image.authors="chevdor@gmail.com, devops-team@parity.io" \
        io.parity.image.vendor="Parity Technologies" \
        io.parity.image.description="Substrate is a next-generation framework for blockchain innovation 🚀" \
        io.parity.image.source="https://github.com/paritytech/polkadot/blob/${VCS_REF}/docker/substrate_builder.Dockerfile" \
        io.parity.image.documentation="https://github.com/paritytech/polkadot/"

COPY --from=builder /deeper-chain/target/release/deeper-chain /usr/local/bin
#COPY --from=builder /deeper-chain/target/release/subkey /usr/local/bin
#COPY --from=builder /deeper-chain/target/release/node-template /usr/local/bin
#COPY --from=builder /deeper-chain/target/release/chain-spec-builder /usr/local/bin

RUN useradd -m -u 1000 -U -s /bin/sh -d /deeper-chain deeper-chain && \
        mkdir -p /data /deeper-chain/.local/share/deeper-chain && \
        chown -R deeper-chain:deeper-chain /data && \
        ln -s /data /deeper-chain/.local/share/deeper-chain && \
# unclutter and minimize the attack surface
        rm -rf /usr/bin /usr/sbin && \
# Sanity checks
        #ldd /usr/local/bin/deeper-chain && \
        /usr/local/bin/deeper-chain --version

USER deeper-chain
EXPOSE 30333 9933 9944 9615
VOLUME ["/data"]